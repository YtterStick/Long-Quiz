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
      console.error("Failed to fetch exam monitor data:", err);
      const msg = err instanceof Error ? err.message : "Failed to load live roster";
      setFetchError(msg);
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

  const totalTabSwitches = data?.students.reduce((sum, s) => sum + (s.tab_switches || 0), 0) ?? 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl border border-border-default bg-surface-overlay shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-border-default bg-surface-base shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="rounded-full bg-steel/15 px-2.5 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30">
                Class: {sectionName}
              </span>
              {data?.is_started ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border animate-pulse">
                  <Play className="h-3 w-3 fill-sage" />
                  Exam In Progress (Live)
                </span>
              ) : data?.is_online_active ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                  <Clock className="h-3 w-3" />
                  Lobby Open • Waiting for Start
                </span>
              ) : (
                <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold text-text-muted border border-border-default">
                  Quiz Inactive
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-text-primary mt-1.5 flex items-center gap-2">
              <Monitor className="h-5 w-5 text-steel" />
              {examTitle}
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Live proctoring dashboard, lobby presence, real-time student activity & submitted answers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => fetchMonitor(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
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
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer shadow-md ${
                  data.is_started
                    ? "bg-burgundy text-white hover:bg-burgundy-light shadow-burgundy/20"
                    : "gradient-bg-primary text-text-primary hover:opacity-95 shadow-steel/20"
                }`}
              >
                {togglingStart ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : data.is_started ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause / Close Exam
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 fill-current" />
                    Release & Start Exam for Class
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Live Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 sm:p-5 bg-surface-base/50 border-b border-border-default text-xs shrink-0">
          <div className="rounded-xl border border-border-default bg-surface-base p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-muted block font-medium">In Lobby (Ready)</span>
              <strong className="text-base font-bold text-tan">
                {data?.counts.in_lobby || 0}{" "}
                <span className="text-[10px] text-text-muted font-normal">
                  ({data?.counts.ready || 0} locked fullscreen)
                </span>
              </strong>
            </div>
            <div className="h-8 w-8 rounded-lg bg-tan-ghost flex items-center justify-center text-tan">
              <Clock className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-xl border border-border-default bg-surface-base p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-muted block font-medium">Currently Taking</span>
              <strong className="text-base font-bold text-steel">
                {data?.counts.taking || 0}
              </strong>
            </div>
            <div className="h-8 w-8 rounded-lg bg-steel-ghost flex items-center justify-center text-steel">
              <Monitor className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-xl border border-border-default bg-surface-base p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-muted block font-medium">Submitted</span>
              <strong className="text-base font-bold text-sage">
                {data?.counts.submitted || 0}{" "}
                <span className="text-[10px] text-text-muted font-normal">
                  / {data?.total_students || 0}
                </span>
              </strong>
            </div>
            <div className="h-8 w-8 rounded-lg bg-sage-ghost flex items-center justify-center text-sage">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>

          <div className="rounded-xl border border-border-default bg-surface-base p-3 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-text-muted block font-medium">Not Joined</span>
              <strong className="text-base font-bold text-text-muted">
                {data?.counts.not_joined || 0}
              </strong>
            </div>
            <div className="h-8 w-8 rounded-lg bg-surface-subtle flex items-center justify-center text-text-muted">
              <Users className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center py-16 text-text-muted">
              <Loader2 className="h-8 w-8 animate-spin text-steel mb-3" />
              <p className="text-xs">Loading live class exam roster...</p>
            </div>
          ) : fetchError && !data ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-10 w-10 text-burgundy mb-2" />
              <p className="text-sm font-bold text-text-primary">Unable to load live exam monitor</p>
              <p className="text-xs text-text-muted max-w-sm mt-1">{fetchError}</p>
              <button
                type="button"
                onClick={() => fetchMonitor(true)}
                className="mt-4 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary cursor-pointer hover:opacity-95"
              >
                Retry
              </button>
            </div>
          ) : !data || data.students.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              <Users className="h-12 w-12 mx-auto mb-2 text-text-faint" />
              <p className="text-sm font-semibold">No students enrolled in this section</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted px-1">
                <span>
                  Roster ({data.students.length} Students)
                  {totalTabSwitches > 0 && (
                    <span className="ml-2 text-burgundy-light font-semibold">
                      • {totalTabSwitches} total alt-tab{totalTabSwitches > 1 ? "s" : ""} in class
                    </span>
                  )}
                </span>
                <span className="text-[11px] flex items-center gap-1.5">
                  <span className="inline-block h-2 w-2 rounded-full bg-sage animate-ping" />
                  Live sync active
                </span>
              </div>

              {retakeNotice && (
                <div className="flex items-center gap-2 rounded-xl border border-sage-border bg-sage-ghost px-3 py-2 text-xs font-semibold text-sage animate-in fade-in">
                  <RotateCcw className="h-3.5 w-3.5" />
                  {retakeNotice}
                </div>
              )}

              <div className="overflow-x-auto rounded-xl border border-border-default">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-base border-b border-border-default text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Integrity / Screen</th>
                      <th className="py-3 px-4">Alt-Tabs / Fullscreen Exits</th>
                      <th className="py-3 px-4">Score / Submitted</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default/50 bg-surface-overlay">
                    {data.students.map((student) => {
                      return (
                        <tr key={student.student_id} className="hover:bg-surface-subtle/40 transition-colors">
                          {/* Student Info */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-text-primary">{student.name}</div>
                            <div className="font-mono text-[10px] text-text-muted">
                              ID: {student.student_number}
                            </div>
                          </td>

                          {/* Live Status Badge */}
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
                                In Lobby (Ready)
                              </span>
                            ) : student.status === "DISCONNECTED" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-bold text-text-muted border border-border-default">
                                Disconnected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-surface-base px-2.5 py-0.5 text-[10px] font-semibold text-text-faint border border-border-default">
                                Not Joined
                              </span>
                            )}
                            {(student.attempt_number > 1 || student.auto_submitted) && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {student.attempt_number > 1 && (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-steel-ghost px-1.5 py-0.5 text-[9px] font-bold text-steel border border-steel-border">
                                    <RotateCcw className="h-2.5 w-2.5" />
                                    Attempt #{student.attempt_number}
                                  </span>
                                )}
                                {student.auto_submitted && (
                                  <span className="inline-flex items-center gap-0.5 rounded-md bg-burgundy-ghost px-1.5 py-0.5 text-[9px] font-bold text-burgundy-light border border-burgundy-border">
                                    <Zap className="h-2.5 w-2.5" />
                                    Auto-submitted
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {student.status === "IN_LOBBY" || student.status === "TAKING" ? (
                              <div className="flex items-center gap-2">
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                    student.is_fullscreen ? "text-sage" : "text-burgundy-light"
                                  }`}
                                  title={student.is_fullscreen ? "Fullscreen Locked" : "Not in Fullscreen"}
                                >
                                  <Maximize2 className="h-3.5 w-3.5" />
                                  {student.is_fullscreen ? "Fullscreen" : "Windowed"}
                                </span>
                                <span>•</span>
                                <span
                                  className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                                    student.is_focused ? "text-sage" : "text-burgundy-light"
                                  }`}
                                  title={student.is_focused ? "Tab Focused" : "Tab Switched Away / Blurred"}
                                >
                                  {student.is_focused ? (
                                    <ShieldCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <ShieldAlert className="h-3.5 w-3.5" />
                                  )}
                                  {student.is_focused ? "Active" : "Unfocused"}
                                </span>
                              </div>
                            ) : student.status === "SUBMITTED" ? (
                              <span className="text-[11px] text-text-muted flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                                Completed
                              </span>
                            ) : (
                              <span className="text-[11px] text-text-faint">—</span>
                            )}
                          </td>

                          {/* Alt-Tab & Fullscreen Exit Counts */}
                          <td className="py-3 px-4">
                            <div className="flex flex-col gap-1">
                              <span
                                className={`inline-flex w-fit items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-lg border ${
                                  student.tab_switches > 0
                                    ? "text-burgundy-light bg-burgundy-ghost border-burgundy-border"
                                    : "text-text-muted bg-surface-base border-border-default"
                                }`}
                                title="Times the student Alt-Tabbed / switched away from the exam window"
                              >
                                {student.tab_switches > 0 && <AlertTriangle className="h-3.5 w-3.5" />}
                                {student.tab_switches} alt-tab{student.tab_switches === 1 ? "" : "s"}
                              </span>
                              <span
                                className={`text-[10px] ${
                                  student.fullscreen_exits > 0 ? "text-tan font-semibold" : "text-text-faint"
                                }`}
                              >
                                {student.fullscreen_exits} fullscreen exit{student.fullscreen_exits === 1 ? "" : "s"}
                              </span>
                            </div>
                          </td>

                          {/* Score & Timestamp */}
                          <td className="py-3 px-4">
                            {student.status === "SUBMITTED" ? (
                              <div>
                                <span className="font-bold text-text-primary text-xs">
                                  {student.total_score} / {student.max_score || totalQuestions}
                                </span>{" "}
                                <span className="text-text-muted font-mono text-[10px]">
                                  (
                                  {student.max_score
                                    ? Math.round((student.total_score! / student.max_score) * 100)
                                    : 0}
                                  %)
                                </span>
                                {student.submitted_at && (
                                  <div className="text-[10px] text-text-muted">
                                    {new Date(student.submitted_at).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      second: "2-digit",
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-faint">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            {student.status === "SUBMITTED" ? (
                              <div className="inline-flex items-center gap-1.5">
                                {student.answers && student.answers.length > 0 && (
                                  <button
                                    type="button"
                                    id={`view-answers-${student.student_id}`}
                                    onClick={() => setSelectedStudentForAnswers(student)}
                                    className="inline-flex items-center gap-1.5 rounded-lg border border-steel-border bg-steel/15 px-2.5 py-1 text-xs font-bold text-steel-light hover:bg-steel/25 transition-all cursor-pointer"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                    Answers
                                  </button>
                                )}
                                <button
                                  type="button"
                                  id={`allow-retake-${student.student_id}`}
                                  onClick={() => {
                                    setResetCounters(true);
                                    setRetakeTarget(student);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-tan-border bg-tan-ghost px-2.5 py-1 text-xs font-bold text-tan hover:brightness-110 transition-all cursor-pointer"
                                  title="Give this student another chance to take the exam"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Allow Retake
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-text-faint">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer info note */}
        <div className="p-4 border-t border-border-default bg-surface-base flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-text-muted shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-tan shrink-0" />
            <span>
              <strong>Lobby Flow:</strong> Direct students to log in and click <em>Enter Exam Lobby</em>. When everyone is in fullscreen mode, click <strong>Release & Start Exam</strong> to start all tests together.
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer self-end sm:self-auto"
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
