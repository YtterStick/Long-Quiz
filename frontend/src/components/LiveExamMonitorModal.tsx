"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
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
  Lock,
  Unlock,
  PowerOff,
  FileSpreadsheet,
  Copy,
  Check,
  UserCheck,
  UserX,
} from "lucide-react";
import { SkeletonLiveRoster } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  is_lobby_locked?: boolean;
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

  // Exam controls: Pause vs End vs Lock
  const [togglingStart, setTogglingStart] = useState(false);
  const [lockingLobby, setLockingLobby] = useState(false);
  const [endingExam, setEndingExam] = useState(false);
  const [endExamConfirmOpen, setEndExamConfirmOpen] = useState(false);

  // Excel / Clipboard states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [copiedClipboard, setCopiedClipboard] = useState(false);

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
        setFetchError((prev) => (data ? prev : msg));
      }
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [sectionId, examId, onStatusChanged, data]);

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

  // Pause Exam (freezes students, leaves online active so teacher can resume)
  const handlePauseExam = async () => {
    if (!data) return;
    setTogglingStart(true);
    try {
      const res = await teacherApi.startSectionExam(sectionId, examId, false);
      setData((prev) => (prev ? { ...prev, is_started: false } : prev));
      if (onStatusChanged) {
        onStatusChanged(res.is_online_active, false);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to pause exam");
    } finally {
      setTogglingStart(false);
    }
  };

  // Resume or Start Exam
  const handleResumeOrStartExam = async () => {
    if (!data) return;
    setTogglingStart(true);
    try {
      const res = await teacherApi.startSectionExam(sectionId, examId, true);
      setData((prev) => (prev ? { ...prev, is_started: true } : prev));
      if (onStatusChanged) {
        onStatusChanged(res.is_online_active, true);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to start exam");
    } finally {
      setTogglingStart(false);
    }
  };

  // Lock Lobby (blocks latecomers from taking)
  const handleToggleLockLobby = async () => {
    if (!data) return;
    const nextLocked = !data.is_lobby_locked;
    setLockingLobby(true);
    try {
      const res = await teacherApi.toggleLockLobby(sectionId, examId, nextLocked);
      setData((prev) => (prev ? { ...prev, is_lobby_locked: res.is_lobby_locked } : prev));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle lobby lock");
    } finally {
      setLockingLobby(false);
    }
  };

  // End Exam (auto disables online quiz access, finalizes exam session)
  const handleConfirmEndExam = async () => {
    setEndExamConfirmOpen(false);
    setEndingExam(true);
    try {
      await teacherApi.endSectionExam(sectionId, examId);
      setData((prev) =>
        prev
          ? {
              ...prev,
              is_started: false,
              is_online_active: false,
              is_lobby_locked: true,
            }
          : prev
      );
      if (onStatusChanged) {
        onStatusChanged(false, false);
      }
      setRetakeNotice("Exam ended. Online quiz access has been disabled for this class.");
      setTimeout(() => setRetakeNotice(null), 5000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to end exam");
    } finally {
      setEndingExam(false);
    }
  };

  // Export complete records including absent students to Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const cleanSec = sectionName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanExam = examTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
      await teacherApi.downloadSectionExamExcel(sectionId, examId, `Gradebook_${cleanSec}_${cleanExam}.xlsx`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export Excel file");
    } finally {
      setExportingExcel(false);
    }
  };

  // Copy records formatted for Excel / Sheets
  const handleCopyForExcel = async () => {
    if (!data || !data.students) return;
    const headers = [
      "No.",
      "Student ID",
      "Student Name",
      "Attendance",
      "Status",
      "Score",
      "Max Score",
      "Violations",
      "Submitted At"
    ];
    const rows = data.students.map((s, idx) => {
      const isAbsent = s.status === "NOT_JOINED";
      const attendance = isAbsent ? "ABSENT" : "PRESENT";
      const score = s.status === "SUBMITTED" ? (s.total_score ?? 0) : 0;
      const subAt = s.submitted_at ? new Date(s.submitted_at).toLocaleString() : "-";
      return [
        idx + 1,
        `02000${String(s.student_number).padStart(6, "0")}`,
        s.name,
        attendance,
        s.status,
        score,
        s.max_score || totalQuestions,
        s.violations,
        subAt
      ].join("\t");
    });
    const tsv = [headers.join("\t"), ...rows].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 2500);
    } catch {
      alert("Unable to copy to clipboard automatically. Try exporting to Excel.");
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
  const [statusFilter, setStatusFilter] = useState<
    "all" | "present" | "absent" | "in_lobby" | "taking" | "submitted" | "violations"
  >("all");

  const totalTabSwitches = data?.students.reduce((sum, s) => sum + (s.tab_switches || 0), 0) ?? 0;
  const totalFullscreenExits = data?.students.reduce((sum, s) => sum + (s.fullscreen_exits || 0), 0) ?? 0;
  const violationStudents = data?.students.filter((s) => s.tab_switches > 0 || s.fullscreen_exits > 0) ?? [];

  const presentCount = (data?.students ?? []).filter((s) => s.status !== "NOT_JOINED").length;
  const absentCount = (data?.students ?? []).filter((s) => s.status === "NOT_JOINED").length;

  // Filtered Students list
  const filteredStudents = useMemo(() => {
    return (data?.students ?? []).filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(s.student_number).includes(searchQuery);

      if (!matchesSearch) return false;

      if (statusFilter === "present") return s.status !== "NOT_JOINED";
      if (statusFilter === "absent") return s.status === "NOT_JOINED";
      if (statusFilter === "in_lobby") return s.status === "IN_LOBBY";
      if (statusFilter === "taking") return s.status === "TAKING";
      if (statusFilter === "submitted") return s.status === "SUBMITTED";
      if (statusFilter === "violations") return s.tab_switches > 0 || s.fullscreen_exits > 0;
      return true;
    });
  }, [data?.students, searchQuery, statusFilter]);

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
                  <Pause className="h-3 w-3" />
                  Exam Paused / Waiting in Lobby
                </span>
              ) : (
                <span className="rounded-full bg-burgundy-ghost px-3 py-0.5 text-[11px] font-bold text-burgundy-light border border-burgundy-border">
                  Exam Ended / Closed
                </span>
              )}

              {data?.is_lobby_locked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[10px] font-bold">
                  <Lock className="h-3 w-3" />
                  Lobby Locked
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary flex items-center gap-2">
              <Monitor className="h-5 w-5 text-steel" />
              {examTitle}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Live attendance, proctored focus detection, and instant section records.
            </p>
          </div>

          {/* Action Button Controls */}
          <div className="flex items-center flex-wrap gap-2">
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

            {/* Lock Lobby Button */}
            {data?.is_online_active && (
              <button
                type="button"
                onClick={handleToggleLockLobby}
                disabled={lockingLobby}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  data.is_lobby_locked
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30"
                    : "bg-surface-subtle text-text-secondary border-border-default hover:bg-surface-muted hover:text-text-primary"
                }`}
                title={data.is_lobby_locked ? "Click to unlock lobby for late students" : "Lock lobby to block latecomers"}
              >
                {lockingLobby ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : data.is_lobby_locked ? (
                  <>
                    <Lock className="h-3.5 w-3.5 text-amber-400" />
                    <span>Lobby Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5 text-text-muted" />
                    <span>Lock Lobby</span>
                  </>
                )}
              </button>
            )}

            {/* Separate Pause & End Exam Controls */}
            {data?.is_online_active && (
              <>
                {data.is_started ? (
                  <button
                    type="button"
                    onClick={handlePauseExam}
                    disabled={togglingStart}
                    className="flex items-center gap-1.5 rounded-xl bg-tan-ghost text-tan border border-tan-border hover:bg-tan/20 px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                    title="Pause exam timer and questions for all students"
                  >
                    {togglingStart ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Pause Exam</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleResumeOrStartExam}
                    disabled={togglingStart}
                    className="flex items-center gap-1.5 rounded-xl bg-steel text-white hover:bg-steel-light px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-steel/25 active:scale-95"
                  >
                    {togglingStart ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>
                          {data.counts.taking > 0 || data.counts.submitted > 0
                            ? "Resume Exam"
                            : `Start Exam (${data.counts.in_lobby}/${data.total_students} Ready)`}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setEndExamConfirmOpen(true)}
                  disabled={endingExam}
                  className="flex items-center gap-1.5 rounded-xl bg-burgundy text-white hover:bg-burgundy-light px-3.5 py-2 text-xs font-bold transition-all cursor-pointer shadow-lg shadow-burgundy/25 active:scale-95"
                  title="Conclude exam and auto-disable online quiz"
                >
                  {endingExam ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <PowerOff className="h-3.5 w-3.5" />
                      <span>End Exam</span>
                    </>
                  )}
                </button>
              </>
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
                  title={`Offline / Absent: ${data?.counts.not_joined} (${offlinePercent}%)`}
                />
              )}
            </div>
          </div>

          {/* Metric Chips with Present vs Absent */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            <div
              onClick={() => setStatusFilter("present")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "present"
                  ? "border-sage bg-sage-ghost shadow-sm"
                  : "border-border-default bg-surface-base hover:border-sage-border"
              }`}
            >
              <div>
                <span className="text-[11px] text-sage block font-bold">Present in Session</span>
                <strong className="text-lg font-black text-sage">
                  {presentCount}{" "}
                  <span className="text-[10px] text-text-muted font-normal">
                    / {data?.total_students || 0}
                  </span>
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-sage-ghost text-sage border border-sage-border flex items-center justify-center">
                <UserCheck className="h-4 w-4" />
              </div>
            </div>

            <div
              onClick={() => setStatusFilter("absent")}
              className={`rounded-2xl border p-3 flex items-center justify-between cursor-pointer transition-all ${
                statusFilter === "absent"
                  ? "border-burgundy-border bg-burgundy-ghost shadow-sm"
                  : "border-border-default bg-surface-base hover:border-burgundy-border"
              }`}
            >
              <div>
                <span className="text-[11px] text-burgundy-light block font-bold">Absent (Marked 0)</span>
                <strong className="text-lg font-black text-burgundy-light">
                  {absentCount}
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-burgundy-ghost text-burgundy-light border border-burgundy-border flex items-center justify-center">
                <UserX className="h-4 w-4" />
              </div>
            </div>

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
                    ({data?.counts.ready || 0} ready)
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
                  {data?.counts.submitted || 0}
                </strong>
              </div>
              <div className="h-8 w-8 rounded-xl bg-sage-ghost text-sage border border-sage-border flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Lobby Lock Alert Banner ──────────────── */}
        {data?.is_lobby_locked && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2.5 text-amber-300 font-semibold">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Lobby Locked:</strong> Late students who are not already inside the lobby will be blocked from joining this exam.
              </span>
            </div>
            <button
              type="button"
              onClick={handleToggleLockLobby}
              className="shrink-0 text-[11px] font-bold text-amber-300 underline hover:text-white transition-colors cursor-pointer"
            >
              Unlock Lobby
            </button>
          </div>
        )}

        {/* ── Active Incident / Violation Alert Banner ──────────────── */}
        {violationStudents.length > 0 && (
          <div className="mx-4 sm:mx-6 mt-3 p-3 rounded-2xl bg-burgundy-ghost border border-burgundy-border text-xs flex items-center justify-between gap-3 animate-in fade-in">
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
          <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-2 rounded-2xl border border-sage-border bg-sage-ghost px-4 py-2.5 text-xs font-semibold text-sage animate-in fade-in">
            <RotateCcw className="h-4 w-4 shrink-0" />
            <span>{retakeNotice}</span>
          </div>
        )}

        {/* ── Filter Toolbar, Search, & Export Tools ────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 sm:px-6 pt-3 pb-2 shrink-0">
          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: "all", label: `All (${data?.students.length || 0})` },
              { id: "present", label: `Present (${presentCount})` },
              { id: "absent", label: `Absent (${absentCount})` },
              { id: "in_lobby", label: `In Lobby (${data?.counts.in_lobby || 0})` },
              { id: "taking", label: `Taking (${data?.counts.taking || 0})` },
              { id: "submitted", label: `Submitted (${data?.counts.submitted || 0})` },
              { id: "violations", label: `Violations (${violationStudents.length})` },
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

          {/* Search + View Toggle + Excel Tools */}
          <div className="flex items-center flex-wrap gap-2">
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl border border-border-default bg-surface-base px-3 py-1.5 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition-all w-32 sm:w-44"
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

            {/* Excel & Copy Tools */}
            <button
              type="button"
              onClick={handleCopyForExcel}
              className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              title="Copy records to clipboard for Excel / Google Sheets"
            >
              {copiedClipboard ? (
                <>
                  <Check className="h-3.5 w-3.5 text-sage" />
                  <span className="text-sage font-bold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-tan" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="flex items-center gap-1.5 rounded-xl bg-sage-ghost text-sage border border-sage-border hover:bg-sage/20 px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
              title="Download full class gradebook (.xlsx) including absent students"
            >
              {exportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-sage" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5 text-sage" />
              )}
              <span>Export Excel</span>
            </button>
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
            /* ── STUDENT CARDS GRID ──────────────────────────────────── */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map((student) => {
                const hasViolations = student.tab_switches > 0 || student.fullscreen_exits > 0;
                const isAbsent = student.status === "NOT_JOINED";
                const initials = student.name
                  .split(" ")
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <div
                    key={student.student_id}
                    className={`rounded-2xl p-4 border transition-all relative flex flex-col justify-between ${
                      isAbsent
                        ? "bg-burgundy-ghost/10 border-burgundy-border/40 hover:border-burgundy-border"
                        : hasViolations
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
                              isAbsent
                                ? "bg-burgundy-ghost text-burgundy-light border border-burgundy-border"
                                : student.status === "SUBMITTED"
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
                              ID: 02000{String(student.student_number).padStart(6, "0")}
                            </div>
                          </div>
                        </div>

                        {/* Status Pill */}
                        <div>
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-ghost px-2.5 py-0.5 text-[10px] font-bold text-burgundy-light border border-burgundy-border">
                              <UserX className="h-3 w-3" />
                              ABSENT (0)
                            </span>
                          ) : student.status === "SUBMITTED" ? (
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
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2 py-0.5 text-[10px] font-bold text-text-muted border border-border-default">
                              Disconnected
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Proctoring & Integrity Health */}
                      <div className="space-y-2 py-2 border-t border-border-default/50 text-xs">
                        {isAbsent ? (
                          <div className="flex items-center justify-between text-[11px] text-burgundy-light font-semibold">
                            <span>Exam Score:</span>
                            <span className="font-mono font-bold">0 / {totalQuestions} (Did not attend)</span>
                          </div>
                        ) : (
                          <>
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
                                  <span>{student.fullscreen_exits} exit{student.fullscreen_exits === 1 ? "" : "s"}</span>
                                )}
                              </div>
                            )}
                          </>
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
                    <th className="py-3 px-4 text-center">Attendance</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4">Screen / Focus Health</th>
                    <th className="py-3 px-4">Violations</th>
                    <th className="py-3 px-4">Score</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/50 bg-surface-overlay">
                  {filteredStudents.map((student) => {
                    const isAbsent = student.status === "NOT_JOINED";
                    return (
                      <tr
                        key={student.student_id}
                        className={`hover:bg-surface-subtle/40 transition-colors ${
                          isAbsent ? "bg-burgundy-ghost/10" : ""
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-text-primary">{student.name}</div>
                          <div className="font-mono text-[10px] text-text-muted">
                            ID: 02000{String(student.student_number).padStart(6, "0")}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-center">
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-ghost px-2.5 py-0.5 text-[10px] font-bold text-burgundy-light border border-burgundy-border">
                              <UserX className="h-3 w-3" />
                              ABSENT
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                              <UserCheck className="h-3 w-3" />
                              PRESENT
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isAbsent ? (
                            <span className="text-text-faint text-[11px]">Did not attend</span>
                          ) : student.status === "SUBMITTED" ? (
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
                              Disconnected
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isAbsent ? (
                            <span className="text-text-faint">—</span>
                          ) : (student.status === "IN_LOBBY" || student.status === "TAKING") ? (
                            <span className={student.is_fullscreen ? "text-sage font-semibold" : "text-burgundy-light font-bold"}>
                              {student.is_fullscreen ? "Fullscreen" : "Windowed"} • {student.is_focused ? "Active" : "Unfocused"}
                            </span>
                          ) : (
                            <span className="text-text-faint">—</span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          {isAbsent ? (
                            <span className="text-text-faint">—</span>
                          ) : student.tab_switches > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border text-burgundy-light bg-burgundy-ghost border-burgundy-border">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {student.tab_switches} alt-tab{student.tab_switches === 1 ? "" : "s"}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">0 violations</span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono">
                          {isAbsent ? (
                            <span className="font-bold text-burgundy-light">0 / {totalQuestions}</span>
                          ) : student.status === "SUBMITTED" ? (
                            <span className="font-bold text-sage">
                              {student.total_score} / {student.max_score || totalQuestions}
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px]">In progress</span>
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
                    );
                  })}
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
              <strong>Lobby Workflow:</strong> Direct students to log in and join the lobby. Lock the lobby when class starts to block latecomers.
            </span>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel}
              className="rounded-xl border border-sage-border bg-sage-ghost px-3 py-1.5 text-xs font-bold text-sage hover:bg-sage/20 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Export Roster to Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-default bg-surface-subtle px-4 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Close Monitor
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modal: End Exam Confirmation */}
      <ConfirmModal
        isOpen={endExamConfirmOpen}
        title="End Exam Session Confirmation"
        message={`Are you sure you want to end "${examTitle}" for section "${sectionName}"? This will auto-disable the online quiz for this class, lock the lobby, and finalize student records.`}
        confirmText="Yes, End Exam"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleConfirmEndExam}
        onCancel={() => setEndExamConfirmOpen(false)}
      />

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
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForAnswers(null)}
                className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 p-1 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {selectedStudentForAnswers.answers.map((ans) => (
                  <div
                    key={ans.question_number}
                    className={`flex items-center justify-between rounded-xl p-2.5 border ${
                      ans.is_correct
                        ? "bg-sage-ghost border-sage-border text-sage"
                        : ans.shaded_option === null
                        ? "bg-surface-subtle border-border-default text-text-muted"
                        : "bg-burgundy-ghost border-burgundy-border text-burgundy-light"
                    }`}
                  >
                    <span className="font-bold text-text-muted">Q{ans.question_number}</span>
                    <div className="flex items-center gap-1.5 font-bold">
                      <span>{ans.shaded_option || "BLANK"}</span>
                      {ans.is_correct ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                      ) : (
                        <AlertTriangle className="h-3.5 w-3.5 text-burgundy-light" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-border-default flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedStudentForAnswers(null)}
                className="rounded-xl bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-modal: Retake Confirmation Dialog */}
      {retakeTarget && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-border-default pb-3">
              <div className="flex items-center gap-2 text-tan">
                <RotateCcw className="h-5 w-5" />
                <h3 className="text-base font-bold text-text-primary">Grant Student Retake</h3>
              </div>
              <button
                type="button"
                onClick={() => setRetakeTarget(null)}
                className="rounded-xl bg-surface-subtle p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-text-secondary leading-relaxed">
              <p>
                You are about to allow <strong className="text-text-primary">{retakeTarget.name}</strong> to retake this exam.
              </p>
              <div className="rounded-xl bg-surface-base border border-border-default p-3 space-y-1.5 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-text-muted">Current status:</span>
                  <span className="font-bold text-text-primary">{retakeTarget.status}</span>
                </div>
                {retakeTarget.total_score !== null && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Previous score:</span>
                    <span className="font-bold text-sage">
                      {retakeTarget.total_score} / {retakeTarget.max_score || totalQuestions}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Violations recorded:</span>
                  <span className="font-bold text-burgundy-light">
                    {retakeTarget.tab_switches} alt-tabs • {retakeTarget.fullscreen_exits} exits
                  </span>
                </div>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={resetCounters}
                  onChange={(e) => setResetCounters(e.target.checked)}
                  className="rounded border-border-emphasis bg-surface-base text-steel focus:ring-steel h-4 w-4"
                />
                <span className="text-xs text-text-primary font-medium">
                  Reset alt-tab and fullscreen violation counters for the new attempt
                </span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
              <button
                type="button"
                onClick={() => setRetakeTarget(null)}
                className="rounded-xl border border-border-default bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAllowRetake}
                disabled={grantingRetake}
                className="rounded-xl bg-tan text-white hover:brightness-110 px-4 py-2 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {grantingRetake ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Granting...</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Confirm &amp; Allow Retake</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
