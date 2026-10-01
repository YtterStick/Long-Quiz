"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { teacher as teacherApi } from "@/lib/api";
import {
  FileSpreadsheet,
  Plus,
  Globe,
  Lock,
  Copy,
  Trash2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  Printer,
  FileDown,
  BookOpen,
  CheckCircle2,
  Save,
  X,
  KeyRound,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonExamGrid } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";

interface AnswerKey {
  question_number: number;
  correct_option: string;
}

interface QuestionItem {
  id?: string;
  question_number: number;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  explanation?: string | null;
}

interface ExamItem {
  id: string;
  teacher_id: string;
  title: string;
  total_questions: number;
  is_public: boolean;
  is_owner?: boolean;
  created_at: string;
  answer_keys: Array<{ id?: string; question_number: number; correct_option: string }>;
  questions?: QuestionItem[];
}

export default function TeacherExamsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [includePublic, setIncludePublic] = useState(false);

  // Builder States
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [builderTab, setBuilderTab] = useState<"keys" | "questions">("keys");
  const [editingExam, setEditingExam] = useState<ExamItem | null>(null);
  const [examToDelete, setExamToDelete] = useState<ExamItem | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [totalQuestions, setTotalQuestions] = useState(50);
  const [isPublic, setIsPublic] = useState(false);
  const [keys, setKeys] = useState<Record<number, string>>({});
  const [questionsData, setQuestionsData] = useState<Record<number, Partial<QuestionItem>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [blankQuestions, setBlankQuestions] = useState(50);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Dedicated Questionnaire Modal state
  const [questionnaireExam, setQuestionnaireExam] = useState<ExamItem | null>(null);
  const [questionnaireList, setQuestionnaireList] = useState<QuestionItem[]>([]);
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false);
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const [questionnaireSuccess, setQuestionnaireSuccess] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<"all" | "missing" | "completed">("all");

  // Toggling visibility state tracker
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);

  const openPreview = async () => {
    setPreviewLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(
        `http://localhost:8000/api/teacher/blank-bubble-sheet?questions=${blankQuestions}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error("Failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      alert("Could not load bubble sheet. Is the backend running?");
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const downloadFromPreview = () => {
    if (!previewUrl) return;
    const a = document.createElement("a");
    a.href = previewUrl;
    a.download = `blank_bubble_sheet_${blankQuestions}q.pdf`;
    a.click();
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "TEACHER")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  const loadExams = async () => {
    setLoading(true);
    try {
      const data = await teacherApi.listExams(includePublic);
      setExams(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load exams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    if (user && user.role === "TEACHER") {
      teacherApi
        .listExams(includePublic)
        .then((data) => {
          if (!ignore) setExams(data);
        })
        .catch((err: unknown) => {
          if (!ignore) setError(err instanceof Error ? err.message : "Failed to load exams");
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [user, includePublic]);

  const openNewBuilder = () => {
    setEditingExam(null);
    setTitle("");
    setTotalQuestions(50);
    setIsPublic(false);
    setBuilderTab("keys");

    // Default keys: Question 1-50 with 'A'
    const defaultKeys: Record<number, string> = {};
    const defaultQuestions: Record<number, Partial<QuestionItem>> = {};
    for (let i = 1; i <= 50; i++) {
      defaultKeys[i] = "A";
      defaultQuestions[i] = {
        question_number: i,
        question_text: "",
        option_a: "",
        option_b: "",
        option_c: "",
        option_d: "",
        explanation: "",
      };
    }
    setKeys(defaultKeys);
    setQuestionsData(defaultQuestions);
    setIsBuilderOpen(true);
  };

  const openEditBuilder = (exam: ExamItem, initialTab: "keys" | "questions" = "keys") => {
    setEditingExam(exam);
    setTitle(exam.title);
    setTotalQuestions(exam.total_questions);
    setIsPublic(exam.is_public);
    setBuilderTab(initialTab);

    const existingKeys: Record<number, string> = {};
    exam.answer_keys.forEach((ak) => {
      existingKeys[ak.question_number] = ak.correct_option;
    });

    const existingQuestions: Record<number, Partial<QuestionItem>> = {};
    if (exam.questions) {
      exam.questions.forEach((q) => {
        existingQuestions[q.question_number] = { ...q };
      });
    }

    // Ensure keys and question structures exist for all total_questions
    for (let i = 1; i <= exam.total_questions; i++) {
      if (!existingKeys[i]) existingKeys[i] = "A";
      if (!existingQuestions[i]) {
        existingQuestions[i] = {
          question_number: i,
          question_text: "",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          explanation: "",
        };
      }
    }
    setKeys(existingKeys);
    setQuestionsData(existingQuestions);
    setIsBuilderOpen(true);
  };

  const handleQuestionCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(50, count));
    setTotalQuestions(validCount);
    const updatedKeys = { ...keys };
    const updatedQuestions = { ...questionsData };
    for (let i = 1; i <= validCount; i++) {
      if (!updatedKeys[i]) updatedKeys[i] = "A";
      if (!updatedQuestions[i]) {
        updatedQuestions[i] = {
          question_number: i,
          question_text: "",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          explanation: "",
        };
      }
    }
    setKeys(updatedKeys);
    setQuestionsData(updatedQuestions);
  };

  const handleQuickFillAll = (opt: string) => {
    const updated: Record<number, string> = {};
    for (let i = 1; i <= totalQuestions; i++) {
      updated[i] = opt;
    }
    setKeys(updated);
  };

  const handleSaveExam = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const answer_keys: AnswerKey[] = [];
    const questions_payload: Array<{
      question_number: number;
      question_text: string;
      option_a?: string | null;
      option_b?: string | null;
      option_c?: string | null;
      option_d?: string | null;
      explanation?: string | null;
    }> = [];

    for (let i = 1; i <= totalQuestions; i++) {
      answer_keys.push({
        question_number: i,
        correct_option: keys[i] || "A",
      });

      const q = questionsData[i];
      if (q && (q.question_text?.trim() || q.option_a || q.explanation)) {
        questions_payload.push({
          question_number: i,
          question_text: q.question_text || `Question ${i}`,
          option_a: q.option_a || null,
          option_b: q.option_b || null,
          option_c: q.option_c || null,
          option_d: q.option_d || null,
          explanation: q.explanation || null,
        });
      }
    }

    try {
      if (editingExam) {
        await teacherApi.updateExam(editingExam.id, {
          title,
          total_questions: totalQuestions,
          is_public: isPublic,
          answer_keys,
          questions: questions_payload,
        });
      } else {
        await teacherApi.createExam({
          title,
          total_questions: totalQuestions,
          is_public: isPublic,
          answer_keys,
          questions: questions_payload,
        });
      }
      setIsBuilderOpen(false);
      await loadExams();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await teacherApi.deleteExam(examToDelete.id);
      setExamToDelete(null);
      await loadExams();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete exam");
    }
  };

  const handleCloneExam = async (id: string) => {
    try {
      await teacherApi.cloneExam(id);
      await loadExams();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to clone exam");
    }
  };

  // Quick toggle Public / Private visibility
  const handleToggleVisibility = async (exam: ExamItem) => {
    setTogglingVisibilityId(exam.id);
    const newStatus = !exam.is_public;
    try {
      await teacherApi.toggleExamVisibility(exam.id, newStatus);
      setExams((prev) =>
        prev.map((e) => (e.id === exam.id ? { ...e, is_public: newStatus } : e))
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update visibility");
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Open Dedicated Questionnaire Modal
  const openQuestionnaireModal = async (exam: ExamItem) => {
    setQuestionnaireExam(exam);
    setLoadingQuestionnaire(true);
    setQuestionnaireSuccess(null);
    setQuestionFilter("all");

    try {
      const fetchedQuestions = await teacherApi.getQuestionnaire(exam.id);
      const questionMap: Record<number, QuestionItem> = {};
      fetchedQuestions.forEach((q) => {
        questionMap[q.question_number] = q;
      });

      const fullList: QuestionItem[] = [];
      for (let i = 1; i <= exam.total_questions; i++) {
        if (questionMap[i]) {
          fullList.push(questionMap[i]);
        } else {
          fullList.push({
            question_number: i,
            question_text: "",
            option_a: "",
            option_b: "",
            option_c: "",
            option_d: "",
            explanation: "",
          });
        }
      }
      setQuestionnaireList(fullList);
    } catch {
      // Fallback to empty template
      const fullList: QuestionItem[] = [];
      for (let i = 1; i <= exam.total_questions; i++) {
        fullList.push({
          question_number: i,
          question_text: "",
          option_a: "",
          option_b: "",
          option_c: "",
          option_d: "",
          explanation: "",
        });
      }
      setQuestionnaireList(fullList);
    } finally {
      setLoadingQuestionnaire(false);
    }
  };

  const handleSaveQuestionnaire = async () => {
    if (!questionnaireExam) return;
    setSavingQuestionnaire(true);
    setQuestionnaireSuccess(null);

    const payload = questionnaireList
      .filter((q) => q.question_text?.trim() || q.option_a || q.explanation)
      .map((q) => ({
        question_number: q.question_number,
        question_text: q.question_text?.trim() || `Question ${q.question_number}`,
        option_a: q.option_a || null,
        option_b: q.option_b || null,
        option_c: q.option_c || null,
        option_d: q.option_d || null,
        explanation: q.explanation || null,
      }));

    try {
      await teacherApi.updateQuestionnaire(questionnaireExam.id, payload);
      setQuestionnaireSuccess("Questionnaire and study reviewer updated successfully!");
      await loadExams();
      setTimeout(() => setQuestionnaireSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save questionnaire");
    } finally {
      setSavingQuestionnaire(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center gap-2 text-xs text-text-muted">
          <Link href="/teacher/dashboard" className="hover:text-tan transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Exams, Answer Keys & Reviewers</span>
        </div>

        {isBuilderOpen ? (
          /* Questionnaire & Answer Key Builder */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsBuilderOpen(false)}
                  className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-text-primary">
                    {editingExam ? "Edit Exam & Reviewer" : "Exam, Key & Reviewer Builder"}
                  </h1>
                  <p className="text-xs text-text-muted mt-0.5">
                    Configure OMR answer keys for grading, and optionally add questions & choices for student reviewer tracking.
                  </p>
                </div>
              </div>

              {/* Builder Tabs */}
              <div className="flex items-center bg-surface-overlay border border-border-default p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setBuilderTab("keys")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    builderTab === "keys"
                      ? "gradient-bg-primary text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  1. OMR Answer Keys
                </button>
                <button
                  type="button"
                  onClick={() => setBuilderTab("questions")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    builderTab === "questions"
                      ? "gradient-bg-primary text-text-primary shadow-sm"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  2. Questionnaire & Reviewer
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveExam} className="space-y-6">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                  <AlertCircle className="h-4 w-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* General Info Card */}
              <div className="glass-card rounded-2xl p-6 border border-border-default space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Exam Title
                    </label>
                    <input
                      type="text"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Midterm Examination in CS101"
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-text-secondary mb-1">
                      Total Number of Questions (1 - 50)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={totalQuestions}
                      onChange={(e) => handleQuestionCountChange(parseInt(e.target.value) || 1)}
                      className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 text-sm text-text-primary focus:border-steel focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Public vs Private Status Indicator */}
                <div className="flex items-center justify-between rounded-xl bg-surface-base p-4 border border-border-default">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tan-ghost border border-tan-border">
                        <Globe className="h-5 w-5 text-tan" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-subtle border border-border-emphasis">
                        <Lock className="h-5 w-5 text-text-muted" />
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-text-primary flex items-center gap-2">
                        {isPublic ? "Public Exam & Reviewer" : "Private Exam"}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isPublic ? "bg-sage-ghost text-sage border border-sage-border" : "bg-surface-muted text-text-muted"
                        }`}>
                          {isPublic ? "Students Can View" : "Hidden From Students"}
                        </span>
                      </p>
                      <p className="text-[11px] text-text-muted">
                        {isPublic
                          ? "Students who took this exam will see their personal score, their shaded answers, the correct answer keys, and the study reviewer."
                          : "Students cannot view this exam or their score until you toggle it to Public."}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsPublic(!isPublic)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      isPublic ? "bg-steel" : "bg-surface-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isPublic ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* TAB 1: Answer Key Grid */}
              {builderTab === "keys" && (
                <div className="glass-card rounded-2xl p-6 border border-border-default">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <KeyRound className="h-4 w-4 text-tan" />
                        Official Answer Key
                      </h3>
                      <p className="text-xs text-text-muted">
                        Select the correct option (A, B, C, D) for each question to automatically grade scanned bubble sheets.
                      </p>
                    </div>

                    {/* Quick Fill Options */}
                    <div className="flex items-center gap-1.5 bg-surface-base p-1.5 rounded-xl border border-border-default text-xs">
                      <span className="text-[11px] font-medium text-text-muted px-2">Quick Fill All:</span>
                      {["A", "B", "C", "D"].map((opt) => (
                        <button
                          type="button"
                          key={opt}
                          onClick={() => handleQuickFillAll(opt)}
                          className="h-6 px-2 rounded-lg bg-surface-overlay text-text-secondary font-bold hover:bg-steel hover:text-text-primary transition-colors"
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
                    {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => (
                      <div
                        key={qNum}
                        className="flex items-center justify-between rounded-xl bg-surface-base p-2.5 border border-border-default"
                      >
                        <span className="font-mono text-xs font-bold text-text-muted">Q{qNum}.</span>
                        <div className="flex gap-1">
                          {["A", "B", "C", "D"].map((opt) => {
                            const isSelected = keys[qNum] === opt;
                            return (
                              <button
                                type="button"
                                key={opt}
                                onClick={() => setKeys({ ...keys, [qNum]: opt })}
                                className={`h-6 w-6 rounded-lg text-xs font-bold transition-all ${
                                  isSelected
                                    ? "gradient-bg-primary text-text-primary shadow-md shadow-steel/25 scale-105"
                                    : "bg-surface-overlay text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                                }`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-border-default flex items-center justify-between">
                    <p className="text-xs text-text-muted">
                      Want to attach full question texts and multiple-choice options for student reviewer?
                    </p>
                    <button
                      type="button"
                      onClick={() => setBuilderTab("questions")}
                      className="flex items-center gap-1.5 text-xs font-bold text-tan hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" />
                      Switch to Questionnaire Tab →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: Questionnaire & Reviewer Content */}
              {builderTab === "questions" && (
                <div className="glass-card rounded-2xl p-6 border border-border-default space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-tan" />
                        Questionnaire & Reviewer Details
                      </h3>
                      <p className="text-xs text-text-muted">
                        Add the question text, multiple choice labels, and explanations. When the exam is public, students can study these as a reviewer alongside their score!
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 max-h-150 overflow-y-auto pr-2">
                    {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((qNum) => {
                      const q = questionsData[qNum] || {};
                      const correctKey = keys[qNum] || "A";

                      return (
                        <div
                          key={qNum}
                          className="rounded-2xl border border-border-default bg-surface-base p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-text-secondary">
                              Question {qNum} of {totalQuestions}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sage-ghost text-sage border border-sage-border">
                              Correct Key: {correctKey}
                            </span>
                          </div>

                          {/* Question text */}
                          <div>
                            <input
                              type="text"
                              placeholder={`Enter prompt for Question ${qNum}...`}
                              value={q.question_text || ""}
                              onChange={(e) =>
                                setQuestionsData({
                                  ...questionsData,
                                  [qNum]: { ...q, question_text: e.target.value },
                                })
                              }
                              className="w-full rounded-xl border border-border-emphasis bg-surface-overlay px-3 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
                            />
                          </div>

                          {/* Options A - D */}
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(["A", "B", "C", "D"] as const).map((opt) => {
                              const field = `option_${opt.toLowerCase()}` as keyof QuestionItem;
                              const isCorrect = correctKey === opt;

                              return (
                                <div
                                  key={opt}
                                  className={`flex items-center gap-2 rounded-xl border p-2 ${
                                    isCorrect
                                      ? "border-sage-border bg-sage-ghost/40"
                                      : "border-border-default bg-surface-overlay"
                                  }`}
                                >
                                  <span
                                    className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                      isCorrect
                                        ? "bg-sage text-white"
                                        : "bg-surface-muted text-text-muted"
                                    }`}
                                  >
                                    {opt}
                                  </span>
                                  <input
                                    type="text"
                                    placeholder={`Choice ${opt}`}
                                    value={(q[field] as string) || ""}
                                    onChange={(e) =>
                                      setQuestionsData({
                                        ...questionsData,
                                        [qNum]: { ...q, [field]: e.target.value },
                                      })
                                    }
                                    className="w-full bg-transparent text-xs text-text-primary focus:outline-none"
                                  />
                                </div>
                              );
                            })}
                          </div>

                          {/* Explanation */}
                          <div>
                            <input
                              type="text"
                              placeholder="Reviewer explanation / notes (shown to students when reviewing their score)..."
                              value={q.explanation || ""}
                              onChange={(e) =>
                                setQuestionsData({
                                  ...questionsData,
                                  [qNum]: { ...q, explanation: e.target.value },
                                })
                              }
                              className="w-full rounded-xl border border-dashed border-border-emphasis bg-surface-overlay px-3 py-1.5 text-xs text-text-muted focus:text-text-primary focus:border-tan focus:outline-none"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsBuilderOpen(false)}
                  className="rounded-xl border border-border-emphasis bg-surface-subtle px-5 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 rounded-xl gradient-bg-primary px-6 py-2.5 text-xs font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all"
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save Exam & Answer Keys"
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Main Exam List */
          <div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
                  Exams, Answer Keys & Reviewers
                </h1>
                <p className="text-sm text-text-muted mt-1">
                  Manage answer keys for OMR grading, add questionnaire content for student reviewers, and toggle Public/Private visibility.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIncludePublic(!includePublic)}
                  className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                    includePublic
                      ? "bg-tan-ghost text-tan border-steel-border"
                      : "bg-surface-subtle text-text-secondary border-border-emphasis hover:bg-surface-muted"
                  }`}
                >
                  <Globe className="h-4 w-4" />
                  {includePublic ? "Showing Public Exams" : "Show Public Exams"}
                </button>

                <button
                  onClick={openNewBuilder}
                  className="flex items-center justify-center gap-2 rounded-xl gradient-bg-primary px-4 py-2 text-sm font-semibold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Create Exam
                </button>
              </div>
            </div>

            {/* ── Blank Bubble Sheet Download Card ─────────────── */}
            <div className="mb-8 rounded-2xl border border-steel-border bg-steel-ghost p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-steel-ghost flex-shrink-0">
                  <Printer className="h-5 w-5 text-steel" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">Blank OMR Bubble Sheet</h3>
                  <p className="text-xs text-text-muted mt-0.5">
                    Download a blank answer sheet to print and distribute. Students shade bubbles by hand, then you scan it.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-xs text-text-muted">No. of Questions:</label>
                    <select
                      value={blankQuestions}
                      onChange={(e) => setBlankQuestions(Number(e.target.value))}
                      className="rounded-lg border border-border-emphasis bg-surface-overlay px-2 py-1 text-xs text-text-primary focus:border-steel focus:outline-none"
                    >
                      {[10, 20, 25, 30, 40, 50].map((n) => (
                        <option key={n} value={n}>{n} questions</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <button
                onClick={openPreview}
                disabled={previewLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-steel px-5 py-2.5 text-xs font-bold text-text-primary hover:bg-steel-light transition-colors shrink-0 sm:self-center disabled:opacity-60"
              >
                {previewLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Printer className="h-4 w-4" />
                )}
                {previewLoading ? "Loading..." : "Preview & Download"}
              </button>
            </div>

            {loading ? (
              <SkeletonExamGrid count={3} />
            ) : exams.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-border-default">
                <FileSpreadsheet className="mx-auto h-12 w-12 text-text-faint mb-3" />
                <h3 className="text-lg font-bold text-text-primary">No Exams Created Yet</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-6">
                  Create an exam questionnaire to generate printable PDF bubble sheets and enable automatic OMR grading.
                </p>
                <button
                  onClick={openNewBuilder}
                  className="rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary"
                >
                  Create First Exam
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {exams.map((exam) => {
                  const isOwner = exam.is_owner !== undefined ? exam.is_owner : true;
                  const isToggling = togglingVisibilityId === exam.id;
                  const questionCount = exam.questions?.filter((q) => q.question_text?.trim()).length || 0;
                  const isLocked = exam.is_public;

                  return (
                    <div
                      key={exam.id}
                      className="glass-card glass-card-hover rounded-2xl p-6 border border-border-default flex flex-col justify-between group transition-all"
                    >
                      <div>
                        {/* Status Bar: Public/Private Switch + Delete */}
                        <div className="flex items-center justify-between mb-3">
                          <button
                            type="button"
                            disabled={!isOwner || isToggling}
                            onClick={() => isOwner && handleToggleVisibility(exam)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border transition-all ${
                              exam.is_public
                                ? "bg-sage-ghost text-sage border-sage-border hover:bg-sage-ghost/80"
                                : "bg-surface-subtle text-text-muted border-border-emphasis hover:bg-surface-muted"
                            } ${isOwner ? "cursor-pointer" : "cursor-default"}`}
                            title={
                              isOwner
                                ? exam.is_public
                                  ? "Click to switch to Private"
                                  : "Click to switch to Public"
                                : "Visibility status"
                            }
                          >
                            {isToggling ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : exam.is_public ? (
                              <Globe className="h-3 w-3" />
                            ) : (
                              <Lock className="h-3 w-3" />
                            )}
                            <span>{exam.is_public ? "Public (Students Can View)" : "Private (Hidden)"}</span>
                          </button>

                          {isOwner && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setExamToDelete(exam)}
                                className="text-text-muted hover:text-burgundy-light hover:bg-burgundy-ghost rounded-lg transition-colors p-1.5"
                                title="Delete Exam"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-text-primary group-hover:text-tan-light transition-colors">
                          {exam.title}
                        </h3>

                        {/* Exam specs */}
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                          <span className="font-semibold text-text-secondary">{exam.total_questions} Questions</span>
                          <span>•</span>
                          <span className="text-sage font-mono font-medium">{exam.answer_keys.length} Keys Configured</span>
                          <span>•</span>
                          <span className={questionCount > 0 ? "text-tan font-medium" : "text-text-faint"}>
                            {questionCount > 0 ? `${questionCount} Reviewer Prompts` : "No Prompts Yet"}
                          </span>
                        </div>

                        {/* Visibility explanation note */}
                        <p className="mt-2.5 text-[11px] text-text-muted leading-relaxed">
                          {exam.is_public
                            ? "✓ Students who took this exam can view their score, shaded answers, correct keys, and reviewer."
                            : "🔒 Exam results and reviewer are private to teacher."}
                        </p>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-6 space-y-2 pt-4 border-t border-border-default">
                        {isOwner && (
                          <div className="grid grid-cols-2 gap-2">
                            {/* Edit / View Answer Keys */}
                            <button
                              onClick={() => !isLocked && openEditBuilder(exam, "keys")}
                              disabled={isLocked}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-semibold transition-colors ${
                                isLocked
                                  ? "bg-surface-base border-border-default text-text-faint cursor-not-allowed"
                                  : "bg-surface-overlay border-border-default text-text-primary hover:bg-surface-subtle"
                              }`}
                              title={isLocked ? "Make exam Private to edit keys" : "Edit answer keys"}
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5 text-text-faint" />
                              ) : (
                                <KeyRound className="h-3.5 w-3.5 text-tan" />
                              )}
                              {isLocked ? "Keys Locked" : "Edit Keys"}
                            </button>

                            {/* Questionnaire Modal Button */}
                            <button
                              onClick={() => !isLocked && openQuestionnaireModal(exam)}
                              disabled={isLocked}
                              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                                isLocked
                                  ? "bg-surface-base border-border-default text-text-faint cursor-not-allowed"
                                  : "bg-steel/15 border-steel-border text-tan-light hover:bg-steel/25"
                              }`}
                              title={isLocked ? "Make exam Private to edit questionnaire" : "Edit questionnaire"}
                            >
                              {isLocked ? (
                                <Lock className="h-3.5 w-3.5 text-text-faint" />
                              ) : (
                                <BookOpen className="h-3.5 w-3.5" />
                              )}
                              {isLocked ? "Locked" : "Questionnaire"}
                            </button>
                          </div>
                        )}

                        {!isOwner && exam.is_public && (
                          <button
                            onClick={() => handleCloneExam(exam.id)}
                            className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2 text-xs font-semibold text-text-primary hover:bg-surface-muted"
                          >
                            <Copy className="h-3.5 w-3.5 text-steel" />
                            Clone to My Exams
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Dedicated Questionnaire Editor Modal ────────────────── */}
      {questionnaireExam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          onClick={() => setQuestionnaireExam(null)}
        >
          <div
            className="relative flex flex-col bg-surface-overlay border border-border-emphasis rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border-default shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-tan" />
                  <h2 className="text-lg font-bold text-text-primary">
                    Questionnaire & Reviewer: {questionnaireExam.title}
                  </h2>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Write question prompts, multiple-choice options, and study explanations. Students can view this reviewer alongside their own score when the exam is Public.
                </p>
              </div>

              <button
                onClick={() => setQuestionnaireExam(null)}
                className="rounded-xl bg-surface-subtle p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filter & Progress Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-surface-base border-b border-border-default shrink-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-text-muted font-medium">Filter:</span>
                <button
                  onClick={() => setQuestionFilter("all")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    questionFilter === "all"
                      ? "bg-steel text-white"
                      : "bg-surface-overlay text-text-secondary"
                  }`}
                >
                  All ({questionnaireList.length})
                </button>
                <button
                  onClick={() => setQuestionFilter("missing")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    questionFilter === "missing"
                      ? "bg-steel text-white"
                      : "bg-surface-overlay text-text-secondary"
                  }`}
                >
                  Missing Text ({questionnaireList.filter((q) => !q.question_text?.trim()).length})
                </button>
                <button
                  onClick={() => setQuestionFilter("completed")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    questionFilter === "completed"
                      ? "bg-steel text-white"
                      : "bg-surface-overlay text-text-secondary"
                  }`}
                >
                  Completed ({questionnaireList.filter((q) => q.question_text?.trim()).length})
                </button>
              </div>

              {questionnaireSuccess && (
                <div className="flex items-center gap-1.5 text-xs text-sage font-semibold animate-pulse">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{questionnaireSuccess}</span>
                </div>
              )}
            </div>

            {/* Questionnaire Questions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {loadingQuestionnaire ? (
                <div className="py-12 flex flex-col items-center justify-center text-text-muted text-sm">
                  <Loader2 className="h-8 w-8 animate-spin mb-3 text-steel" />
                  Loading questionnaire questions...
                </div>
              ) : (
                questionnaireList
                  .filter((q) => {
                    if (questionFilter === "missing") return !q.question_text?.trim();
                    if (questionFilter === "completed") return !!q.question_text?.trim();
                    return true;
                  })
                  .map((q) => {
                    const keyObj = questionnaireExam.answer_keys.find(
                      (ak) => ak.question_number === q.question_number
                    );
                    const correctKey = keyObj?.correct_option || "A";

                    return (
                      <div
                        key={q.question_number}
                        className="rounded-2xl border border-border-default bg-surface-base p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-text-secondary">
                            Question #{q.question_number}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sage-ghost text-sage border border-sage-border">
                            Correct Key: {correctKey}
                          </span>
                        </div>

                        {/* Question Text */}
                        <div>
                          <label className="block text-[11px] font-medium text-text-muted mb-1">
                            Question Prompt
                          </label>
                          <textarea
                            rows={2}
                            placeholder={`e.g. What is the powerhouse of the cell?`}
                            value={q.question_text || ""}
                            onChange={(e) => {
                              const updated = questionnaireList.map((item) =>
                                item.question_number === q.question_number
                                  ? { ...item, question_text: e.target.value }
                                  : item
                              );
                              setQuestionnaireList(updated);
                            }}
                            className="w-full rounded-xl border border-border-emphasis bg-surface-overlay px-3 py-2 text-xs text-text-primary focus:border-steel focus:outline-none"
                          />
                        </div>

                        {/* Options A - D */}
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(["A", "B", "C", "D"] as const).map((opt) => {
                            const field = `option_${opt.toLowerCase()}` as keyof QuestionItem;
                            const isCorrect = correctKey === opt;

                            return (
                              <div
                                key={opt}
                                className={`flex items-center gap-2 rounded-xl border p-2 ${
                                  isCorrect
                                    ? "border-sage-border bg-sage-ghost/40"
                                    : "border-border-default bg-surface-overlay"
                                }`}
                              >
                                <span
                                  className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                    isCorrect
                                      ? "bg-sage text-white"
                                      : "bg-surface-muted text-text-muted"
                                  }`}
                                >
                                  {opt}
                                </span>
                                <input
                                  type="text"
                                  placeholder={`Choice ${opt}`}
                                  value={(q[field] as string) || ""}
                                  onChange={(e) => {
                                    const updated = questionnaireList.map((item) =>
                                      item.question_number === q.question_number
                                        ? { ...item, [field]: e.target.value }
                                        : item
                                    );
                                    setQuestionnaireList(updated);
                                  }}
                                  className="w-full bg-transparent text-xs text-text-primary focus:outline-none"
                                />
                                {isCorrect && (
                                  <span className="text-[10px] text-sage font-bold whitespace-nowrap">
                                    (Key)
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation Note */}
                        <div>
                          <label className="block text-[11px] font-medium text-text-muted mb-1">
                            Reviewer Explanation / Hint (Optional)
                          </label>
                          <input
                            type="text"
                            placeholder="Why is this the correct answer? Explain to help students review..."
                            value={q.explanation || ""}
                            onChange={(e) => {
                              const updated = questionnaireList.map((item) =>
                                item.question_number === q.question_number
                                  ? { ...item, explanation: e.target.value }
                                  : item
                              );
                              setQuestionnaireList(updated);
                            }}
                            className="w-full rounded-xl border border-dashed border-border-emphasis bg-surface-overlay px-3 py-1.5 text-xs text-text-muted focus:text-text-primary focus:border-tan focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border-default shrink-0 bg-surface-base">
              <span className="text-xs text-text-muted">
                {questionnaireList.filter((q) => q.question_text?.trim()).length} of {questionnaireList.length} questions configured
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuestionnaireExam(null)}
                  className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingQuestionnaire}
                  onClick={handleSaveQuestionnaire}
                  className="flex items-center gap-2 rounded-xl gradient-bg-primary px-5 py-2 text-xs font-semibold text-text-primary shadow-md shadow-steel/20 hover:opacity-95 transition-all disabled:opacity-60"
                >
                  {savingQuestionnaire ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Questionnaire
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Exam Confirmation Modal */}
      <ConfirmModal
        isOpen={!!examToDelete}
        title="Delete Exam Questionnaire"
        message={`Are you sure you want to delete "${examToDelete?.title}"? All associated answer keys and scan submissions for this exam will be permanently removed.`}
        confirmText="Delete Exam"
        cancelText="Cancel"
        variant="danger"
        icon={<Trash2 className="h-5 w-5 text-burgundy-light" />}
        onConfirm={confirmDeleteExam}
        onCancel={() => setExamToDelete(null)}
      />

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />

      {/* ── PDF Preview Modal ──────────────────────────────────── */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={closePreview}
        >
          <div
            className="relative flex flex-col bg-surface-overlay border border-border-emphasis rounded-2xl shadow-2xl w-full max-w-4xl"
            style={{ height: "90vh" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-border-default shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="h-4 w-4 text-steel" />
                <span className="text-sm font-bold text-text-primary">
                  Blank OMR Bubble Sheet — {blankQuestions} Questions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadFromPreview}
                  className="flex items-center gap-1.5 rounded-xl bg-steel px-4 py-1.5 text-xs font-bold text-text-primary hover:bg-steel-light transition-colors"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={closePreview}
                  className="rounded-xl bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors"
                >
                  ✕ Close
                </button>
              </div>
            </div>

            {/* PDF Viewer */}
            <iframe
              src={previewUrl}
              className="flex-1 w-full rounded-b-2xl bg-white"
              style={{ border: "none" }}
              title="Bubble Sheet Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
