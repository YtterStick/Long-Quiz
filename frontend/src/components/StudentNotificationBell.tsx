"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  X,
  RefreshCw,
  Users,
  BookOpen,
  Award,
  PenTool,
  Clock,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  Trash2,
  CheckCheck,
} from "lucide-react";
import { student as studentApi, StudentNotificationItem } from "@/lib/api";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { parseAvatarConfig } from "@/types/avatar";
import { SkeletonNotificationList } from "@/components/ui/Skeleton";

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

export function StudentNotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<StudentNotificationItem[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [completedActions, setCompletedActions] = useState<Record<string, "ACCEPTED" | "DECLINED" | "VIEWED">>({});
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"ALL" | "UNREAD" | "FRIENDS" | "DECKS" | "EXAMS">("ALL");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load read notifications, dismissed IDs, and action statuses from localStorage
  useEffect(() => {
    try {
      const storedRead = localStorage.getItem("evalo_student_read_notifs");
      if (storedRead) {
        setReadIds(new Set(JSON.parse(storedRead)));
      }
      const storedDismissed = localStorage.getItem("evalo_student_dismissed_notifs");
      if (storedDismissed) {
        setDismissedIds(new Set(JSON.parse(storedDismissed)));
      }
      const storedActions = localStorage.getItem("evalo_student_notif_actions");
      if (storedActions) {
        setCompletedActions(JSON.parse(storedActions));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const saveReadIds = (newSet: Set<string>) => {
    setReadIds(newSet);
    try {
      localStorage.setItem("evalo_student_read_notifs", JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const saveDismissedIds = (newSet: Set<string>) => {
    setDismissedIds(newSet);
    try {
      localStorage.setItem("evalo_student_dismissed_notifs", JSON.stringify(Array.from(newSet)));
    } catch {
      // ignore
    }
  };

  const saveCompletedActions = (newActions: Record<string, "ACCEPTED" | "DECLINED" | "VIEWED">) => {
    setCompletedActions(newActions);
    try {
      localStorage.setItem("evalo_student_notif_actions", JSON.stringify(newActions));
    } catch {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await studentApi.getNotifications();
      const notifs = data || [];
      setNotifications(notifs);

      // Auto-mark notifications that backend returned as is_done
      setReadIds((prev) => {
        let changed = false;
        const next = new Set(prev);
        notifs.forEach((n) => {
          if (n.is_done && !next.has(n.id)) {
            next.add(n.id);
            changed = true;
          }
        });
        if (changed) {
          try {
            localStorage.setItem("evalo_student_read_notifs", JSON.stringify(Array.from(next)));
          } catch {
            // ignore
          }
        }
        return changed ? next : prev;
      });
    } catch {
      // silently ignore if offline/not authenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      fetchNotifications();
    };
    window.addEventListener("evalo_notifications_refresh", handleUpdate);
    return () => window.removeEventListener("evalo_notifications_refresh", handleUpdate);
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

  const markAsRead = (notifId: string) => {
    const updated = new Set(readIds);
    updated.add(notifId);
    saveReadIds(updated);
  };

  const handleMarkAllAsRead = () => {
    const updated = new Set(readIds);
    notifications.forEach((n) => updated.add(n.id));
    saveReadIds(updated);
  };

  const handleDismiss = (notifId: string) => {
    const updated = new Set(dismissedIds);
    updated.add(notifId);
    saveDismissedIds(updated);
  };

  const handleClearAll = () => {
    const updated = new Set(dismissedIds);
    notifications.forEach((n) => updated.add(n.id));
    saveDismissedIds(updated);
  };

  const handleAcceptFriendRequest = async (notif: StudentNotificationItem) => {
    const reqId = notif.data.request_id;
    if (!reqId) return;
    try {
      setActionLoadingId(reqId);
      await studentApi.respondFriendRequest(reqId, "ACCEPT");
      // Keep in list! Mark as read and save completed action status
      markAsRead(notif.id);
      const updatedActions = { ...completedActions, [notif.id]: "ACCEPTED" as const };
      saveCompletedActions(updatedActions);
      await fetchNotifications();
      window.dispatchEvent(new Event("evalo_friends_updated"));
    } catch (err: any) {
      alert(err?.detail || "Failed to accept friend request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeclineFriendRequest = async (notif: StudentNotificationItem) => {
    const reqId = notif.data.request_id;
    if (!reqId) return;
    try {
      setActionLoadingId(reqId);
      await studentApi.respondFriendRequest(reqId, "DECLINE");
      markAsRead(notif.id);
      const updatedActions = { ...completedActions, [notif.id]: "DECLINED" as const };
      saveCompletedActions(updatedActions);
      await fetchNotifications();
      window.dispatchEvent(new Event("evalo_friends_updated"));
    } catch (err: any) {
      alert(err?.detail || "Failed to decline friend request");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenReviewerDeck = (notif: StudentNotificationItem) => {
    markAsRead(notif.id);
    const updatedActions = { ...completedActions, [notif.id]: "VIEWED" as const };
    saveCompletedActions(updatedActions);
    setIsOpen(false);
    router.push("/student/reviewer");
  };

  const handleNavigateToExam = (notif: StudentNotificationItem) => {
    markAsRead(notif.id);
    const updatedActions = { ...completedActions, [notif.id]: "VIEWED" as const };
    saveCompletedActions(updatedActions);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("studentTabChange", { detail: "available" }));
    router.push("/student/dashboard?tab=available");
  };

  const handleNavigateToGrades = (notif: StudentNotificationItem) => {
    markAsRead(notif.id);
    const updatedActions = { ...completedActions, [notif.id]: "VIEWED" as const };
    saveCompletedActions(updatedActions);
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("studentTabChange", { detail: "grades" }));
    router.push("/student/dashboard?tab=grades");
  };

  // Active notifications (not manually deleted by user)
  const activeNotifications = notifications.filter((n) => !dismissedIds.has(n.id));

  // Determine read status: read if in readIds or marked is_done or in completedActions
  const isNotificationRead = (n: StudentNotificationItem) => {
    return Boolean(readIds.has(n.id) || n.is_done || completedActions[n.id]);
  };

  // Filtered notifications
  const displayedNotifications = activeNotifications.filter((n) => {
    if (filterType === "UNREAD") return !isNotificationRead(n);
    if (filterType === "FRIENDS") return n.type === "FRIEND_REQUEST";
    if (filterType === "DECKS") return n.type === "SHARED_DECK";
    if (filterType === "EXAMS") return n.type === "EXAM_AVAILABLE" || n.type === "GRADE_RELEASED";
    return true;
  });

  const unreadCount = activeNotifications.filter((n) => !isNotificationRead(n)).length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className={`relative flex h-9 w-9 items-center justify-center rounded-2xl border transition-all cursor-pointer ${
          unreadCount > 0
            ? "border-tan/40 bg-tan/10 text-tan hover:bg-tan/20 hover:border-tan/60 shadow-sm"
            : "border-border-default bg-surface-overlay text-text-muted hover:text-text-primary hover:border-border-emphasis"
        }`}
        aria-label="Student Notifications"
        title={unreadCount > 0 ? `${unreadCount} unread notification(s)` : "Notifications"}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-burgundy-light text-[10px] font-bold text-white shadow ring-2 ring-surface-raised animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
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
          <div className="flex items-center justify-between border-b border-border-default pb-2.5 mb-2.5 px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-primary">Notifications</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-tan/15 px-2 py-0.5 text-[10px] font-bold text-tan border border-tan/30">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="text-[10px] font-medium text-text-muted">All read</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-[11px] font-medium text-sage hover:text-sage-light px-2 py-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-3 w-3" />
                  <span>Mark read</span>
                </button>
              )}
              {activeNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-medium text-text-muted hover:text-text-primary px-1.5 py-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                  title="Clear all from view"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={fetchNotifications}
                disabled={loading}
                className="text-text-muted hover:text-text-primary p-1 rounded-lg hover:bg-surface-subtle transition-colors cursor-pointer"
                title="Refresh notifications"
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

          {/* Filter Pills */}
          {activeNotifications.length > 0 && (
            <div className="flex items-center gap-1 pb-2 mb-2 border-b border-border-subtle overflow-x-auto no-scrollbar text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType("ALL")}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  filterType === "ALL"
                    ? "bg-steel text-white shadow-xs font-bold"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                }`}
              >
                All ({activeNotifications.length})
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilterType("UNREAD")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                    filterType === "UNREAD"
                      ? "bg-tan text-white shadow-xs font-bold"
                      : "text-tan hover:bg-tan/10"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
              )}
              <button
                type="button"
                onClick={() => setFilterType("FRIENDS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  filterType === "FRIENDS"
                    ? "bg-steel text-white shadow-xs font-bold"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                }`}
              >
                Requests ({activeNotifications.filter((n) => n.type === "FRIEND_REQUEST").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("DECKS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  filterType === "DECKS"
                    ? "bg-steel text-white shadow-xs font-bold"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                }`}
              >
                Decks ({activeNotifications.filter((n) => n.type === "SHARED_DECK").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("EXAMS")}
                className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer shrink-0 ${
                  filterType === "EXAMS"
                    ? "bg-steel text-white shadow-xs font-bold"
                    : "text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                }`}
              >
                Exams ({activeNotifications.filter((n) => n.type === "EXAM_AVAILABLE" || n.type === "GRADE_RELEASED").length})
              </button>
            </div>
          )}

          {/* Notifications List with Skeleton Loader */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-0.5">
            {loading && notifications.length === 0 ? (
              <SkeletonNotificationList count={3} />
            ) : displayedNotifications.length === 0 ? (
              <div className="py-8 text-center space-y-2 px-4">
                <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl bg-surface-subtle border border-border-default text-text-muted">
                  <Check className="h-5 w-5 text-sage" />
                </div>
                <p className="text-xs font-semibold text-text-primary">
                  {filterType === "UNREAD" ? "No unread notifications!" : "All caught up!"}
                </p>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  {filterType === "UNREAD"
                    ? "You've viewed all pending notifications."
                    : "No notifications found in this category."}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => {
                const isFriendReq = notif.type === "FRIEND_REQUEST";
                const isSharedDeck = notif.type === "SHARED_DECK";
                const isExamAvail = notif.type === "EXAM_AVAILABLE";
                const isGradeRel = notif.type === "GRADE_RELEASED";
                const isRead = isNotificationRead(notif);
                const actionState = completedActions[notif.id] || (notif.is_done ? (notif.data.status === "ACCEPTED" ? "ACCEPTED" : "VIEWED") : null);

                return (
                  <div
                    key={notif.id}
                    onClick={() => {
                      if (!isRead) markAsRead(notif.id);
                    }}
                    className={`group relative rounded-xl border p-3 transition-all space-y-2 ${
                      isRead
                        ? "bg-surface-base/50 border-border-default/70 opacity-90 hover:opacity-100"
                        : "bg-surface-base border-border-emphasis hover:border-steel/50 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {isFriendReq ? (
                          <div className="shrink-0 relative">
                            <StudentAvatar
                              config={parseAvatarConfig(notif.data.avatar_config)}
                              size={34}
                            />
                            {!isRead && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-steel ring-2 ring-surface-base" />
                            )}
                          </div>
                        ) : isSharedDeck ? (
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border/50">
                            <Sparkles className="h-4 w-4" />
                            {!isRead && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-steel ring-2 ring-surface-base" />
                            )}
                          </div>
                        ) : isExamAvail ? (
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cream-ghost text-cream border border-cream-border/50">
                            <PenTool className="h-4 w-4" />
                            {!isRead && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-cream ring-2 ring-surface-base" />
                            )}
                          </div>
                        ) : (
                          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border/50">
                            <Award className="h-4 w-4" />
                            {!isRead && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-sage ring-2 ring-surface-base" />
                            )}
                          </div>
                        )}

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-steel">
                              {notif.title}
                            </span>
                            {isRead && (
                              <span className="text-[9px] font-medium text-text-muted flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5 text-sage" /> Read
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-text-primary leading-tight truncate">
                            {isFriendReq
                              ? notif.data.sender_name
                              : isSharedDeck
                              ? notif.data.title
                              : isExamAvail
                              ? notif.data.title
                              : notif.data.title}
                          </p>
                          <p className="text-[11px] text-text-muted line-clamp-2 mt-0.5">
                            {notif.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] text-text-muted font-mono">
                          {formatTimeAgo(notif.created_at)}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDismiss(notif.id);
                          }}
                          className="rounded-md p-1 text-text-muted hover:text-burgundy-light hover:bg-surface-subtle transition-colors cursor-pointer"
                          title="Remove from list"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Action buttons with persistent completed state */}
                    {isFriendReq && (
                      <div className="pt-1">
                        {actionState === "ACCEPTED" || notif.data.status === "ACCEPTED" ? (
                          <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-sage/10 text-sage text-xs font-semibold border border-sage/20">
                            <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                            <span>Request Accepted</span>
                          </div>
                        ) : actionState === "DECLINED" || notif.data.status === "DECLINED" ? (
                          <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-surface-subtle text-text-muted text-xs font-medium border border-border-default">
                            <X className="h-3.5 w-3.5" />
                            <span>Request Declined</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcceptFriendRequest(notif);
                              }}
                              disabled={actionLoadingId === notif.data.request_id}
                              className="flex-1 inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-sage hover:bg-sage-light text-white text-xs font-semibold shadow-xs transition cursor-pointer disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Accept Request</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeclineFriendRequest(notif);
                              }}
                              disabled={actionLoadingId === notif.data.request_id}
                              className="py-1.5 px-3 rounded-xl border border-border-default bg-surface-subtle hover:bg-burgundy-ghost text-text-muted hover:text-burgundy-light text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {isSharedDeck && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenReviewerDeck(notif);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-steel/15 hover:bg-steel text-steel hover:text-white border border-steel/30 text-xs font-semibold transition cursor-pointer"
                        >
                          <BookOpen className="h-3.5 w-3.5" />
                          <span>{actionState === "VIEWED" ? "Open Study Reviewer Again" : "Open Study Reviewer"}</span>
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </button>
                      </div>
                    )}

                    {isExamAvail && (
                      <div className="pt-1 flex items-center justify-between gap-2">
                        {notif.is_done || notif.data.is_submitted ? (
                          <div className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-sage-ghost text-sage text-xs font-semibold border border-sage-border">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Exam Submitted</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNavigateToExam(notif);
                            }}
                            className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl gradient-bg-primary text-text-primary text-xs font-semibold shadow-xs hover:opacity-95 transition cursor-pointer"
                          >
                            <PenTool className="h-3.5 w-3.5" />
                            <span>Go to Online Exam</span>
                            <ChevronRight className="h-3 w-3 ml-0.5" />
                          </button>
                        )}
                      </div>
                    )}

                    {isGradeRel && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToGrades(notif);
                          }}
                          className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-sage-ghost hover:bg-sage text-sage hover:text-white border border-sage-border/50 text-xs font-semibold transition cursor-pointer"
                        >
                          <Award className="h-3.5 w-3.5" />
                          <span>View My Score & Answers</span>
                          <ChevronRight className="h-3 w-3 ml-0.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

