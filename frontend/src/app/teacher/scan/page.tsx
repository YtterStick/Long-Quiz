"use client";

import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { teacher as teacherApi } from "@/lib/api";
import {
  ScanLine,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit2,
  Check,
  Loader2,
  AlertCircle,
  Sparkles,
  Camera,
  X,
  FileSpreadsheet,
  Download,
  Copy,
  Search,
  Users,
  UserCheck,
  UserX,
  Award,
  BookOpen,
  Layers,
  RefreshCw,
  Clock,
  ArrowRight
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { Pagination } from "@/components/ui/Pagination";
import Webcam from "react-webcam";

interface SectionOption {
  id: string;
  name: string;
  subject: string;
  student_count: number;
}

interface ExamOption {
  id: string;
  title: string;
  total_questions: number;
}

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

interface SubmissionResult {
  id: string;
  exam_id: string;
  student_id: string;
  total_score: number;
  max_score: number;
  scanned_image_url: string | null;
  is_published: boolean;
  scanned_at: string;
  answers: Array<{
    id: string;
    question_number: number;
    shaded_option: string | null;
    is_correct: boolean;
  }>;
  student: {
    id: string;
    student_number: number;
    user: { first_name: string; last_name: string };
    section?: {
      id: string;
      name: string;
      subject?: string;
    } | null;
  };
}

export default function TeacherScanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Initial loading state to prevent flash of empty data
  const [initialLoading, setInitialLoading] = useState(true);

  // Sections & Exams selection
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string>("");
  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [loadingExams, setLoadingExams] = useState(false);

  // Gradebook State
  const [gradebook, setGradebook] = useState<GradebookData | null>(null);
  const [loadingGradebook, setLoadingGradebook] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "GRADED" | "ABSENT">("ALL");

  // Excel / Clipboard states
  const [exportingExcel, setExportingExcel] = useState(false);
  const [copiedClipboard, setCopiedClipboard] = useState(false);

  // Upload & Scanning state
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [useWebcam, setUseWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [scanSuccessMsg, setScanSuccessMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Manual Override state
  const [isOverrideMode, setIsOverrideMode] = useState(false);
  const [overrideAnswers, setOverrideAnswers] = useState<Record<number, string>>({});
  const [savingOverride, setSavingOverride] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "TEACHER")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  // Initial load: Fetch sections and all available exams
  useEffect(() => {
    if (user && user.role === "TEACHER") {
      let isMounted = true;
      (async () => {
        try {
          const secList = await teacherApi.listSections();
          if (!isMounted) return;
          setSections(secList);

          if (secList.length > 0) {
            setSelectedSectionId(secList[0].id);
          }
        } catch (err) {
          console.error("Failed to load initial sections:", err);
        } finally {
          if (isMounted) setInitialLoading(false);
        }
      })();

      return () => {
        isMounted = false;
      };
    }
  }, [user]);

  // When selectedSectionId changes, load section exams and all exams
  useEffect(() => {
    if (!selectedSectionId) return;
    let isMounted = true;
    setLoadingExams(true);

    (async () => {
      try {
        // Fetch exams assigned to this section
        const sectionExams = await teacherApi.listSectionExams(selectedSectionId);
        // Also fetch all exams created by the teacher
        const allTeacherExams = await teacherApi.listExams();

        if (!isMounted) return;

        // Prefer exams assigned to this section; if none, show all teacher's exams
        const assignedExamOptions: ExamOption[] = sectionExams
          .filter((se) => se.exam)
          .map((se) => ({
            id: se.exam_id,
            title: se.exam!.title,
            total_questions: se.exam!.total_questions,
          }));

        // Deduplicate with all exams
        const combinedMap = new Map<string, ExamOption>();
        assignedExamOptions.forEach((e) => combinedMap.set(e.id, e));
        allTeacherExams.forEach((e) => {
          if (!combinedMap.has(e.id)) {
            combinedMap.set(e.id, {
              id: e.id,
              title: e.title,
              total_questions: e.total_questions,
            });
          }
        });

        const finalExamList = Array.from(combinedMap.values());
        setExams(finalExamList);

        if (finalExamList.length > 0) {
          // If previous exam is still in the list, keep it; otherwise pick the first
          if (!finalExamList.some((e) => e.id === selectedExamId)) {
            setSelectedExamId(finalExamList[0].id);
          }
        } else {
          setSelectedExamId("");
        }
      } catch (err) {
        console.error("Failed to load exams for section:", err);
      } finally {
        if (isMounted) setLoadingExams(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedSectionId]);

  // Load gradebook whenever section & exam are selected
  const loadGradebook = useCallback(async (sectionId: string, examId: string) => {
    if (!sectionId || !examId) {
      setGradebook(null);
      return;
    }
    setLoadingGradebook(true);
    try {
      const data = await teacherApi.getSectionExamGradebook(sectionId, examId);
      setGradebook(data as GradebookData);
    } catch (err) {
      console.error("Failed to load section exam gradebook:", err);
    } finally {
      setLoadingGradebook(false);
    }
  }, []);

  useEffect(() => {
    if (selectedSectionId && selectedExamId) {
      loadGradebook(selectedSectionId, selectedExamId);
    } else {
      setGradebook(null);
    }
  }, [selectedSectionId, selectedExamId, loadGradebook]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
      setScanSuccessMsg(null);
      setError(null);
    }
  };

  const captureWebcam = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImagePreview(imageSrc);
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const newFile = new File([blob], "scanned_webcam_image.jpg", { type: "image/jpeg" });
          setFile(newFile);
          setScanSuccessMsg(null);
          setError(null);
        });
      setUseWebcam(false);
    }
  }, [webcamRef]);

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !file) return;
    setError(null);
    setScanSuccessMsg(null);
    setScanning(true);
    setResult(null);

    try {
      const submission = (await teacherApi.scanSheet(
        selectedExamId,
        file,
        selectedSectionId || undefined
      )) as unknown as SubmissionResult;

      setResult(submission);
      setScanSuccessMsg(
        `Successfully scanned & graded ${submission.student.user.first_name} ${submission.student.user.last_name}: Score ${submission.total_score}/${submission.max_score}!`
      );

      // Initialize override dictionary
      const initialOverrides: Record<number, string> = {};
      submission.answers.forEach((ans) => {
        if (ans.shaded_option) initialOverrides[ans.question_number] = ans.shaded_option;
      });
      setOverrideAnswers(initialOverrides);

      // Refresh Section Gradebook table so student flips from ABSENT to GRADED immediately!
      if (selectedSectionId && selectedExamId) {
        await loadGradebook(selectedSectionId, selectedExamId);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "OMR Scanning failed");
    } finally {
      setScanning(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!result) return;
    setSavingOverride(true);
    try {
      const formattedAnswers = Object.entries(overrideAnswers).map(([qNum, option]) => ({
        question_number: parseInt(qNum),
        correct_option: option,
      }));
      const updated = await teacherApi.overrideSubmission(result.id, formattedAnswers);
      setResult(updated as unknown as SubmissionResult);
      setIsOverrideMode(false);
      // Refresh section gradebook
      if (selectedSectionId && selectedExamId) {
        await loadGradebook(selectedSectionId, selectedExamId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to override answers");
    } finally {
      setSavingOverride(false);
    }
  };

  const handlePublishGrade = async () => {
    if (!result) return;
    setPublishing(true);
    try {
      await teacherApi.publishSubmission(result.id);
      setPublished(true);
      if (selectedSectionId && selectedExamId) {
        await loadGradebook(selectedSectionId, selectedExamId);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to publish grade");
    } finally {
      setPublishing(false);
    }
  };

  // Export to Excel file (.xlsx)
  const handleExportToExcel = async () => {
    if (!selectedSectionId || !selectedExamId || !gradebook) return;
    setExportingExcel(true);
    try {
      const cleanSec = gradebook.section_name.replace(/[^a-zA-Z0-9_-]/g, "_");
      const cleanExam = gradebook.exam_title.replace(/[^a-zA-Z0-9_-]/g, "_");
      const filename = `Gradebook_${cleanSec}_${cleanExam}.xlsx`;
      await teacherApi.downloadSectionExamExcel(selectedSectionId, selectedExamId, filename);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to export Excel file");
    } finally {
      setExportingExcel(false);
    }
  };

  // Copy records formatted for Excel / Sheets (Clipboard TSV)
  const handleCopyForExcel = async () => {
    if (!gradebook || !gradebook.records || gradebook.records.length === 0) return;

    const headers = [
      "No.",
      "Student ID",
      "Student Name",
      "Status",
      "Score",
      "Max Score",
      "Percentage",
      "Remarks",
      "Submission Date",
    ];

    const rows = gradebook.records.map((r, idx) => {
      const remarks =
        r.status === "ABSENT"
          ? "ABSENT"
          : r.percentage >= 50
          ? "PASSED"
          : "NEEDS IMPROVEMENT";
      const dateStr = r.scanned_at ? new Date(r.scanned_at).toLocaleString() : "-";
      return [
        idx + 1,
        r.full_student_id,
        r.student_name,
        r.status,
        r.score,
        r.max_score,
        `${r.percentage}%`,
        remarks,
        dateStr,
      ].join("\t");
    });

    const tsvContent = [headers.join("\t"), ...rows].join("\n");

    try {
      await navigator.clipboard.writeText(tsvContent);
      setCopiedClipboard(true);
      setTimeout(() => setCopiedClipboard(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("Unable to copy to clipboard automatically. Please try exporting as Excel.");
    }
  };

  // Filtered records in roster
  const filteredRecords = useMemo(() => {
    if (!gradebook || !gradebook.records) return [];
    return gradebook.records.filter((rec) => {
      if (statusFilter !== "ALL" && rec.status !== statusFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        rec.student_name.toLowerCase().includes(q) ||
        rec.full_student_id.toLowerCase().includes(q) ||
        String(rec.student_number).includes(q)
      );
    });
  }, [gradebook, statusFilter, searchQuery]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [selectedSectionId, selectedExamId, statusFilter, searchQuery, pageSize]);

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  if (authLoading || initialLoading) {
    return <ScanPageSkeleton />;
  }

  const selectedSection = sections.find((s) => s.id === selectedSectionId);
  const selectedExam = exams.find((e) => e.id === selectedExamId);

  return (
    <div className="min-h-screen text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/teacher/dashboard" className="hover:text-tan transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Sheet Scanner & Section Gradebook</span>
        </div>

        {/* Page Title & Overview */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl flex items-center gap-2.5">
              <ScanLine className="h-7 w-7 text-tan" />
              Section Sheet Scanner & Gradebook
            </h1>
            <p className="text-sm text-text-muted mt-1 max-w-2xl">
              Scan exam bubble sheets directly into your section records. View full attendance,
              mark absentees with 0, and export complete class records directly to Excel.
            </p>
          </div>
          {gradebook && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyForExcel}
                className="flex items-center gap-2 rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-all"
                title="Copy table formatted for Excel/Google Sheets"
              >
                {copiedClipboard ? (
                  <>
                    <Check className="h-4 w-4 text-sage" />
                    <span className="text-sage">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 text-tan" />
                    <span>Copy for Excel</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleExportToExcel}
                disabled={exportingExcel}
                className="flex items-center gap-2 rounded-xl bg-sage-ghost border border-sage-border px-4 py-2.5 text-xs font-semibold text-sage hover:bg-sage/20 transition-all disabled:opacity-50"
              >
                {exportingExcel ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-sage" />
                    <span>Generating Excel...</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 text-sage" />
                    <span>Export to Excel (.xlsx)</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 1. SECTION & EXAM SELECTOR BAR */}
        <div className="glass-card rounded-2xl p-5 border border-border-default mb-8 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section Picker */}
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-tan" />
                Select Section
              </label>
              {sections.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-surface-base p-3 text-xs text-text-muted flex items-center justify-between">
                  <span>No sections created yet.</span>
                  <Link href="/teacher/sections" className="text-tan hover:underline font-semibold flex items-center gap-1">
                    Create Section <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm font-medium text-text-primary focus:border-steel focus:outline-none transition-colors"
                >
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>
                      {sec.name} {sec.subject ? `— ${sec.subject}` : ""} ({sec.student_count} Students)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Exam Picker */}
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <BookOpen className="h-3.5 w-3.5 text-tan" />
                Select Exam / Quiz
              </label>
              {loadingExams ? (
                <div className="h-10.5 rounded-xl border border-border-default bg-surface-base flex items-center px-3.5 text-xs text-text-muted gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-tan" />
                  Loading section exams...
                </div>
              ) : exams.length === 0 ? (
                <div className="rounded-xl border border-border-default bg-surface-base p-3 text-xs text-text-muted flex items-center justify-between">
                  <span>No exams available for this section.</span>
                  <Link href="/teacher/exams" className="text-tan hover:underline font-semibold flex items-center gap-1">
                    Create Exam <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm font-medium text-text-primary focus:border-steel focus:outline-none transition-colors"
                >
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.title} ({ex.total_questions} Questions)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* 2. SCANNER & LAST RESULT (TWO COLUMNS) */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 mb-10">
          {/* Left Column: Upload / Camera Form */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-border-default">
              <h2 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
                <Upload className="h-4 w-4 text-tan" />
                Scan Student Bubble Sheet
              </h2>
              <p className="text-xs text-text-muted mb-4">
                Scanning target:{" "}
                <span className="font-semibold text-text-primary">
                  {selectedSection ? selectedSection.name : "Select Section"}
                </span>{" "}
                •{" "}
                <span className="font-semibold text-text-primary">
                  {selectedExam ? selectedExam.title : "Select Exam"}
                </span>
              </p>

              <form onSubmit={handleRunScan} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{error}</span>
                  </div>
                )}

                {scanSuccessMsg && (
                  <div className="flex items-center gap-2 rounded-xl bg-sage-ghost border border-sage-border p-3 text-xs text-sage font-medium">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{scanSuccessMsg}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1.5">
                    Sheet Photo / Device Camera
                  </label>
                  {!useWebcam ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-dashed border-border-emphasis bg-surface-base p-6 text-center hover:border-tan transition-colors">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-tan-ghost file:text-tan hover:file:bg-tan-ghost cursor-pointer"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseWebcam(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-subtle py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-muted transition-all border border-border-emphasis"
                      >
                        <Camera className="h-4 w-4 text-tan" />
                        Use Device Camera
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-border-emphasis bg-surface-base p-2 relative">
                      <button
                        type="button"
                        onClick={() => setUseWebcam(false)}
                        className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay/80 text-text-primary hover:bg-burgundy-light"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{ facingMode: "environment" }}
                        className="w-full rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={captureWebcam}
                        className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-steel py-3 text-sm font-semibold text-text-primary hover:bg-steel-light transition-all"
                      >
                        <Camera className="h-4 w-4" />
                        Capture Image
                      </button>
                    </div>
                  )}
                </div>

                {imagePreview && !useWebcam && (
                  <div className="rounded-xl overflow-hidden border border-border-default bg-surface-base p-2.5 relative">
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFile(null);
                      }}
                      className="absolute top-4 right-4 z-10 flex h-7 w-7 items-center justify-center rounded-full bg-surface-overlay/85 text-text-primary hover:bg-burgundy-light transition-colors"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <p className="text-[11px] font-semibold text-text-muted mb-1.5">Image Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Scanned Sheet"
                      className="max-h-52 w-full object-contain rounded-lg"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={scanning || !file || !selectedExamId || !selectedSectionId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-3 text-sm font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning & Grading Sheet...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Scan & Record into Section
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Scan & Grade Results */}
          <div className="lg:col-span-7">
            {result ? (
              <div className="glass-card rounded-2xl p-6 border border-border-default space-y-6">
                {/* Result Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border-default pb-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-text-primary">
                        {result.student.user.first_name} {result.student.user.last_name}
                      </h2>
                      <span className="rounded-full bg-sage-ghost px-2.5 py-0.5 text-xs font-mono font-bold text-sage border border-sage-border">
                        ID: 02000{String(result.student.student_number).padStart(6, "0")}
                      </span>
                      {result.student.section && (
                        <span className="rounded-full bg-steel/15 px-2.5 py-0.5 text-xs font-semibold text-steel-light border border-steel/30">
                          {result.student.section.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-text-faint" />
                      Scanned at {new Date(result.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Score Badge */}
                  <div className="text-right">
                    <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Exam Score</p>
                    <p className="text-3xl font-extrabold text-tan">
                      {result.total_score} <span className="text-lg text-text-faint">/ {result.max_score}</span>
                    </p>
                    <p className="text-xs text-text-muted font-semibold">
                      {roundTo1Decimal((result.total_score / result.max_score) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Google Drive Link */}
                {result.scanned_image_url && (
                  <div className="flex items-center justify-between rounded-xl bg-tan-ghost border border-tan-border p-3.5 text-xs">
                    <span className="text-tan-light font-medium">
                      Scanned Sheet Uploaded to Google Drive
                    </span>
                    <a
                      href={result.scanned_image_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 font-semibold text-tan hover:text-tan-light underline"
                    >
                      View on GDrive
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                )}

                {/* Shaded Anomalies / Answers Breakdown */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-text-primary">Detected Answers Breakdown</h3>
                    <button
                      type="button"
                      onClick={() => setIsOverrideMode(!isOverrideMode)}
                      className="flex items-center gap-1.5 rounded-lg bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-tan" />
                      {isOverrideMode ? "Cancel Override" : "Manual Override"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1 font-mono text-xs">
                    {result.answers.map((ans) => (
                      <div
                        key={ans.question_number}
                        className={`flex items-center justify-between rounded-lg p-2 border ${
                          ans.is_correct
                            ? "bg-sage-ghost border-sage-border text-text-primary"
                            : ans.shaded_option === null
                            ? "bg-cream-ghost border-cream-border text-cream-light"
                            : "bg-burgundy-ghost border-burgundy-border text-text-primary"
                        }`}
                      >
                        <span className="font-semibold text-text-muted">Q{ans.question_number}.</span>
                        {isOverrideMode ? (
                          <select
                            value={overrideAnswers[ans.question_number] || ""}
                            onChange={(e) =>
                              setOverrideAnswers({
                                ...overrideAnswers,
                                [ans.question_number]: e.target.value,
                              })
                            }
                            className="rounded bg-surface-overlay px-2 py-0.5 text-xs text-text-primary border border-border-emphasis"
                          >
                            <option value="">BLANK</option>
                            {["A", "B", "C", "D"].map((opt) => (
                              <option key={opt} value={opt}>
                                {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold ${
                                ans.shaded_option ? "text-tan" : "text-cream"
                              }`}
                            >
                              {ans.shaded_option || "BLANK"}
                            </span>
                            {ans.is_correct ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-sage" />
                            ) : (
                              <AlertTriangle className="h-3.5 w-3.5 text-burgundy-light" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: Save Override / Publish Grade */}
                <div className="flex gap-3 pt-3 border-t border-border-default">
                  {isOverrideMode ? (
                    <button
                      type="button"
                      onClick={handleSaveOverride}
                      disabled={savingOverride}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20"
                    >
                      {savingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Overridden Answers"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePublishGrade}
                      disabled={publishing || published || result.is_published}
                      className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all shadow-lg ${
                        published || result.is_published
                          ? "bg-sage-ghost text-sage border border-sage-border"
                          : "gradient-bg-primary text-text-primary shadow-steel/20 hover:opacity-95"
                      }`}
                    >
                      {publishing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : published || result.is_published ? (
                        <>
                          <Check className="h-4 w-4" />
                          Grades Published to Student Portal
                        </>
                      ) : (
                        "Publish Grades to Student"
                      )}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl p-12 text-center border border-border-default flex flex-col items-center justify-center min-h-90">
                <ScanLine className="h-16 w-16 text-text-faint mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-text-primary">Awaiting Bubble Sheet Scan</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Select a section and exam above, then upload or capture a completed sheet to detect student ID and grade.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. SECTION EXAM GRADEBOOK & FULL ROSTER (ACTIVE USER REQUEST) */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-tan" />
                Section Gradebook & Attendance Records
              </h2>
              <p className="text-xs text-text-muted mt-1">
                Complete roster for {selectedSection?.name || "Selected Section"} • {selectedExam?.title || "Exam"}.
                Students who didn&apos;t submit are marked as 0 with <span className="text-burgundy-light font-bold">ABSENT</span> status.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (!selectedSectionId || !selectedExamId) return;
                  try {
                    const cleanSec = (selectedSection?.name || "Section").replace(/[^a-zA-Z0-9_-]/g, "_");
                    const cleanExam = (selectedExam?.title || "Exam").replace(/[^a-zA-Z0-9_-]/g, "_");
                    await teacherApi.downloadSectionExamExcel(
                      selectedSectionId,
                      selectedExamId,
                      `Gradebook_${cleanSec}_${cleanExam}.xlsx`
                    );
                  } catch {
                    alert("Failed to export Excel gradebook");
                  }
                }}
                disabled={!selectedSectionId || !selectedExamId || loadingGradebook}
                className="flex items-center gap-1.5 rounded-xl border border-sage-border bg-sage-ghost px-3 py-2 text-xs font-bold text-sage hover:bg-sage/20 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Download official gradebook spreadsheet (.xlsx)"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-sage" />
                <span>Export to Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (selectedSectionId && selectedExamId) {
                    loadGradebook(selectedSectionId, selectedExamId);
                  }
                }}
                className="flex items-center gap-1.5 rounded-xl border border-border-default bg-surface-subtle px-3 py-2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Refresh gradebook"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loadingGradebook ? "animate-spin text-tan" : ""}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Stat Cards */}
          {gradebook && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border-default bg-surface-overlay p-4.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-text-muted mb-1 font-medium">
                  <span>Total Enrolled</span>
                  <Users className="h-4 w-4 text-steel" />
                </div>
                <div className="text-2xl font-black text-text-primary">{gradebook.total_enrolled}</div>
                <p className="text-[11px] text-text-faint mt-0.5">Students in section</p>
              </div>

              <div className="rounded-2xl border border-sage-border/50 bg-sage-ghost/40 p-4.5 backdrop-blur-md">
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

              <div className="rounded-2xl border border-burgundy-border/50 bg-burgundy-ghost/40 p-4.5 backdrop-blur-md">
                <div className="flex items-center justify-between text-xs text-burgundy-light mb-1 font-medium">
                  <span>Absent</span>
                  <UserX className="h-4 w-4 text-burgundy-light" />
                </div>
                <div className="text-2xl font-black text-burgundy-light">{gradebook.absent_count}</div>
                <p className="text-[11px] text-text-muted mt-0.5">Marked as 0 score</p>
              </div>

              <div className="rounded-2xl border border-tan-border/50 bg-tan-ghost/40 p-4.5 backdrop-blur-md">
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

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-base border border-border-default self-start">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === "ALL"
                    ? "bg-steel text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                All ({gradebook?.total_enrolled ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("GRADED")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === "GRADED"
                    ? "bg-sage text-black font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                }`}
              >
                Graded ({gradebook?.graded_count ?? 0})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("ABSENT")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  statusFilter === "ABSENT"
                    ? "bg-burgundy text-text-primary font-bold shadow-sm"
                    : "text-text-muted hover:text-text-primary"
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

          {/* Table Container */}
          <div className="glass-card rounded-2xl border border-border-default overflow-hidden">
            {loadingGradebook ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-tan" />
                <p className="text-xs text-text-muted">Loading section gradebook records...</p>
              </div>
            ) : !gradebook || gradebook.records.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
                <Users className="h-10 w-10 text-text-faint" />
                <p className="text-sm font-semibold text-text-primary">No students found in this section</p>
                <p className="text-xs text-text-muted max-w-sm">
                  Add students to this section in the Sections manager to record their exam grades.
                </p>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-muted">
                No students match your filter or search criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border-default bg-surface-subtle/60 text-text-secondary font-semibold uppercase tracking-wider">
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
                    {paginatedRecords.map((rec, index) => {
                      const isAbsent = rec.status === "ABSENT";
                      const displayIndex = (page - 1) * pageSize + index + 1;
                      return (
                        <tr
                          key={rec.student_id}
                          className={`hover:bg-surface-subtle/40 transition-colors ${
                            isAbsent ? "bg-burgundy-ghost/10" : ""
                          }`}
                        >
                          <td className="py-3 px-4 text-center text-text-muted">{displayIndex}</td>
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
                <Pagination
                  currentPage={page}
                  totalPages={Math.ceil(filteredRecords.length / pageSize)}
                  totalItems={filteredRecords.length}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[10, 25, 50]}
                  itemLabel="student records"
                />
              </div>
            )}
          </div>
        </section>
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}

function ScanPageSkeleton() {
  return (
    <div className="min-h-screen text-text-primary">
      <div className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-4" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Title */}
        <div className="mb-8">
          <Skeleton className="h-8 w-80 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Section & Exam Bar */}
        <div className="rounded-2xl border border-border-default bg-surface-overlay p-6 mb-8 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>

        {/* 2 Column Scanner */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 mb-8">
          <div className="lg:col-span-5">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
          <div className="lg:col-span-7">
            <Skeleton className="h-96 w-full rounded-2xl" />
          </div>
        </div>

        {/* Gradebook Skeleton */}
        <div className="rounded-2xl border border-border-default bg-surface-overlay p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function roundTo1Decimal(num: number): number {
  return Math.round(num * 10) / 10;
}
