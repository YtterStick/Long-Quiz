"use client";

import React, { useEffect, useState, useCallback } from "react";
import { teacher as teacherApi } from "@/lib/api";
import {
  X,
  Play,
  Pause,
  RefreshCw,
  Users,
  CheckCircle2,
  AlertTriangle,
  Monitor,
  Maximize2,
  Eye,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  FileCheck2,
  RotateCcw,
  Zap,
} from "lucide-react";
import { SkeletonLiveRoster } from "@/components/ui/Skeleton";

interface StudentAnswer {
  question_number: number;
  shaded_option: string | null;
  is_correct: boolean;
}

interface MonitorStudent {
  student_id: string;
  student_number: number;
  name: string;
  status: "NOT_JOINED" | "DISCONNECTED" | "IN_LOBBY" | "TAKING" | "SUBMITTED";
  is_fullscreen: boolean;
  is_focused: boolean;
  violations: number;
  tab_switches: number;
  fullscreen_exits: number;
  attempt_number: number;
  retakes_granted: number;
  auto_submitted: boolean;
  is_online_submission: boolean;
  last_seen: string | null;
  submission_id: string | null;
  total_score: number | null;
  max_score: number | null;
  submitted_at: string | null;
  answers: StudentAnswer[];
}

interface MonitorData {
  is_online_active: boolean;
  is_started: boolean;
  total_students: number;
  counts: {
    in_lobby: number;
    ready: number;
    taking: number;
    submitted: number;
    not_joined: number;
  };
  students: MonitorStudent[];
}

interface LiveExamMonitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  examId: string;
  examTitle: string;
  totalQuestions: number;
  onStatusChanged?: (isOnline: boolean, isStarted: boolean) => void;
}

