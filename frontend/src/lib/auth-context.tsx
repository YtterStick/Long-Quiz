"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const userRef = useRef<User | null>(null);
  userRef.current = user;

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
    } else {
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
    }

    // ── Cross-Tab Session Synchronization & Conflict Prevention ──
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY) {
        const latestToken = localStorage.getItem(TOKEN_KEY);
        const latestUserStr = localStorage.getItem(USER_KEY);

        if (!latestToken || !latestUserStr) {
          // Another tab logged out -> log out this tab immediately
          setUser(null);
          setToken(null);
          window.location.replace("/");
          return;
        }

        try {
          const latestUser: User = JSON.parse(latestUserStr);
          // If another tab logged in as a different account, sync session and redirect cleanly
          if (latestUser.id !== userRef.current?.id) {
            setToken(latestToken);
            setUser(latestUser);
            const target =
              latestUser.role === "ADMIN"
                ? "/admin/dashboard"
                : latestUser.role === "TEACHER"
                  ? "/teacher/dashboard"
                  : "/student/dashboard";
            window.location.replace(target);
          }
        } catch {
          // ignore parse errors
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);

    let authChannel: BroadcastChannel | null = null;
    try {
      authChannel = new BroadcastChannel("evalo_auth_sync");
      authChannel.onmessage = (event) => {
        const data = event.data;
        if (!data || !data.type) return;

        if (data.type === "LOGOUT") {
          setUser(null);
          setToken(null);
          window.location.replace("/");
        } else if (data.type === "LOGIN" && data.user) {
          if (data.user.id !== userRef.current?.id) {
            setToken(data.token);
            setUser(data.user);
            const target =
              data.user.role === "ADMIN"
                ? "/admin/dashboard"
                : data.user.role === "TEACHER"
                  ? "/teacher/dashboard"
                  : "/student/dashboard";
            window.location.replace(target);
          }
        }
      };
    } catch {
      // BroadcastChannel unsupported in rare browsers
    }

    return () => {
      ignore = true;
      window.removeEventListener("storage", handleStorageChange);
      if (authChannel) {
        try {
          authChannel.close();
        } catch {}
      }
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
      try {
        const channel = new BroadcastChannel("evalo_auth_sync");
        channel.postMessage({ type: "LOGIN", user: me, token: result.access_token });
        channel.close();
      } catch {
        // ignore
      }
    }
    setLoading(false);

    return {
      must_change_password: result.must_change_password,
      role: result.role,
    };
  };

  const logout = () => {
    try {
      authApi.logout();
    } catch {
      // ignore
    }
    if (typeof window !== "undefined") {
      try {
        const channel = new BroadcastChannel("evalo_auth_sync");
        channel.postMessage({ type: "LOGOUT" });
        channel.close();
      } catch {
        // ignore
      }
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.replace("/");
      return;
    }
    clearSession();
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
