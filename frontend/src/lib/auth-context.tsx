"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi, ApiError } from "@/lib/api";

const TOKEN_KEY = "token";
const USER_KEY = "evalo_user";

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  must_change_password: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<{ must_change_password: boolean; role: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me as User);
      if (typeof window !== "undefined") {
        localStorage.setItem(USER_KEY, JSON.stringify(me));
      }
    } catch (err) {
      // ONLY clear session if server explicitly returns 401 Unauthorized
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
      }
    }
  }, [clearSession]);

  useEffect(() => {
    let ignore = false;
    const storedToken = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

    if (!storedToken) {
      setLoading(false);
      return;
    }

    setToken(storedToken);

    // Hydrate user immediately from cached storage on client mount
    const storedUser = typeof window !== "undefined" ? localStorage.getItem(USER_KEY) : null;
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setLoading(false);
      } catch {
        // ignore malformed cached json
      }
    }

    // Stale-while-revalidate verification with backend
    authApi
      .getMe()
      .then((me) => {
        if (!ignore) {
          setUser(me as User);
          if (typeof window !== "undefined") {
            localStorage.setItem(USER_KEY, JSON.stringify(me));
          }
        }
      })
      .catch((err) => {
        if (!ignore) {
          // CRITICAL: Only log out if credentials are fundamentally invalid (401).
          // Do NOT log out on connection aborts from spam-refreshing or network drops!
          if (err instanceof ApiError && err.status === 401) {
            clearSession();
          } else {
            console.warn("Auth verification network hiccup; preserving existing session:", err);
          }
        }
      })
      .finally(() => {
        if (!ignore) {
          setLoading(false);
        }
      });

    return () => {
      ignore = true;
    };
  }, [clearSession]);

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    if (typeof window !== "undefined") {
      localStorage.setItem(TOKEN_KEY, result.access_token);
    }
    setToken(result.access_token);

    const me = await authApi.getMe();
    setUser(me as User);
    if (typeof window !== "undefined") {
      localStorage.setItem(USER_KEY, JSON.stringify(me));
    }
    setLoading(false);

    return {
      must_change_password: result.must_change_password,
      role: result.role,
    };
  };

  const logout = () => {
    clearSession();
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
