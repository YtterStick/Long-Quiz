"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth as authApi } from "@/lib/api";

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
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const me = await authApi.getMe();
      setUser(me as User);
    } catch {
      setUser(null);
      setToken(null);
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
      }
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (storedToken) {
      setToken(storedToken);
      authApi
        .getMe()
        .then((me) => {
          if (!ignore) {
            setUser(me as User);
          }
        })
        .catch(() => {
          if (!ignore) {
            setUser(null);
            setToken(null);
            if (typeof window !== "undefined") {
              localStorage.removeItem("token");
            }
          }
        })
        .finally(() => {
          if (!ignore) {
            setLoading(false);
          }
        });
    } else {
      setLoading(false);
    }
    return () => {
      ignore = true;
    };
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    localStorage.setItem("token", result.access_token);
    setToken(result.access_token);

    const me = await authApi.getMe();
    setUser(me as User);
    setLoading(false);

    return {
      must_change_password: result.must_change_password,
      role: result.role,
    };
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
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
