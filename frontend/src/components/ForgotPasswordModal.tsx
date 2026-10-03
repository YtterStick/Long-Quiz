"use client";

import React, { useState } from "react";
import {
  KeyRound,
  GraduationCap,
  School,
  X,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="glass-card relative w-full max-w-md rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors focus:outline-none"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">Forgot Password</h2>
            <p className="text-xs text-text-muted">Account recovery assistance</p>
          </div>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-base border border-border-default mb-5">
          <button
            type="button"
            onClick={() => setRole("STUDENT")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
              role === "STUDENT"
                ? "bg-steel text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <GraduationCap className="h-4 w-4" />
            Student
          </button>
          <button
            type="button"
            onClick={() => setRole("TEACHER")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all ${
              role === "TEACHER"
                ? "bg-steel text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <School className="h-4 w-4" />
            Teacher / Faculty
          </button>
        </div>

        {/* Role-Specific Guidance */}
        {role === "STUDENT" ? (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-tan-border/40 bg-tan-ghost/15 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-tan flex items-center gap-1.5 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5" />
                How to reset student access
              </h3>
              <ol className="space-y-2 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tan/20 text-[10px] font-bold text-tan">
                    1
                  </span>
                  <span>Contact your class teacher or course instructor.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tan/20 text-[10px] font-bold text-tan">
                    2
                  </span>
                  <span>Provide your full name and 6-digit Student ID.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-tan/20 text-[10px] font-bold text-tan">
                    3
                  </span>
                  <span>Your teacher can copy your temporary password directly from their Section Roster.</span>
                </li>
              </ol>
            </div>
            <p className="text-[11px] text-text-muted px-1">
              * On your next login with the temporary password, you will be prompted to create your personal secure password.
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="rounded-2xl border border-steel-border/40 bg-steel-ghost/15 p-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-steel flex items-center gap-1.5 mb-2">
                <ShieldAlert className="h-3.5 w-3.5" />
                Faculty & Staff Password Reset
              </h3>
              <ol className="space-y-2 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    1
                  </span>
                  <span>Reach out to your school's LongQuiz System Administrator (<strong className="text-steel">admin</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    2
                  </span>
                  <span>The administrator will reset your account credentials in the Faculty Management portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    3
                  </span>
                  <span>Sign in with the temporary password provided by your administrator.</span>
                </li>
              </ol>
            </div>
            <p className="text-[11px] text-text-muted px-1">
              * For institutional security, faculty password resets require administrator authorization.
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-6">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-steel py-3 text-xs font-semibold text-white shadow-md shadow-steel/20 hover:bg-steel-light transition-all active:scale-[0.98]"
          >
            Back to Sign In
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
