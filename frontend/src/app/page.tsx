"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { User, Lock, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { ExamIcon } from "@/components/ui/ExamIcon";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mustResetPassword, setMustResetPassword] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !loading && !user.must_change_password) {
      if (user.role === "ADMIN") router.push("/admin/dashboard");
      else if (user.role === "TEACHER") router.push("/teacher/dashboard");
      else if (user.role === "STUDENT") router.push("/student/dashboard");
    }
  }, [user, loading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await login(username, password);
      if (res.must_change_password) {
        setMustResetPassword(true);
      } else {
        if (res.role === "ADMIN") router.push("/admin/dashboard");
        else if (res.role === "TEACHER") router.push("/teacher/dashboard");
        else if (res.role === "STUDENT") router.push("/student/dashboard");
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.toLowerCase().includes("failed to fetch")) {
          setError("Incorrect password");
        } else {
          setError(msg);
        }
      } else {
        setError("Incorrect password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center bg-surface-base px-4 py-12 text-text-primary overflow-hidden">
      {/* Top-right floating theme switcher */}
      <div className="absolute top-5 right-5 z-20">
        <ThemeToggle showLabel />
      </div>

      {/* Ambient background glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-steel/8 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 h-96 w-96 rounded-full bg-tan/6 blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-steel shadow-xl shadow-steel/20 mb-3 transition-transform hover:scale-105">
            <ExamIcon className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Long<span className="text-steel">Quiz</span>
          </h1>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
          <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-steel" />
            Sign In to Portal
          </h2>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-burgundy-ghost border border-burgundy-border p-3.5 text-xs text-burgundy-light">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">
                Username or Student ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username or ID"
                  className="w-full rounded-2xl border border-border-default bg-surface-base/80 px-4 py-3 pl-11 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-all"
                />
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-text-faint" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border border-border-default bg-surface-base/80 px-4 py-3 pl-11 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel transition-all"
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-text-faint" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-steel py-3.5 text-sm font-semibold text-white shadow-lg shadow-steel/20 hover:bg-steel-light transition-all active:scale-[0.99] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Log In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forced Password Reset Guard */}
      <PasswordChangeModal
        isOpen={mustResetPassword || Boolean(user?.must_change_password)}
        forced={true}
        onClose={() => setMustResetPassword(false)}
      />
    </main>
  );
}
