"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { ExamIcon } from "@/components/ui/ExamIcon";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !loading && !user.must_change_password) {
      if (user.role === "ADMIN") router.push("/admin/dashboard");
      else if (user.role === "TEACHER") router.push("/teacher/dashboard");
      else if (user.role === "STUDENT") router.push("/student/dashboard");
    }
  }, [user, loading, router]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    // Only apply keyboard adjustment on mobile screens (under 640px)
    if (typeof window !== "undefined" && window.innerWidth < 640) {
      setIsInputFocused(true);
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
  };

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
          setError("Unable to connect to server. Please try again.");
        } else {
          setError(msg);
        }
      } else {
        setError("Invalid username or password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-surface-base px-4 py-6 sm:py-12 text-text-primary overflow-y-auto">
      {/* Subtle ambient illumination */}
      <div className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-steel/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full bg-tan/8 blur-3xl" />

      <div
        className={`relative z-10 w-full max-w-sm sm:transform-none sm:transition-none ${
          isInputFocused ? "-translate-y-12 transition-transform duration-300 ease-out" : ""
        }`}
      >
        {/* Brand Header */}
        <div
          className={`text-center sm:transform-none sm:transition-none sm:mb-6 ${
            isInputFocused ? "mb-3 scale-95 transition-all duration-300" : "mb-6"
          }`}
        >
          <div className="mx-auto flex h-13 w-13 items-center justify-center rounded-2xl bg-steel shadow-lg shadow-steel/20 mb-3 transition-transform hover:scale-105">
            <ExamIcon className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Long<span className="text-steel">Quiz</span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            OMR Exam & Bubble Sheet Grading Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-card rounded-3xl p-6 sm:p-8 shadow-xl border border-border-default backdrop-blur-xl">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-text-primary">Sign In</h2>
            <p className="text-xs text-text-muted mt-0.5">
              Enter your credentials or Student ID to continue
            </p>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                Username or Student ID
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Username or ID"
                  className="w-full rounded-2xl border border-border-default bg-surface-base/80 px-4 py-3 pl-11 text-sm text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/15 transition-all"
                />
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-text-muted" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-text-secondary">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordOpen(true)}
                  className="text-[11px] font-medium text-steel hover:text-steel-light transition-colors focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder="Password"
                  className={`w-full rounded-2xl border border-border-default bg-surface-base/80 px-4 py-3 pl-11 pr-11 text-sm text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/15 transition-all ${
                    password && !showPassword ? "font-mono tracking-widest text-base" : ""
                  }`}
                />
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-text-muted" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-3.5 text-text-muted hover:text-text-primary transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-steel py-3.5 text-sm font-semibold text-white shadow-md shadow-steel/25 hover:bg-steel-light transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      {/* Forced Password Reset Guard */}
      <PasswordChangeModal
        isOpen={mustResetPassword || Boolean(user?.must_change_password)}
        forced={true}
        onClose={() => setMustResetPassword(false)}
      />
    </main>
  );
}
