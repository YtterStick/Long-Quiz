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
  Send,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { auth } from "@/lib/api";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [identifier, setIdentifier] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState<{
    message: string;
    studentName: string;
    studentId: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStudentResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await auth.requestStudentPasswordReset(identifier.trim());
      setSubmittedData({
        message: res.message,
        studentName: res.student_name,
        studentId: res.student_id,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reset request. Please check your Student ID or username."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setIdentifier("");
    setSubmittedData(null);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="glass-card relative w-full max-w-md rounded-3xl border border-border-default bg-surface-raised p-6 shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors focus:outline-none cursor-pointer"
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
            <h2 className="text-lg font-bold text-text-primary">Password Assistance</h2>
            <p className="text-xs text-text-muted">Account recovery & instructor notification</p>
          </div>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-surface-base border border-border-default mb-5">
          <button
            type="button"
            onClick={() => {
              setRole("STUDENT");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
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
            onClick={() => {
              setRole("TEACHER");
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 rounded-xl py-2 px-3 text-xs font-semibold transition-all cursor-pointer ${
              role === "TEACHER"
                ? "bg-steel text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <School className="h-4 w-4" />
            Teacher / Faculty
          </button>
        </div>

        {/* Role-Specific Content */}
        {role === "STUDENT" ? (
          submittedData ? (
            /* Success confirmation */
            <div className="space-y-4 py-2 text-center animate-in fade-in duration-200">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sage-ghost text-sage border border-sage-border mx-auto shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-text-primary">Reset Request Sent!</h3>
                <p className="text-xs text-text-muted">
                  Your class instructor has received an instant notification.
                </p>
              </div>

              <div className="rounded-2xl border border-border-emphasis bg-surface-base p-4 text-left font-mono text-xs space-y-1.5">
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="font-sans text-[11px] text-text-muted">Student:</span>
                  <span className="font-sans font-bold text-text-primary">{submittedData.studentName}</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="font-sans text-[11px] text-text-muted">Student ID:</span>
                  <span className="font-bold text-tan">{submittedData.studentId}</span>
                </div>
              </div>

              <div className="rounded-xl bg-tan-ghost/20 border border-tan-border/40 p-3 text-left">
                <p className="text-xs text-text-secondary leading-relaxed">
                  📢 <strong>Next Step:</strong> Contact your teacher or check your section roster. Your teacher can reset your password and hand you a temporary sign-in code.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-steel py-3 text-xs font-semibold text-white shadow-md shadow-steel/20 hover:bg-steel-light transition-all cursor-pointer"
              >
                Back to Sign In
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* Request Form */
            <form onSubmit={handleStudentResetRequest} className="space-y-4">
              <div className="rounded-2xl border border-border-emphasis bg-surface-base/80 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-text-primary">
                  <Sparkles className="h-4 w-4 text-tan" />
                  <span>Notify Your Instructor</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Enter your Student ID or username below. A notification will be sent directly to your teacher to issue a new temporary password.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                  Student ID or Username
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="e.g. 02000162367 or andrei.dilag"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none"
                />
                <p className="text-[10px] text-text-muted mt-1 px-1">
                  Accepts your full ID (02000XXXXXX), 6-digit OMR ID, or username.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || !identifier.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl gradient-bg-primary py-3 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Notifying Teacher...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Reset Request to Teacher</span>
                  </>
                )}
              </button>
            </form>
          )
        ) : (
          /* Faculty Guidance */
          <div className="space-y-4">
            <div className="rounded-2xl border border-steel-border/40 bg-steel-ghost/15 p-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-steel flex items-center gap-1.5">
                <ShieldAlert className="h-3.5 w-3.5" />
                Faculty & Staff Password Reset
              </h3>
              <ol className="space-y-2 text-xs text-text-secondary">
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    1
                  </span>
                  <span>Contact your Evalo System Administrator (<strong className="text-steel">admin</strong>).</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    2
                  </span>
                  <span>The administrator will reset your faculty credentials in the Management portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-steel/20 text-[10px] font-bold text-steel">
                    3
                  </span>
                  <span>Sign in with the temporary password provided by your administrator.</span>
                </li>
              </ol>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-steel py-3 text-xs font-semibold text-white shadow-md shadow-steel/20 hover:bg-steel-light transition-all cursor-pointer"
            >
              Back to Sign In
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