export function LiveExamMonitorModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  examId,
  examTitle,
  totalQuestions,
  onStatusChanged,
}: LiveExamMonitorModalProps) {
  const [data, setData] = useState<MonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [togglingStart, setTogglingStart] = useState(false);
  const [selectedStudentForAnswers, setSelectedStudentForAnswers] = useState<MonitorStudent | null>(null);
  const [retakeTarget, setRetakeTarget] = useState<MonitorStudent | null>(null);
  const [resetCounters, setResetCounters] = useState(true);
  const [grantingRetake, setGrantingRetake] = useState(false);
  const [retakeNotice, setRetakeNotice] = useState<string | null>(null);

  const fetchMonitor = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await teacherApi.monitorSectionExam(sectionId, examId);
      setData(res);
      setFetchError(null);
      if (onStatusChanged) {
        onStatusChanged(res.is_online_active, res.is_started);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load live roster";
      if (isManual) {
        console.warn("Manual monitor refresh failed:", msg);
        setFetchError(msg);
      } else {
        // Transient network blip during background 3-second auto-polling
        setFetchError((prev) => (data ? prev : msg));
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [sectionId, examId, onStatusChanged]);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setSelectedStudentForAnswers(null);
      return;
    }

    setLoading(true);
    fetchMonitor();

    // Auto-poll live roster every 3 seconds
    const interval = setInterval(() => {
      fetchMonitor();
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, fetchMonitor]);

  const handleToggleStart = async () => {
    if (!data) return;
    const nextStart = !data.is_started;
    setTogglingStart(true);
    try {
      const res = await teacherApi.startSectionExam(sectionId, examId, nextStart);
      setData((prev) => (prev ? { ...prev, is_started: res.is_started } : prev));
      if (onStatusChanged) {
        onStatusChanged(res.is_online_active, res.is_started);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle exam start");
    } finally {
      setTogglingStart(false);
    }
  };

  const handleAllowRetake = async () => {
    if (!retakeTarget) return;
    setGrantingRetake(true);
    try {
      const res = await teacherApi.allowStudentRetake(sectionId, examId, retakeTarget.student_id, resetCounters);
      setRetakeNotice(`${retakeTarget.name} can now retake the exam (attempt #${res.next_attempt}).`);
      setRetakeTarget(null);
      setSelectedStudentForAnswers(null);
      await fetchMonitor();
      setTimeout(() => setRetakeNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to grant retake");
    } finally {
      setGrantingRetake(false);
    }
  };

  // View & Filter States
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "in_lobby" | "taking" | "submitted" | "violations" | "offline">("all");

  const totalTabSwitches = data?.students.reduce((sum, s) => sum + (s.tab_switches || 0), 0) ?? 0;
  const totalFullscreenExits = data?.students.reduce((sum, s) => sum + (s.fullscreen_exits || 0), 0) ?? 0;
  const violationStudents = data?.students.filter((s) => s.tab_switches > 0 || s.fullscreen_exits > 0) ?? [];

  // Filtered Students list
  const filteredStudents = (data?.students ?? []).filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(s.student_number).includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === "in_lobby") return s.status === "IN_LOBBY";
    if (statusFilter === "taking") return s.status === "TAKING";
    if (statusFilter === "submitted") return s.status === "SUBMITTED";
    if (statusFilter === "violations") return s.tab_switches > 0 || s.fullscreen_exits > 0;
    if (statusFilter === "offline") return s.status === "NOT_JOINED" || s.status === "DISCONNECTED";
    return true;
  });

  if (!isOpen) return null;

  const totalStudentsCount = data?.total_students || 1;
  const inLobbyPercent = Math.round(((data?.counts.in_lobby || 0) / totalStudentsCount) * 100);
  const takingPercent = Math.round(((data?.counts.taking || 0) / totalStudentsCount) * 100);
  const submittedPercent = Math.round(((data?.counts.submitted || 0) / totalStudentsCount) * 100);
  const offlinePercent = Math.max(0, 100 - inLobbyPercent - takingPercent - submittedPercent);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-2 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl border border-border-default bg-surface-raised shadow-2xl flex flex-col max-h-[94vh] overflow-hidden animate-in fade-in zoom-in-95 transition-all">
        {/* ── Top Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-border-default/80 bg-surface-base shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="rounded-full bg-steel-ghost px-3 py-0.5 text-[11px] font-bold text-steel border border-steel-border">
                Section: {sectionName}
              </span>
              {data?.is_started ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-ghost px-3 py-0.5 text-[11px] font-bold text-sage border border-sage-border animate-pulse">
                  <Play className="h-3 w-3 fill-sage" />
                  Live Exam Active
                </span>
              ) : data?.is_online_active ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-tan-ghost px-3 py-0.5 text-[11px] font-bold text-tan border border-tan-border">
                  <Clock className="h-3 w-3" />
                  Lobby Open • Waiting for Start
                </span>
              ) : (
                <span className="rounded-full bg-surface-subtle px-3 py-0.5 text-[11px] font-bold text-text-muted border border-border-default">
                  Lobby Closed
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary flex items-center gap-2">
              <Monitor className="h-5 w-5 text-steel" />
              {examTitle}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Real-time student lobby presence, active focus detection, and instant grading monitor.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchMonitor(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-subtle px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              title="Refresh Roster"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin text-steel" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {data?.is_online_active && (
              <button
                type="button"
                onClick={handleToggleStart}
                disabled={togglingStart}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all cursor-pointer shadow-lg active:scale-95 ${
                  data.is_started
                    ? "bg-burgundy text-white hover:bg-burgundy-light shadow-burgundy/25"
                    : "bg-steel text-white hover:bg-steel-light shadow-steel/25"
                }`}
              >
                {togglingStart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : data.is_started ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause / End Exam
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Start Exam for Class ({data.counts.in_lobby}/{data.total_students} Ready)
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              title="Close Monitor"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Live Visual Activity Bar & Key Metrics ──────────────────── */}
        <div className="p-4 sm:p-5 bg-surface-base/70 border-b border-border-default/70 shrink-0 space-y-3">
          {/* Segmented Visual Progress Bar */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-text-secondary">Class Attendance &amp; Activity Progress</span>
              <span className="text-text-muted font-mono">{data?.total_students || 0} Enrolled</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden flex shadow-inner">
              {inLobbyPercent > 0 && (
                <div
                  style={{ width: `${inLobbyPercent}%` }}
                  className="h-full bg-tan transition-all duration-500"
                  title={`In Lobby: ${data?.counts.in_lobby} (${inLobbyPercent}%)`}
                />
              )}
              {takingPercent > 0 && (
                <div
                  style={{ width: `${takingPercent}%` }}
                  className="h-full bg-steel transition-all duration-500"
                  title={`Taking Exam: ${data?.counts.taking} (${takingPercent}%)`}
                />
              )}
              {submittedPercent > 0 && (
                <div
                  style={{ width: `${submittedPercent}%` }}
                  className="h-full bg-sage transition-all duration-500"
                  title={`Submitted: ${data?.counts.submitted} (${submittedPercent}%)`}
                />
              )}
              {offlinePercent > 0 && (
                <div
                  style={{ width: `${offlinePercent}%` }}
                  className="h-full bg-surface-subtle transition-all duration-500"
                  title={`Offline: ${data?.counts.not_joined} (${offlinePercent}%)`}
                />
              )}
            </div>
          </div>

          {/* Metric Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div
              onClick={() => setStatusFilter("in_lobby")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "in_lobby"
                  ? "border-tan bg-tan-ghost shadow-sm"
                  : "border-border-default bg-surface-base hover:border-tan-border"
              }`}
            >
              <div>
                <span className="text-[11px] text-text-muted block font-medium">In Lobby (Ready)</span>
                <strong className="text-lg font-black text-tan">
                  {data?.counts.in_lobby || 0}{" "}
                  <span className="text-[10px] text-text-muted font-normal">
                    ({data?.counts.ready || 0} fullscreen)
                  </span>
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-tan-ghost text-tan border border-tan-border flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("taking")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "taking"
                  ? "border-steel bg-steel-ghost shadow-sm"
                  : "border-border-default bg-surface-base hover:border-steel-border"
              }`}
            >
              <div>
                <span className="text-[11px] text-text-muted block font-medium">Currently Taking</span>
                <strong className="text-lg font-black text-steel">
                  {data?.counts.taking || 0}
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-steel-ghost text-steel border border-steel-border flex items-center justify-center">
                <Monitor className="h-4 w-4" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("submitted")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "submitted"
                  ? "border-sage bg-sage-ghost shadow-sm"
                  : "border-border-default bg-surface-base hover:border-sage-border"
              }`}
            >
              <div>
                <span className="text-[11px] text-text-muted block font-medium">Submitted</span>
                <strong className="text-lg font-black text-sage">
                  {data?.counts.submitted || 0}{" "}
                  <span className="text-[10px] text-text-muted font-normal">
                    / {data?.total_students || 0}
                  </span>
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-sage-ghost text-sage border border-sage-border flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("offline")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "offline"
                  ? "border-border-emphasis bg-surface-subtle shadow-sm"
                  : "border-border-default bg-surface-base hover:border-border-emphasis"
              }`}
            >
              <div>
                <span className="text-[11px] text-text-muted block font-medium">Offline / Not Joined</span>
                <strong className="text-lg font-black text-text-muted">
                  {data?.counts.not_joined || 0}
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-surface-subtle text-text-muted border border-border-default flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Incident / Violation Alert Banner ──────────────── */}
        {violationStudents.length > 0 && (
          <div className="mx-4 sm:mx-6 mt-4 p-3.5 rounded-2xl bg-burgundy-ghost border border-burgundy-border text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-burgundy-light font-semibold">
              <ShieldAlert className="h-4 w-4 shrink-0 text-burgundy-light" />
              <span>
                <strong>Proctoring Notice:</strong> {totalTabSwitches} alt-tab switch{totalTabSwitches === 1 ? "" : "es"} detected across {violationStudents.length} student{violationStudents.length === 1 ? "" : "s"}.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStatusFilter(statusFilter === "violations" ? "all" : "violations")}
              className="shrink-0 text-[11px] font-bold text-burgundy-light underline hover:text-white transition-colors cursor-pointer"
            >
              {statusFilter === "violations" ? "Show All Students" : "Filter Violations"}
            </button>
          </div>
        )}

        {retakeNotice && (
          <div className="mx-4 sm:mx-6 mt-4 flex items-center gap-2 rounded-2xl border border-sage-border bg-sage-ghost px-4 py-3 text-xs font-semibold text-sage animate-in fade-in">
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span>{retakeNotice}</span>
          </div>
        )}

        {/* ── Filter Toolbar & View Switcher ────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-2 shrink-0">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: `All (${data?.students.length || 0})` },
              { id: "in_lobby", label: `In Lobby (${data?.counts.in_lobby || 0})` },
              { id: "taking", label: `Taking (${data?.counts.taking || 0})` },
              { id: "submitted", label: `Submitted (${data?.counts.submitted || 0})` },
              { id: "violations", label: `Violations (${violationStudents.length})` },
              { id: "offline", label: `Offline (${data?.counts.not_joined || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-steel text-white shadow-sm"
                    : "bg-surface-subtle text-text-muted hover:text-text-primary hover:bg-surface-muted"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search + View Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-border-default bg-surface-base px-3 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition-all w-36 sm:w-48"
            />
            <div className="flex items-center rounded-xl bg-surface-subtle p-0.5 border border-border-default">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "grid" ? "bg-surface-raised text-steel shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
                title="Student Cards Gallery"
              >
                Grid
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-surface-raised text-steel shadow-sm" : "text-text-muted hover:text-text-primary"
                }`}
                title="Detailed Audit Table"
              >
                Table
              </button>
            </div>
          </div>
        </div>

        {/* ── Main Content Body ─────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <SkeletonLiveRoster count={5} />
          ) : fetchError && !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-burgundy mb-2" />
              <p className="text-sm font-bold text-text-primary">Unable to load live exam monitor</p>
              <p className="text-xs text-text-muted max-w-sm mt-1">{fetchError}</p>
              <button
                type="button"
                onClick={() => fetchMonitor(true)}
                className="mt-4 rounded-xl bg-steel px-4 py-2 text-xs font-semibold text-white cursor-pointer hover:bg-steel-light"
              >
                Retry
              </button>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Users className="h-10 w-10 mx-auto mb-2 text-text-faint" />
              <p className="text-sm font-semibold">No students match current filter</p>
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs text-steel font-bold hover:underline cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : viewMode === "grid" ? (
            /* ── VISUAL STUDENT CARDS GALLERY ────────────────────────── */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredStudents.map((student) => {
                const hasViolations = student.tab_switches > 0 || student.fullscreen_exits > 0;
                const initials = student.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={student.student_id}
                    className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      hasViolations
                        ? "bg-burgundy-ghost/15 border-burgundy-border/60 hover:border-burgundy-border"
                        : student.status === "SUBMITTED"
                        ? "bg-sage-ghost/10 border-sage-border/50 hover:border-sage-border"
                        : student.status === "TAKING"
                        ? "bg-steel-ghost/15 border-steel-border/50 hover:border-steel-border shadow-sm"
                        : student.status === "IN_LOBBY"
                        ? "bg-tan-ghost/15 border-tan-border/50 hover:border-tan-border"
                        : "bg-surface-base border-border-default hover:border-border-emphasis"
                    }`}
                  >
                    {/* Top Row: Avatar + Info + Status */}
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold text-xs shadow-inner shrink-0 ${
                              student.status === "SUBMITTED"
                                ? "bg-sage-ghost text-sage border border-sage-border"
                                : student.status === "TAKING"
                                ? "bg-steel-ghost text-steel border border-steel-border"
                                : student.status === "IN_LOBBY"
                                ? "bg-tan-ghost text-tan border border-tan-border"
                                : "bg-surface-subtle text-text-muted border border-border-default"
                            }`}
                          >
                            {initials || "ST"}
                          </div>
                          <div>
                            <div className="font-bold text-sm text-text-primary leading-tight">
                              {student.name}
                            </div>
                            <div className="font-mono text-[10px] text-text-muted mt-0.5">
                              ID: {student.student_number}
                            </div>
                          </div>
                        </div>

                        {/* Status Pill */}
                        <div>
                          {student.status === "SUBMITTED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                              <CheckCircle2 className="h-3 w-3" />
                              Submitted
                            </span>
                          ) : student.status === "TAKING" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-steel-ghost px-2.5 py-0.5 text-[10px] font-bold text-steel border border-steel-border animate-pulse">
                              <Monitor className="h-3 w-3" />
                              Taking Exam
                            </span>
                          ) : student.status === "IN_LOBBY" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                              <Clock className="h-3 w-3" />
                              Ready in Lobby
                            </span>
                          ) : student.status === "DISCONNECTED" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-bold text-text-muted border border-border-default">
                              Disconnected
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-semibold text-text-faint border border-border-default">
                              Not Joined
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Proctoring & Integrity Health */}
                      <div className="space-y-2 py-2 border-t border-border-default/50 text-xs">
                        {/* Focus & Fullscreen status */}
                        {(student.status === "IN_LOBBY" || student.status === "TAKING") && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted flex items-center gap-1">
                              <Maximize2 className="h-3.5 w-3.5 text-text-faint" />
                              Screen:
                            </span>
                            <span
                              className={`font-semibold ${
                                student.is_fullscreen ? "text-sage" : "text-burgundy-light font-bold"
                              }`}
                            >
                              {student.is_fullscreen ? "Fullscreen Locked" : "Windowed"}
                            </span>
                          </div>
                        )}

                        {/* Live Answer progress if taking */}
                        {student.status === "TAKING" && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Progress:</span>
                            <span className="font-bold text-steel font-mono">
                              {student.answers?.length || 0} / {totalQuestions} answered
                            </span>
                          </div>
                        )}

                        {/* Score if submitted */}
                        {student.status === "SUBMITTED" && student.total_score !== null && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-text-muted">Final Score:</span>
                            <span className="font-bold text-sage font-mono text-sm">
                              {student.total_score} / {student.max_score || totalQuestions}
                              <span className="text-[10px] text-text-muted font-normal ml-1">
                                ({student.max_score ? Math.round((student.total_score / student.max_score) * 100) : 0}%)
                              </span>
                            </span>
                          </div>
                        )}

                        {/* Violation Indicator */}
                        {hasViolations && (
                          <div className="flex items-center justify-between rounded-xl bg-burgundy-ghost/50 border border-burgundy-border px-2.5 py-1 text-[10px] font-bold text-burgundy-light">
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {student.tab_switches} alt-tab{student.tab_switches === 1 ? "" : "s"}
                            </span>
                            {student.fullscreen_exits > 0 && (
                              <span>{student.fullscreen_exits} window exit{student.fullscreen_exits === 1 ? "" : "s"}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom Action Footer on Card */}
                    <div className="pt-3 mt-2 border-t border-border-default/50 flex items-center justify-end gap-1.5">
                      {student.status === "SUBMITTED" && student.answers && student.answers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForAnswers(student)}
                          className="inline-flex items-center gap-1 rounded-xl border border-steel-border bg-steel-ghost px-2.5 py-1 text-[11px] font-bold text-steel hover:bg-steel/20 transition-all cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Answers
                        </button>
                      )}

                      {(student.status === "SUBMITTED" || hasViolations || student.auto_submitted) && (
                        <button
                          type="button"
                          onClick={() => {
                            setResetCounters(true);
                            setRetakeTarget(student);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl border border-tan-border bg-tan-ghost px-2.5 py-1 text-[11px] font-bold text-tan hover:brightness-110 transition-all cursor-pointer"
                          title="Allow student another attempt"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Allow Retake
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ── DETAILED AUDIT TABLE VIEW ───────────────────────────── */
            <div className="overflow-x-auto rounded-2xl border border-border-default">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-base border-b border-border-default text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Screen / Focus Health</th>
                    <th className="py-3 px-4">Violations</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 bg-surface-overlay">
                  {filteredStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-surface-subtle/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-text-primary">{student.name}</div>
                        <div className="font-mono text-[10px] text-text-muted">
                          ID: {student.student_number}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {student.status === "SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                            <CheckCircle2 className="h-3 w-3" />
                            Submitted
                          </span>
                        ) : student.status === "TAKING" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-steel-ghost px-2.5 py-0.5 text-[10px] font-bold text-steel border border-steel-border animate-pulse">
                            <Monitor className="h-3 w-3" />
                            Taking Exam
                          </span>
                        ) : student.status === "IN_LOBBY" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                            <Clock className="h-3 w-3" />
                            In Lobby
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-base px-2 py-0.5 text-[10px] font-semibold text-text-faint border border-border-default">
                            {student.status === "DISCONNECTED" ? "Disconnected" : "Not Joined"}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {(student.status === "IN_LOBBY" || student.status === "TAKING") ? (
                          <span className={student.is_fullscreen ? "text-sage font-semibold" : "text-burgundy-light font-bold"}>
                            {student.is_fullscreen ? "Fullscreen" : "Windowed"} • {student.is_focused ? "Active" : "Unfocused"}
                          </span>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {student.tab_switches > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border text-burgundy-light bg-burgundy-ghost border-burgundy-border">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {student.tab_switches} alt-tab{student.tab_switches === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">0 violations</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {student.status === "SUBMITTED" ? (
                          <span className="font-bold text-sage">
                            {student.total_score} / {student.max_score || totalQuestions}
                          </span>
                        ) : (
                          <span className="text-text-faint">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {student.status === "SUBMITTED" && student.answers && student.answers.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedStudentForAnswers(student)}
                              className="rounded-lg border border-steel-border bg-steel-ghost px-2 py-1 text-xs font-bold text-steel hover:bg-steel/20 cursor-pointer"
                            >
                              Answers
                            </button>
                          )}
                          {(student.status === "SUBMITTED" || student.tab_switches > 0) && (
                            <button
                              type="button"
                              onClick={() => {
                                setResetCounters(true);
                                setRetakeTarget(student);
                              }}
                              className="rounded-lg border border-tan-border bg-tan-ghost px-2 py-1 text-xs font-bold text-tan hover:brightness-110 cursor-pointer"
                            >
                              Retake
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Footer note ────────────────────────────────────────────── */}
        <div className="p-4 border-t border-border-default bg-surface-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-muted shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-tan shrink-0" />
            <span>
              <strong>Lobby Workflow:</strong> Direct students to log in and enter the lobby. When students show <strong>Ready in Lobby</strong>, click <strong>Start Exam for Class</strong> to start simultaneously.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border-default bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer self-end sm:self-auto"
          >
            Close Monitor
          </button>
        </div>
      </div>

      {/* Sub-modal: Student Detailed Answers Viewer */}
      {selectedStudentForAnswers && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-border-default pb-4 shrink-0">
              <div>
                <span className="rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                  Online Submission
                </span>
                <h3 className="text-lg font-bold text-text-primary mt-1">
                  {selectedStudentForAnswers.name} ({selectedStudentForAnswers.student_number})
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Exam: {examTitle} • Score:{" "}
                  <strong className="text-sage font-bold">
                    {selectedStudentForAnswers.total_score} /{" "}
                    {selectedStudentForAnswers.max_score || totalQuestions}
                  </strong>{" "}
                  (
                  {selectedStudentForAnswers.max_score
                    ? Math.round(
                        (selectedStudentForAnswers.total_score! /
                          selectedStudentForAnswers.max_score) *
                          100
                      )
                    : 0}
                  %)
                </p>
                <p className="text-[11px] text-text-muted mt-1">
                  <span className={selectedStudentForAnswers.tab_switches > 0 ? "text-burgundy-light font-bold" : ""}>
                    {selectedStudentForAnswers.tab_switches} alt-tab{selectedStudentForAnswers.tab_switches === 1 ? "" : "s"}
                  </span>
                  {" • "}
                  {selectedStudentForAnswers.fullscreen_exits} fullscreen exit{selectedStudentForAnswers.fullscreen_exits === 1 ? "" : "s"}
                  {" • "}Attempt #{selectedStudentForAnswers.attempt_number}
                  {selectedStudentForAnswers.auto_submitted && (
                    <span className="text-burgundy-light font-bold"> • Auto-submitted (3 strikes)</span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForAnswers(null)}
                className="rounded-xl bg-surface-subtle p-2 text-text-secondary hover:text-text-primary cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-semibold text-text-secondary mb-2 flex items-center gap-1.5">
                <FileCheck2 className="h-4 w-4 text-steel" />
                Submitted Answer Sheet:
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {selectedStudentForAnswers.answers.map((ans) => (
                  <div
                    key={ans.question_number}
                    className={`rounded-xl border p-2.5 flex items-center justify-between text-xs ${
                      ans.is_correct
                        ? "border-sage-border bg-sage-ghost/50 text-sage"
                        : "border-burgundy-border bg-burgundy-ghost/50 text-burgundy-light"
                    }`}
                  >
                    <span className="font-mono font-bold text-text-secondary">
                      Q{ans.question_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="h-6 w-6 rounded-md bg-surface-base font-bold flex items-center justify-center border border-border-default font-mono">
                        {ans.shaded_option || "—"}
                      </span>
                      {ans.is_correct ? (
                        <CheckCircle2 className="h-4 w-4 text-sage" />
                      ) : (
                        <X className="h-4 w-4 text-burgundy-light" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border-default flex justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setResetCounters(true);
                  setRetakeTarget(selectedStudentForAnswers);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-tan-border bg-tan-ghost px-4 py-2 text-xs font-bold text-tan cursor-pointer hover:brightness-110"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Allow Retake
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentForAnswers(null)}
                className="rounded-xl gradient-bg-primary px-5 py-2 text-xs font-bold text-text-primary cursor-pointer hover:opacity-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Allow Retake confirmation */}
      {retakeTarget && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-tan-border bg-surface-overlay p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                <RotateCcw className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">Give {retakeTarget.name} another chance?</h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Their current submission
                  {retakeTarget.total_score !== null && (
                    <> (<strong className="text-text-secondary">{retakeTarget.total_score} / {retakeTarget.max_score || totalQuestions}</strong>)</>
                  )}{" "}
                  will be removed and they can re-enter the lobby to take the exam again as attempt #{retakeTarget.attempt_number + 1}.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl border border-border-default bg-surface-base p-2.5">
                <span className="block text-[10px] text-text-muted">Alt-tabs</span>
                <strong className={retakeTarget.tab_switches > 0 ? "text-burgundy-light" : "text-text-primary"}>
                  {retakeTarget.tab_switches}
                </strong>
              </div>
              <div className="rounded-xl border border-border-default bg-surface-base p-2.5">
                <span className="block text-[10px] text-text-muted">Fullscreen exits</span>
                <strong className="text-text-primary">{retakeTarget.fullscreen_exits}</strong>
              </div>
            </div>

            <label className="flex items-start gap-2.5 rounded-xl border border-border-default bg-surface-base p-3 cursor-pointer">
              <input
                id="retake-reset-counters"
                type="checkbox"
                checked={resetCounters}
                onChange={(e) => setResetCounters(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-(--color-tan,#c8a46e) cursor-pointer"
              />
              <span className="text-xs text-text-secondary">
                <strong className="text-text-primary block">Reset alt-tab &amp; fullscreen counters</strong>
                Uncheck to carry the current counts into the new attempt.
              </span>
            </label>

            <p className="text-[11px] text-text-muted">
              {data?.is_online_active
                ? data.is_started
                  ? "The exam is live — the student will go straight into the exam when they rejoin."
                  : "The lobby is open — the student can rejoin and wait for you to start."
                : "Open the lobby (enable the online quiz) so the student can rejoin."}
            </p>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setRetakeTarget(null)}
                disabled={grantingRetake}
                className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-allow-retake"
                onClick={handleAllowRetake}
                disabled={grantingRetake}
                className="inline-flex items-center gap-1.5 rounded-xl bg-tan px-4 py-2 text-xs font-bold text-white hover:brightness-110 cursor-pointer disabled:opacity-60"
              >
                {grantingRetake ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                Allow Retake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
