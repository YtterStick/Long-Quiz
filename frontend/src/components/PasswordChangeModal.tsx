"use client";

import React, { useState } from "react";
import { auth as authApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { KeyRound, Lock, AlertCircle, CheckCircle2, Loader2, LogOut } from "lucide-react";

interface PasswordChangeModalProps {
  isOpen: boolean;
  forced?: boolean;
  onClose?: () => void;
}

export function PasswordChangeModal({ isOpen, forced = false, onClose }: PasswordChangeModalProps) {
  const { refreshUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);
      await refreshUser();
      setTimeout(() => {
        setSuccess(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        if (onClose) onClose();
      }, 1500);
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
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-md rounded-2xl border border-border-emphasis bg-surface-overlay p-6 shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border-default pb-4 mb-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              {forced ? "First-Time Password Change Required" : "Change Password"}
            </h2>
            <p className="text-xs text-text-muted">
              {forced
                ? "For security reasons, you must set a new password before accessing your dashboard."
                : "Update your account password below."}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-sage-ghost border border-sage-border p-3 text-xs text-sage">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Password changed successfully! Redirecting...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Current / Temporary Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              New Password (min 6 characters)
            </label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
              />
              <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {forced ? (
              <button
                type="button"
                onClick={logout}
                className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Log Out
              </button>
            ) : (
              onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                >
                  Cancel
                </button>
              )
            )}
            <button
              type="submit"
              disabled={loading || success}
              className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20 hover:opacity-95 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Set New Password"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
