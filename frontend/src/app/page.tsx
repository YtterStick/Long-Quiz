"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import {
  User,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { ForgotPasswordModal } from "@/components/ForgotPasswordModal";
import { ExamIcon } from "@/components/ui/ExamIcon";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  StudentDeskIllustration,
  ExamSheetIllustration,
  DoodleBackgroundElements,
} from "@/components/ui/Illustrations";

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Check for reset=success in URL query
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("reset") === "success") {
        setSuccessMsg("Password set successfully! Please sign in with your new password.");
        const u = params.get("u");
        if (u) setUsername(decodeURIComponent(u));
        window.history.replaceState({}, "", "/");
      }
    }
  }, []);

  // Auto-redirect if already logged in
  useEffect(() => {
    if (user && !loading && !user.must_change_password) {
      if (user.role === "ADMIN") router.push("/admin/dashboard");
      else if (user.role === "TEACHER") router.push("/teacher/dashboard");
      else if (user.role === "STUDENT") router.push("/student/dashboard");
    }
  }, [user, loading, router]);

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
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
    setSuccessMsg(null);
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

  if (loading || (user && !user.must_change_password)) {
    return (
      <main className="relative flex min-h-dvh w-full items-center justify-center bg-surface-base text-text-primary">
        <DoodleBackgroundElements />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <ExamIcon className="h-10 w-10 animate-pulse" />
          <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
            <Loader2 className="h-4 w-4 animate-spin text-steel" />
            <span>Redirecting to your workspace...</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-dvh w-full flex-col justify-between bg-surface-base px-4 py-4 sm:px-8 sm:py-6 text-text-primary overflow-x-hidden selection:bg-steel/20">
      <DoodleBackgroundElements />

      {/* Top Header Bar */}
      <header className="relative z-20 flex items-center justify-between w-full max-w-7xl mx-auto py-2">
        <div className="flex items-center gap-3 group cursor-default">
          <ExamIcon className="h-8 w-8 transition-transform group-hover:scale-110 duration-200" />
          <span className="text-2xl font-black tracking-tight text-text-primary">
            Evalo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Hero & Auth Section */}
      <div className="relative z-10 my-auto flex w-full max-w-7xl mx-auto items-center justify-center lg:justify-between py-6 lg:py-10">
        {/* Left Decorative Column (Desktop) */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-md pr-8 animate-in fade-in slide-in-from-left-6 duration-700">
          <ExamSheetIllustration className="w-80 h-80 drop-shadow-xl" />
        </div>

        {/* Center: Main Elevated Login Card */}
        <div
          className={`relative w-full max-w-md mx-auto sm:transform-none sm:transition-none ${
            isInputFocused ? "-translate-y-8 transition-transform duration-300 ease-out" : ""
          }`}
        >
          <div className="glass-card rounded-4xl p-6 sm:p-10 shadow-2xl border border-border-emphasis/70 backdrop-blur-2xl bg-surface-raised/95">
            {/* Card Title */}
            <div className="text-center mb-7">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
                Sign In to Evalo
              </h2>
              <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                Enter your username or Student ID to continue
              </p>
            </div>

            {/* Success Notification */}
            {successMsg && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-sage-ghost border border-sage-border p-3.5 text-xs text-sage animate-in fade-in duration-200">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Error Notification */}
            {error && (
              <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-burgundy-ghost border border-burgundy-border p-3.5 text-xs text-burgundy-light animate-in fade-in duration-200">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
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
                    placeholder="Username or Student ID"
                    className="w-full rounded-2xl border border-border-default bg-surface-base px-4 py-3.5 pl-11 text-sm text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none focus:ring-4 focus:ring-steel/10 transition-all font-medium"
                  />
                  <User className="absolute left-3.5 top-4 h-4 w-4 text-text-muted" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-text-secondary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="text-[11px] font-semibold text-steel hover:text-steel-light transition-colors focus:outline-none cursor-pointer"
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
                    className={`w-full rounded-2xl border border-border-default bg-surface-base px-4 py-3.5 pl-11 pr-11 text-sm text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none focus:ring-4 focus:ring-steel/10 transition-all ${
                      password && !showPassword ? "font-mono tracking-widest text-base" : "font-medium"
                    }`}
                  />
                  <Lock className="absolute left-3.5 top-4 h-4 w-4 text-text-muted" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-3.5 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted/50 transition-colors focus:outline-none cursor-pointer"
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

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting}
                className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-steel py-3.5 text-sm font-bold text-white shadow-lg shadow-steel/25 hover:bg-steel-light hover:shadow-steel/35 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </>
                )}
              </button>
            </form>

            {/* Student Helper Tip */}
            <div className="mt-6 pt-5 border-t border-border-default/70 text-center">
              <p className="text-xs text-text-muted flex items-center justify-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-sage shrink-0" />
                <span>Students: Sign in with your 6-digit Student ID</span>
              </p>
            </div>
          </div>
        </div>

        {/* Right Decorative Column (Desktop) */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 max-w-md pl-8 animate-in fade-in slide-in-from-right-6 duration-700">
          <StudentDeskIllustration className="w-80 h-80 drop-shadow-xl" />
        </div>
      </div>

      {/* Clean Single-Line Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto py-4 text-center text-xs text-text-muted border-t border-border-default/40">
        <p>© {new Date().getFullYear()} Evalo. Designed for classroom assessments & student learning.</p>
      </footer>

      {/* Modals */}
      <ForgotPasswordModal
        isOpen={forgotPasswordOpen}
        onClose={() => setForgotPasswordOpen(false)}
      />

      <PasswordChangeModal
        isOpen={mustResetPassword || Boolean(user?.must_change_password)}
        forced={true}
        onClose={() => setMustResetPassword(false)}
      />
    </main>
  );
}
