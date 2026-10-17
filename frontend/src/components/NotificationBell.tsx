"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Bell,
  KeyRound,
  Check,
  Copy,
  X,
  RefreshCw,
  Loader2,
  ShieldAlert,
  User,
  GraduationCap,
} from "lucide-react";
import { SkeletonNotificationList } from "@/components/ui/Skeleton";
import { teacher } from "@/lib/api";

interface ResetRequest {
  id: string;
  student_id: string;
  status: string;
  created_at: string;
  resolved_at?: string | null;
  student_name: string;
  student_username: string;
  student_number: number;
  full_student_id: string;
  section_name?: string | null;
  section_subject?: string | null;
}

interface ResetSuccess {
  studentName: string;
  username: string;
  fullStudentId: string;
  tempPassword: string;
}

function formatTimeAgo(dateStr: string) {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.max(0, Math.floor(diffMs / 60000));
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<ResetSuccess | null>(null);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const data = await teacher.listPasswordResetRequests();
      setRequests(data);
    } catch {
      // silently ignore if offline/not authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // Poll every 30 seconds for new student requests
    const interval = setInterval(fetchRequests, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleResetPassword = async (req: ResetRequest) => {
    setResettingId(req.student_id);
    try {
      const res = await teacher.resetStudentPassword(req.student_id);
      setResetSuccess({
        studentName: res.student_name,
        username: res.username,
        fullStudentId: res.full_student_id,
        tempPassword: res.temp_password,
      });
      // Refresh list after reset
      await fetchRequests();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to reset student password");
    } finally {
      setResettingId(null);
    }
  };

  const handleDismiss = async (requestId: string) => {
    try {
      await teacher.dismissPasswordResetRequest(requestId);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to dismiss request");
    }
  };

  const handleCopyCredentials = () => {
    if (!resetSuccess) return;
    const text = `LongQuiz Login Credentials\nStudent: ${resetSuccess.studentName}\nStudent ID: ${resetSuccess.fullStudentId}\nUsername: ${resetSuccess.username}\nTemporary Password: ${resetSuccess.tempPassword}\n\n* You will be prompted to set your personal password upon sign-in.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const pendingCount = requests.length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        {/* Bell Button */}
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchRequests();
          }}
          className={`relative flex h-9 w-9 items-center justify-center rounded-2xl border transition-all cursor-pointer ${
            pendingCount > 0
              ? "border-tan/40 bg-tan/10 text-tan hover:bg-tan/20 hover:border-tan/60 shadow-sm"
              : "border-border-default bg-surface-overlay text-text-muted hover:text-text-primary hover:border-border-emphasis"
          }`}
          aria-label="Student Notifications"
          title={pendingCount > 0 ? `${pendingCount} student password reset request(s)` : "Notifications"}
        >
          <Bell className="h-4 w-4" />
          {pendingCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-burgundy-light text-[10px] font-bold text-white shadow ring-2 ring-surface-raised animate-pulse">
              {pendingCount > 9 ? "9+" : pendingCount}
            </span>
          )}
        </button>

        {/* Mobile Backdrop */}
        {isOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs sm:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-w-md mx-auto sm:mx-0 rounded-2xl border border-border-default bg-surface-overlay/95 p-3.5 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-default pb-3 mb-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-primary">Password Reset Requests</span>
                {pendingCount > 0 && (
                  <span className="rounded-full bg-tan/15 px-2 py-0.5 text-[10px] font-bold text-tan border border-tan/30">
                    {pendingCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={fetchRequests}
                  disabled={loading}
                  className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-steel" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="sm:hidden text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
              {loading && requests.length === 0 ? (
                <SkeletonNotificationList count={3} />
              ) : requests.length === 0 ? (
                <div className="py-8 text-center space-y-2 px-4">
                  <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl bg-surface-subtle border border-border-default text-text-muted">
                    <Check className="h-5 w-5 text-sage" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">All caught up!</p>
                  <p className="text-[11px] text-text-muted">
                    No pending password reset requests from your students.
                  </p>
                </div>
              ) : (
                requests.map((req) => (
                  <div
                    key={req.id}
                    className="rounded-xl border border-border-emphasis bg-surface-base/80 p-3 hover:border-steel/40 transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-steel/15 text-xs font-bold text-steel-light border border-steel/25">
                          {req.student_name[0]?.toUpperCase() || "S"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-text-primary truncate">
                            {req.student_name}
                          </p>
                          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
                            <span className="text-tan font-semibold">{req.full_student_id}</span>
                            <span>•</span>
                            <span className="truncate">@{req.student_username}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-text-muted font-mono">
                          {formatTimeAgo(req.created_at)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDismiss(req.id)}
                          className="rounded-md p-1 text-text-muted hover:text-burgundy-light hover:bg-surface-subtle transition-colors cursor-pointer"
                          title="Dismiss"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Section Badge */}
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-text-muted text-[10px]">Enrolled Section:</span>
                      {req.section_name ? (
                        <span className="rounded bg-steel/15 px-1.5 py-0.5 text-[10px] font-semibold text-steel-light border border-steel/25 truncate max-w-44">
                          {req.section_name}
                        </span>
                      ) : (
                        <span className="rounded bg-cream-ghost px-1.5 py-0.5 text-[10px] font-semibold text-cream border border-cream-border">
                          Not in Roster
                        </span>
                      )}
                    </div>

                    {/* Quick Reset Action */}
                    <button
                      type="button"
                      onClick={() => handleResetPassword(req)}
                      disabled={resettingId === req.student_id}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-1.5 px-3 text-xs font-semibold text-text-primary shadow-sm hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {resettingId === req.student_id ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Issuing New Password...</span>
                        </>
                      ) : (
                        <>
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>Reset Password Now</span>
                        </>
                      )}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Password Reset Success Modal */}
      {resetSuccess && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-3xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Password Reset Successfully</h3>
                <p className="text-xs text-text-muted">New temporary credentials issued</p>
              </div>
            </div>

            {/* Student Credential Card */}
            <div className="rounded-2xl border border-border-emphasis bg-surface-base p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-border-default/60">
                <span className="font-sans text-text-muted text-[11px]">Student</span>
                <span className="font-sans font-bold text-text-primary">{resetSuccess.studentName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border-default/60">
                <span className="font-sans text-text-muted text-[11px]">Student ID</span>
                <span className="font-bold text-tan">{resetSuccess.fullStudentId}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border-default/60">
                <span className="font-sans text-text-muted text-[11px]">Username</span>
                <span className="font-bold text-text-primary">@{resetSuccess.username}</span>
              </div>
              <div className="pt-1">
                <p className="font-sans text-[11px] text-text-muted mb-1.5">New Temporary Password:</p>
                <div className="flex items-center justify-between rounded-xl bg-surface-subtle border border-steel/30 px-3 py-2 text-steel-light font-bold text-sm tracking-wider">
                  <span>{resetSuccess.tempPassword}</span>
                  <button
                    type="button"
                    onClick={handleCopyCredentials}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    title="Copy Credentials"
                  >
                    {copied ? <Check className="h-4 w-4 text-sage" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-text-muted">
              * Provide this temporary password to {resetSuccess.studentName}. They will be prompted to create their own secure password on next login.
            </p>

            {/* Modal Actions */}
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-sage" />
                    <span>Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-steel" />
                    <span>Copy Full Credentials</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setResetSuccess(null)}
                className="rounded-xl gradient-bg-primary px-5 py-2.5 text-xs font-semibold text-text-primary hover:opacity-95 transition-opacity cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
