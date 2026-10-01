"use client";

import React, { useEffect, useState } from "react";
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
  X
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import Webcam from "react-webcam";

interface ExamOption {
  id: string;
  title: string;
  total_questions: number;
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
  };
}

export default function TeacherScanPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<ExamOption[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [useWebcam, setUseWebcam] = useState(false);
  const webcamRef = React.useRef<Webcam>(null);

  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
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

  useEffect(() => {
    if (user && user.role === "TEACHER") {
      teacherApi.listExams().then((data) => {
        setExams(data);
        if (data.length > 0) setSelectedExamId(data[0].id);
      });
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      setImagePreview(URL.createObjectURL(selected));
    }
  };

  const captureWebcam = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setImagePreview(imageSrc);
      
      // Convert base64 to File
      fetch(imageSrc)
        .then((res) => res.blob())
        .then((blob) => {
          const newFile = new File([blob], "scanned_webcam_image.jpg", { type: "image/jpeg" });
          setFile(newFile);
        });
      setUseWebcam(false);
    }
  }, [webcamRef]);

  const handleRunScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !file) return;
    setError(null);
    setScanning(true);
    setResult(null);

    try {
      const submission = (await teacherApi.scanSheet(selectedExamId, file)) as unknown as SubmissionResult;
      setResult(submission);

      // Initialize override dictionary
      const initialOverrides: Record<number, string> = {};
      submission.answers.forEach((ans) => {
        if (ans.shaded_option) initialOverrides[ans.question_number] = ans.shaded_option;
      });
      setOverrideAnswers(initialOverrides);
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
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to publish grade");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/teacher/dashboard" className="hover:text-tan transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Sheet Scanner</span>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl flex items-center gap-2">
              <ScanLine className="h-7 w-7 text-tan" />
              Bubble Sheet Scanner
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Upload a photo of a completed bubble sheet to automatically detect Student ID and grade answers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left Column: Upload Form & Settings */}
          <div className="lg:col-span-5 space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-border-default">
              <h2 className="text-base font-bold text-text-primary mb-4 flex items-center gap-2">
                <Upload className="h-4 w-4 text-tan" />
                1. Select Exam & Upload Photo
              </h2>

              <form onSubmit={handleRunScan} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Select Target Exam
                  </label>
                  <select
                    value={selectedExamId}
                    onChange={(e) => setSelectedExamId(e.target.value)}
                    className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                  >
                    {exams.map((ex) => (
                      <option key={ex.id} value={ex.id}>
                        {ex.title} ({ex.total_questions} Qs)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-secondary mb-1">
                    Scanned Image / Camera Photo
                  </label>
                  {!useWebcam ? (
                    <div className="space-y-3">
                      <div className="rounded-xl border border-dashed border-border-emphasis bg-surface-base p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full text-xs text-text-muted file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-tan-ghost file:text-tan hover:file:bg-tan-ghost"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setUseWebcam(true)}
                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-subtle py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-muted transition-all border border-border-emphasis"
                      >
                        <Camera className="h-4 w-4" />
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
                  <div className="rounded-xl overflow-hidden border border-border-default bg-surface-base p-2 relative">
                    <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFile(null);
                        }}
                        className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-surface-overlay/80 text-text-primary hover:bg-burgundy-light"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    <p className="text-[11px] font-semibold text-text-muted mb-1">Uploaded / Captured Image Preview</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Scanned Sheet"
                      className="max-h-56 w-full object-contain rounded-lg"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={scanning || !file || !selectedExamId}
                  className="w-full flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-3 text-sm font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all disabled:opacity-50"
                >
                  {scanning ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Scanning & Evaluating Sheet...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Scan & Grade Sheet
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
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-bold text-text-primary">
                        {result.student.user.first_name} {result.student.user.last_name}
                      </h2>
                      <span className="rounded-full bg-sage-ghost px-2.5 py-0.5 text-xs font-mono font-bold text-sage border border-sage-border">
                        ID: {result.student.student_number}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      Scanned at {new Date(result.scanned_at).toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Score Badge */}
                  <div className="text-right">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">Final Score</p>
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
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-text-primary">Detected Answers Breakdown</h3>
                    <button
                      onClick={() => setIsOverrideMode(!isOverrideMode)}
                      className="flex items-center gap-1.5 rounded-lg bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5 text-tan" />
                      {isOverrideMode ? "Cancel Override" : "Manual Override"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto p-1 font-mono text-xs">
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
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-bold ${
                                ans.shaded_option ? "text-tan" : "text-cream"
                              }`}
                            >
                              {ans.shaded_option || "BLANK"}
                            </span>
                            {ans.is_correct ? (
                              <CheckCircle2 className="h-4 w-4 text-sage" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-burgundy-light" />
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions: Save Override / Publish Grade */}
                <div className="flex gap-3 pt-4 border-t border-border-default">
                  {isOverrideMode ? (
                    <button
                      onClick={handleSaveOverride}
                      disabled={savingOverride}
                      className="w-full flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20"
                    >
                      {savingOverride ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Overridden Answers"}
                    </button>
                  ) : (
                    <button
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
              <div className="glass-card rounded-2xl p-12 text-center border border-border-default flex flex-col items-center justify-center min-h-100">
                <ScanLine className="h-16 w-16 text-text-faint mb-4 animate-pulse" />
                <h3 className="text-lg font-bold text-text-primary">Awaiting Bubble Sheet Scan</h3>
                <p className="text-xs text-text-muted max-w-sm mt-1">
                  Select an exam and upload a sheet image on the left to trigger OpenCV marker detection & auto-grading.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}

function roundTo1Decimal(num: number): number {
  return Math.round(num * 10) / 10;
}
