"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  FileSpreadsheet,
  RefreshCw,
  Users,
  UserCheck,
  UserX,
  Award,
  Search,
  CheckCircle2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Download,
} from "lucide-react";
import { teacher as teacherApi } from "@/lib/api";

interface GradebookRecord {
  student_id: string;
  student_number: number;
  full_student_id: string;
  student_name: string;
  status: "GRADED" | "ABSENT";
  score: number;
  max_score: number;
  percentage: number;
  scanned_at: string | null;
  submission_id: string | null;
  scanned_image_url: string | null;
  is_published: boolean;
}

interface GradebookData {
  section_id: string;
  section_name: string;
  subject: string;
  exam_id: string;
  exam_title: string;
  total_questions: number;
  total_enrolled: number;
  graded_count: number;
  absent_count: number;
  class_average: number;
  average_percentage: number;
  records: GradebookRecord[];
}

interface SectionGradebookModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionId: string;
  sectionName: string;
  examId: string;
  examTitle: string;
}

export function SectionGradebookModal({
  isOpen,
  onClose,
  sectionId,
  sectionName,
  examId,
  examTitle,
}: SectionGradebookModalProps) {
  const [mounted, setMounted] = useState(false);
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GRADED" | "ABSENT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const loadGradebook = useCallback(
    async (isManual = false) => {
      if (!sectionId || !examId) return;
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const data = await teacherApi.getSectionExamGradebook(sectionId, examId);
        setGradebook(data as unknown as GradebookData);
      } catch (err) {
        console.error("Failed to load section gradebook:", err);
        setError(err instanceof Error ? err.message : "Failed to load gradebook records");
      } finally {
        setLoading(false);
        if (isManual) setRefreshing(false);
      }
    },
    [sectionId, examId]
  );

  useEffect(() => {
    if (!isOpen) return;

    loadGradebook();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, loadGradebook, onClose]);

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const cleanSec = sectionName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanExam = examTitle.replace(/[^a-zA-Z0-9_-]/g, "_");
      await teacherApi.downloadSectionExamExcel(
        sectionId,
        examId,
        `Gradebook_${cleanSec}_${cleanExam}.xlsx`
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to export Excel gradebook");
    } finally {
      setExportingExcel(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!gradebook?.records) return [];
    return gradebook.records.filter((rec) => {
      if (statusFilter !== "ALL" && rec.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = rec.student_name.toLowerCase().includes(q);
        const matchesId =
          rec.full_student_id.toLowerCase().includes(q) ||
          String(rec.student_number).includes(q);
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  }, [gradebook?.records, statusFilter, searchQuery]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="relative w-full max-w-5xl max-h-[94vh] rounded-3xl bg-[#ffffff] dark:bg-[#141d26] border border-border-default shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-5 sm:p-6 border-b border-border-default/80 bg-surface-base shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="rounded-full bg-steel-ghost px-2.5 py-0.5 text-[11px] font-bold text-steel border border-steel-border">
                Section: {sectionName}
              </span>
              <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-[11px] font-bold text-tan border border-tan-border">
                Exam: {examTitle}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary flex items-center gap-2 truncate">
              <FileSpreadsheet className="h-5 w-5 text-tan shrink-0" />
              <span>Section Gradebook &amp; Attendance Records</span>
            </h2>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Complete roster for {sectionName} • {examTitle}. Students who didn&apos;t submit are marked as 0 with{" "}
              <span className="text-burgundy-light font-bold">ABSENT</span> status.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Convert / Export to Excel Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="flex items-center gap-2 rounded-xl border border-sage-border bg-sage-ghost px-3.5 py-2 text-xs font-bold text-sage hover:bg-sage/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Download official gradebook spreadsheet (.xlsx) with all students"
            >
              {exportingExcel ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-sage" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4 text-sage" />
                  <span>Export to Excel (.xlsx)</span>
                </>
              )}
            </button>

            {/* Refresh */}
            <button
              type="button"
              onClick={() => loadGradebook(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-subtle px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
              title="Refresh gradebook records"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing || loading ? "animate-spin text-tan" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
              title="Close Gradebook"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* ── Scrollable Body ────────────────────────────────────────── */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6">
          {error && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-burgundy-ghost border border-burgundy-border p-4 text-xs text-burgundy-light">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 4 Stat Cards */}
          {gradebook && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
              <div className="rounded-2xl border border-border-default bg-surface-base p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-medium">
                  <span>Total Enrolled</span>
                  <Users className="h-4 w-4 text-steel" />
                </div>
                <div className="text-2xl font-black text-text-primary">{gradebook.total_enrolled}</div>
                <p className="text-[11px] text-text-faint mt-0.5">Students in section</p>
              </div>

              <div className="rounded-2xl border border-sage-border/50 bg-sage-ghost/30 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-sage mb-1 font-medium">
                  <span>Graded / Present</span>
                  <UserCheck className="h-4 w-4 text-sage" />
                </div>
                <div className="text-2xl font-black text-sage">{gradebook.graded_count}</div>
                <p className="text-[11px] text-text-muted mt-0.5">
                  {gradebook.total_enrolled > 0
                    ? `${Math.round((gradebook.graded_count / gradebook.total_enrolled) * 100)}% attendance`
                    : "0%"}
                </p>
              </div>

              <div className="rounded-2xl border border-burgundy-border/50 bg-burgundy-ghost/30 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-burgundy-light mb-1 font-medium">
                  <span>Absent</span>
                  <UserX className="h-4 w-4 text-burgundy-light" />
                </div>
                <div className="text-2xl font-black text-burgundy-light">{gradebook.absent_count}</div>
                <p className="text-[11px] text-text-muted mt-0.5">Marked as 0 score</p>
              </div>

              <div className="rounded-2xl border border-tan-border/50 bg-tan-ghost/30 p-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-tan mb-1 font-medium">
                  <span>Class Average</span>
                  <Award className="h-4 w-4 text-tan" />
                </div>
                <div className="text-2xl font-black text-tan">
                  {gradebook.class_average}{" "}
                  <span className="text-xs text-text-muted font-normal">/ {gradebook.total_questions}</span>
                </div>
                <p className="text-[11px] text-text-muted mt-0.5">{gradebook.average_percentage}% average</p>
              </div>
            </div>
          )}

          {/* Filter Bar & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-base border border-border-default self-start">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "ALL"
                    ? "bg-steel text-white shadow-xs font-bold"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                }`}
              >
                All ({gradebook?.total_enrolled ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("GRADED")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "GRADED"
                    ? "bg-sage text-black font-bold shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                }`}
              >
                Graded ({gradebook?.graded_count ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ABSENT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  statusFilter === "ABSENT"
                    ? "bg-burgundy text-white font-bold shadow-xs"
                    : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                }`}
              >
                Absent ({gradebook?.absent_count ?? 0})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search student or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-border-default bg-surface-base pl-9 pr-3.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-steel focus:outline-none"
              />
            </div>
          </div>

          {/* Roster Table */}
          <div className="rounded-2xl border border-border-default bg-surface-base overflow-hidden shadow-xs">
            {loading ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-tan" />
                <p className="text-xs text-text-muted">Loading section gradebook records...</p>
              </div>
            ) : !gradebook || gradebook.records.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <Users className="h-10 w-10 text-text-faint" />
                <p className="text-sm font-semibold text-text-primary">No students found in this section</p>
                <p className="text-xs text-text-muted max-w-sm">
                  Add students to this section in the Enrolled Students tab to record their exam grades.
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No students match your filter or search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border-default bg-surface-subtle/70 text-text-secondary font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4 w-12 text-center">#</th>
                      <th className="py-3 px-4">Student ID</th>
                      <th className="py-3 px-4">Full Name</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-center">Score</th>
                      <th className="py-3 px-4 text-center">Percentage</th>
                      <th className="py-3 px-4 text-center">Scanned / Submitted</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle/60 font-mono text-xs">
                    {filteredRecords.map((rec, index) => {
                      const isAbsent = rec.status === "ABSENT";
                      return (
                        <tr
                          key={rec.student_id}
                          className={`hover:bg-surface-subtle/40 transition-colors ${
                            isAbsent ? "bg-burgundy-ghost/5" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-text-muted">{index + 1}</td>
                          <td className="py-3 px-4 font-bold text-text-primary">
                            {rec.full_student_id}
                          </td>
                          <td className="py-3 px-4 font-sans font-medium text-text-primary">
                            {rec.student_name}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAbsent ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-ghost px-2.5 py-0.5 text-[11px] font-bold text-burgundy-light border border-burgundy-border">
                                <UserX className="h-3 w-3" />
                                ABSENT
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[11px] font-bold text-sage border border-sage-border">
                                <CheckCircle2 className="h-3 w-3" />
                                GRADED
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAbsent ? (
                              <span className="font-bold text-burgundy-light">0</span>
                            ) : (
                              <span className="font-bold text-text-primary">{rec.score}</span>
                            )}
                            <span className="text-text-muted"> / {rec.max_score}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isAbsent ? (
                              <span className="text-text-muted">0.0%</span>
                            ) : (
                              <span
                                className={`font-semibold ${
                                  rec.percentage >= 75
                                    ? "text-sage"
                                    : rec.percentage >= 50
                                    ? "text-tan"
                                    : "text-burgundy-light"
                                }`}
                              >
                                {rec.percentage}%
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-text-muted font-sans text-[11px]">
                            {rec.scanned_at ? (
                              new Date(rec.scanned_at).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            ) : (
                              <span className="text-text-faint italic">Did not attend</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-sans">
                            {rec.scanned_image_url ? (
                              <a
                                href={rec.scanned_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-tan hover:text-tan-light underline font-medium"
                              >
                                Scan Link
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : isAbsent ? (
                              <span className="text-[11px] text-text-faint">Awaiting Scan</span>
                            ) : (
                              <span className="text-[11px] text-text-muted">Online / Recorded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border-default/80 bg-surface-base shrink-0 text-xs">
          <div className="text-text-muted">
            Showing <strong className="text-text-primary">{filteredRecords.length}</strong> of{" "}
            {gradebook?.total_enrolled ?? 0} enrolled students
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exportingExcel || loading}
              className="flex items-center gap-1.5 rounded-xl border border-sage-border bg-sage-ghost px-3.5 py-2 text-xs font-bold text-sage hover:bg-sage/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              {exportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
