"use client";

import React, { useEffect, useState, useRef } from "react";
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
  School,
  Shuffle,
  Timer,
  Sparkles,
  Sliders,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import {
  Skeleton,
  SkeletonExamGrid,
  SkeletonDashboardPage,
  SkeletonQuestionnaireList,
} from "@/components/ui/Skeleton";
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
  is_online_active?: boolean;
  is_grades_released?: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  has_time_limit?: boolean;
  time_limit_minutes?: number;
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
  const [isOnlineActive, setIsOnlineActive] = useState(false);
  const [isGradesReleased, setIsGradesReleased] = useState(false);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);
  const [shuffleOptions, setShuffleOptions] = useState(false);
  const [hasTimeLimit, setHasTimeLimit] = useState(false);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(60);
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
  const [questionnaireKeys, setQuestionnaireKeys] = useState<Record<number, string>>({});
  const [loadingQuestionnaire, setLoadingQuestionnaire] = useState(false);
  const [savingQuestionnaire, setSavingQuestionnaire] = useState(false);
  const [questionnaireSuccess, setQuestionnaireSuccess] = useState<string | null>(null);
  const [questionFilter, setQuestionFilter] = useState<"all" | "missing" | "completed">("all");

  // Discard confirmation & snapshot state for unsaved changes guard
  const initialQuestionnaireSnapshotRef = useRef<string>("");
  const initialBuilderSnapshotRef = useRef<string>("");
  const [showDiscardQuestionnaireConfirm, setShowDiscardQuestionnaireConfirm] = useState(false);
  const [showDiscardBuilderConfirm, setShowDiscardBuilderConfirm] = useState(false);

  // Toggling state trackers
  const [togglingVisibilityId, setTogglingVisibilityId] = useState<string | null>(null);
  const [togglingOnlineId, setTogglingOnlineId] = useState<string | null>(null);
  const [togglingGradesId, setTogglingGradesId] = useState<string | null>(null);

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const isDirty =
        (questionnaireExam && isQuestionnaireDirty()) ||
        (isBuilderOpen && isBuilderDirty());
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  const openNewBuilder = () => {
    setEditingExam(null);
    setTitle("");
    setTotalQuestions(50);
    setIsPublic(false);
    setShuffleQuestions(false);
    setShuffleOptions(false);
    setHasTimeLimit(false);
    setTimeLimitMinutes(60);
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
    initialBuilderSnapshotRef.current = JSON.stringify({
      title: "",
      totalQuestions: 50,
      isPublic: false,
      shuffleQuestions: false,
      shuffleOptions: false,
      hasTimeLimit: false,
      timeLimitMinutes: 60,
      keys: defaultKeys,
      questionsData: defaultQuestions,
    });
    setIsBuilderOpen(true);
  };

  const openEditBuilder = (exam: ExamItem, initialTab: "keys" | "questions" = "keys") => {
    setEditingExam(exam);
    setTitle(exam.title);
    setTotalQuestions(exam.total_questions);
    setIsPublic(exam.is_public);
    setShuffleQuestions(exam.shuffle_questions || false);
    setShuffleOptions(exam.shuffle_options || false);
    setHasTimeLimit(exam.has_time_limit || false);
    setTimeLimitMinutes(exam.time_limit_minutes || 60);
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
    initialBuilderSnapshotRef.current = JSON.stringify({
      title: exam.title,
      totalQuestions: exam.total_questions,
      isPublic: exam.is_public,
      shuffleQuestions: exam.shuffle_questions || false,
      shuffleOptions: exam.shuffle_options || false,
      hasTimeLimit: exam.has_time_limit || false,
      timeLimitMinutes: exam.time_limit_minutes || 60,
      keys: existingKeys,
      questionsData: existingQuestions,
    });
    setIsBuilderOpen(true);
  };

  const isBuilderDirty = () => {
    if (!isBuilderOpen) return false;
    const currentSnapshot = JSON.stringify({
      title,
      totalQuestions,
      isPublic,
      shuffleQuestions,
      shuffleOptions,
      hasTimeLimit,
      timeLimitMinutes,
      keys,
      questionsData,
    });
    return currentSnapshot !== initialBuilderSnapshotRef.current;
  };

  const handleRequestCloseBuilder = () => {
    if (isBuilderDirty()) {
      setShowDiscardBuilderConfirm(true);
    } else {
      setIsBuilderOpen(false);
    }
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
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          has_time_limit: hasTimeLimit,
          time_limit_minutes: timeLimitMinutes,
          answer_keys,
          questions: questions_payload,
        });
      } else {
        await teacherApi.createExam({
          title,
          total_questions: totalQuestions,
          is_public: isPublic,
          shuffle_questions: shuffleQuestions,
          shuffle_options: shuffleOptions,
          has_time_limit: hasTimeLimit,
          time_limit_minutes: timeLimitMinutes,
          answer_keys,
          questions: questions_payload,
        });
      }
      initialBuilderSnapshotRef.current = "";
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
        prev.map((e) =>
          e.id === exam.id
            ? { ...e, is_public: newStatus, is_grades_released: newStatus }
            : e
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to update visibility");
    } finally {
      setTogglingVisibilityId(null);
    }
  };

  // Toggle Online Web Quiz Mode
  const handleToggleOnline = async (exam: ExamItem) => {
    setTogglingOnlineId(exam.id);
    const nextStatus = !exam.is_online_active;
    try {
      const res = await teacherApi.toggleExamOnline(exam.id, nextStatus);
      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id ? { ...e, is_online_active: res.is_online_active } : e
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle online quiz mode");
    } finally {
      setTogglingOnlineId(null);
    }
  };

  // Toggle Grade & Reviewer Release
  const handleToggleGradesRelease = async (exam: ExamItem) => {
    setTogglingGradesId(exam.id);
    const nextStatus = !exam.is_grades_released;
    try {
      const res = await teacherApi.toggleExamGradesRelease(exam.id, nextStatus);
      setExams((prev) =>
        prev.map((e) =>
          e.id === exam.id
            ? {
                ...e,
                is_grades_released: res.is_grades_released,
                is_public: res.is_public,
              }
            : e
        )
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle grade release");
    } finally {
      setTogglingGradesId(null);
    }
  };

  // Open Dedicated Questionnaire Modal
  const openQuestionnaireModal = async (exam: ExamItem) => {
    setQuestionnaireExam(exam);
    setLoadingQuestionnaire(true);
    setQuestionnaireSuccess(null);
    setQuestionFilter("all");

    // Initialize answer keys state for the questionnaire modal
    const initialKeys: Record<number, string> = {};
    if (exam.answer_keys) {
      exam.answer_keys.forEach((ak) => {
        initialKeys[ak.question_number] = ak.correct_option;
      });
    }
    for (let i = 1; i <= exam.total_questions; i++) {
      if (!initialKeys[i]) initialKeys[i] = "A";
    }
    setQuestionnaireKeys(initialKeys);

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
      initialQuestionnaireSnapshotRef.current = JSON.stringify({
        questions: fullList,
        keys: initialKeys,
      });
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
      initialQuestionnaireSnapshotRef.current = JSON.stringify({
        questions: fullList,
        keys: initialKeys,
      });
    } finally {
      setLoadingQuestionnaire(false);
    }
  };

  const isQuestionnaireDirty = () => {
    if (!questionnaireExam) return false;
    const currentSnapshot = JSON.stringify({
      questions: questionnaireList,
      keys: questionnaireKeys,
    });
    return currentSnapshot !== initialQuestionnaireSnapshotRef.current;
  };

  const handleRequestCloseQuestionnaire = () => {
    if (isQuestionnaireDirty()) {
      setShowDiscardQuestionnaireConfirm(true);
    } else {
      setQuestionnaireExam(null);
    }
  };

  const handleSaveQuestionnaire = async () => {
    if (!questionnaireExam) return;
    setSavingQuestionnaire(true);
    setQuestionnaireSuccess(null);

    const questionsPayload = questionnaireList
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

    const keysPayload = Object.entries(questionnaireKeys).map(([qNum, opt]) => ({
      question_number: parseInt(qNum, 10),
      correct_option: opt,
    }));

    try {
      await teacherApi.updateQuestionnaire(questionnaireExam.id, questionsPayload, keysPayload);
      setQuestionnaireSuccess("Questionnaire and answer keys updated successfully!");
      initialQuestionnaireSnapshotRef.current = JSON.stringify({
        questions: questionnaireList,
        keys: questionnaireKeys,
      });
      setQuestionnaireExam((prev) =>
        prev
          ? {
              ...prev,
              answer_keys: keysPayload,
            }
          : null
      );
      await loadExams();
      setTimeout(() => setQuestionnaireSuccess(null), 3000);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to save questionnaire");
    } finally {
      setSavingQuestionnaire(false);
    }
  };

  if (authLoading) {
    return <SkeletonDashboardPage role="teacher" />;
  }

  return (
    <div className="min-h-screen text-text-primary">
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
                  onClick={handleRequestCloseBuilder}
                  className="rounded-xl bg-surface-subtle p-2 text-text-muted hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
                  title="Back to Exams"
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

                {/* Class Administration Notice */}
                <div className="flex items-center gap-3 rounded-xl bg-surface-base p-4 border border-border-default">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-tan-ghost border border-tan-border shrink-0">
                    <School className="h-5 w-5 text-tan" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-text-primary">
                      Class Quizzes & Grade Releases
                    </p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      This exam serves as a questionnaire and answer key bank. You can assign it to your classes and activate online quizzes or release grades inside <strong>Class Sections</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Online Quiz Configuration Card */}
              <div className="glass-card rounded-2xl p-6 border border-border-default space-y-5">
                <div className="flex items-center justify-between border-b border-border-default pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-steel/15 text-steel-light border border-steel-border">
                      <Sliders className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-text-primary">Online Quiz Configuration</h3>
                      <p className="text-[11px] text-text-muted">Configure student question rumbling, scrambled answer keys, and exam time limits</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Shuffle Questions Toggle Card */}
                  <div className={`p-4 rounded-xl border transition-all ${shuffleQuestions ? "bg-tan-ghost/20 border-tan/40 shadow-sm" : "bg-surface-base border-border-default"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${shuffleQuestions ? "bg-tan text-surface-base" : "bg-surface-overlay text-text-muted"}`}>
                          <Shuffle className="h-4 w-4" />
                        </div>
                        <div>
                          <label htmlFor="shuffleQuestionsToggle" className="text-xs font-bold text-text-primary cursor-pointer block">
                            Rumble Question Order
                          </label>
                          <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                            Randomizes question numbering (1..N) uniquely for each student to prevent screen peeking.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="shuffleQuestionsToggle"
                        role="switch"
                        aria-checked={shuffleQuestions}
                        onClick={() => setShuffleQuestions(!shuffleQuestions)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${shuffleQuestions ? "bg-tan" : "bg-surface-muted"}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${shuffleQuestions ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Shuffle Options / Scrambled Answer Key Toggle Card */}
                  <div className={`p-4 rounded-xl border transition-all ${shuffleOptions ? "bg-sage-ghost/20 border-sage/40 shadow-sm" : "bg-surface-base border-border-default"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${shuffleOptions ? "bg-sage text-white" : "bg-surface-overlay text-text-muted"}`}>
                          <Sparkles className="h-4 w-4" />
                        </div>
                        <div>
                          <label htmlFor="shuffleOptionsToggle" className="text-xs font-bold text-text-primary cursor-pointer block">
                            Scramble Choices (Different Answer Key)
                          </label>
                          <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                            Randomizes A, B, C, D choices per question so each student has different answer keys while grading remains 100% accurate.
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        id="shuffleOptionsToggle"
                        role="switch"
                        aria-checked={shuffleOptions}
                        onClick={() => setShuffleOptions(!shuffleOptions)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${shuffleOptions ? "bg-sage" : "bg-surface-muted"}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${shuffleOptions ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Exam Countdown Timer Card */}
                <div className={`p-4 rounded-xl border transition-all ${hasTimeLimit ? "bg-steel/10 border-steel-border shadow-sm" : "bg-surface-base border-border-default"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${hasTimeLimit ? "bg-steel text-white" : "bg-surface-overlay text-text-muted"}`}>
                        <Timer className="h-4 w-4" />
                      </div>
                      <div>
                        <label htmlFor="hasTimeLimitToggle" className="text-xs font-bold text-text-primary cursor-pointer block">
                          Exam Countdown Timer
                        </label>
                        <p className="text-[11px] text-text-muted mt-0.5 leading-snug">
                          Enables a countdown timer with visual warnings. Automatically submits the quiz when time expires.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      id="hasTimeLimitToggle"
                      role="switch"
                      aria-checked={hasTimeLimit}
                      onClick={() => setHasTimeLimit(!hasTimeLimit)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${hasTimeLimit ? "bg-steel" : "bg-surface-muted"}`}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${hasTimeLimit ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                  </div>

                  {/* Timer Duration Config */}
                  {hasTimeLimit && (
                    <div className="mt-4 pt-3 border-t border-border-default/60 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-text-muted mr-1">Presets:</span>
                        {[15, 30, 45, 60, 90, 120].map((mins) => (
                          <button
                            type="button"
                            key={mins}
                            onClick={() => setTimeLimitMinutes(mins)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${timeLimitMinutes === mins ? "bg-steel text-white shadow-sm" : "bg-surface-overlay text-text-secondary hover:bg-surface-muted"}`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs text-text-muted font-medium">Custom Duration:</label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={timeLimitMinutes}
                            onChange={(e) => setTimeLimitMinutes(Math.max(1, Math.min(300, parseInt(e.target.value) || 1)))}
                            className="w-20 rounded-lg border border-border-emphasis bg-surface-base px-2.5 py-1 text-xs text-text-primary focus:border-steel focus:outline-none font-mono text-center font-bold"
                          />
                          <span className="text-xs text-text-muted font-medium">min</span>
                        </div>
                      </div>
                    </div>
                  )}
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
                          className="rounded-2xl border border-border-default bg-surface-base p-4 space-y-3.5 hover:border-border-emphasis transition-colors"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border-default/60">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-text-secondary">
                                Question {qNum} of {totalQuestions}
                              </span>
                              {(() => {
                                const hasPrompt = !!q.question_text?.trim();
                                const hasChoices = !!(
                                  q.option_a?.trim() ||
                                  q.option_b?.trim() ||
                                  q.option_c?.trim() ||
                                  q.option_d?.trim()
                                );
                                if (hasPrompt && hasChoices) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-ghost text-sage border border-sage-border">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Question Ready
                                    </span>
                                  );
                                }
                                if (hasPrompt) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tan-ghost text-tan border border-tan-border">
                                      <CheckCircle2 className="h-2.5 w-2.5" />
                                      Question Added
                                    </span>
                                  );
                                }
                                return (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-text-muted">
                                    No Question Yet
                                  </span>
                                );
                              })()}
                            </div>

                            {/* Quick Answer Key Picker for this question */}
                            <div className="flex items-center gap-1.5 bg-surface-overlay px-2 py-1 rounded-xl border border-border-default">
                              <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 mr-0.5">
                                <KeyRound className="h-3 w-3 text-sage" />
                                Answer Key:
                              </span>
                              {(["A", "B", "C", "D"] as const).map((opt) => {
                                const isSelected = correctKey === opt;
                                return (
                                  <button
                                    type="button"
                                    key={opt}
                                    onClick={() => setKeys({ ...keys, [qNum]: opt })}
                                    title={`Set ${opt} as answer key for Question ${qNum}`}
                                    className={`h-6 w-6 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                      isSelected
                                        ? "bg-sage text-white shadow-md shadow-sage/30 scale-105 ring-2 ring-sage/40"
                                        : "bg-surface-base text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                );
                              })}
                            </div>
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
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-medium text-text-muted">
                                Choices (Click letter or Key pill to set correct answer)
                              </label>
                              <span className="text-[10px] text-text-muted font-mono">
                                Correct Key: <strong className="text-sage">{correctKey}</strong>
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {(["A", "B", "C", "D"] as const).map((opt) => {
                                const field = `option_${opt.toLowerCase()}` as keyof QuestionItem;
                                const isCorrect = correctKey === opt;

                                return (
                                  <div
                                    key={opt}
                                    className={`group flex items-center gap-2 rounded-xl border p-2 transition-all ${
                                      isCorrect
                                        ? "border-sage-border bg-sage-ghost/50 ring-1 ring-sage/30 shadow-sm"
                                        : "border-border-default bg-surface-overlay hover:border-border-emphasis"
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setKeys({ ...keys, [qNum]: opt })}
                                      title={
                                        isCorrect
                                          ? "Currently correct Answer Key"
                                          : `Click to set ${opt} as Answer Key`
                                      }
                                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                                        isCorrect
                                          ? "bg-sage text-white shadow-sm ring-2 ring-sage/40"
                                          : "bg-surface-muted text-text-muted hover:bg-sage/20 hover:text-sage"
                                      }`}
                                    >
                                      {opt}
                                    </button>
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
                                    {isCorrect ? (
                                      <span className="flex items-center gap-1 text-[10px] text-sage font-bold px-2 py-0.5 rounded-md bg-sage/15 whitespace-nowrap border border-sage-border">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Key
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setKeys({ ...keys, [qNum]: opt })}
                                        className="text-[10px] text-text-muted hover:text-sage font-medium whitespace-nowrap px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sage-ghost cursor-pointer"
                                        title={`Mark choice ${opt} as the correct answer key`}
                                      >
                                        Set key
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
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
                  onClick={handleRequestCloseBuilder}
                  className="rounded-xl border border-border-emphasis bg-surface-subtle px-5 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
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
                  onClick={() => {
                    setLoading(true);
                    setError(null);
                    setIncludePublic(!includePublic);
                  }}
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
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-steel-ghost shrink-0">
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
            ) : error && exams.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center border border-border-default">
                <AlertCircle className="mx-auto h-12 w-12 text-burgundy-light mb-3" />
                <h3 className="text-lg font-bold text-text-primary">Couldn&apos;t load exams</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-6">{error}</p>
                <button
                  onClick={() => {
                    setError(null);
                    loadExams();
                  }}
                  className="rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary"
                >
                  Retry
                </button>
              </div>
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
                        {/* Header: Title and Delete */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-base font-bold text-text-primary group-hover:text-tan-light transition-colors leading-snug">
                            {exam.title}
                          </h3>
                          {isOwner && (
                            <button
                              onClick={() => setExamToDelete(exam)}
                              className="text-text-muted hover:text-burgundy-light hover:bg-burgundy-ghost rounded-lg transition-colors p-1.5 shrink-0"
                              title="Delete Exam"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Exam specs */}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted mb-3">
                          <span className="font-semibold text-text-secondary">{exam.total_questions} Questions</span>
                          <span>•</span>
                          <span className="text-sage font-mono font-medium">{exam.answer_keys.length} Keys Configured</span>
                          <span>•</span>
                          <span className={questionCount > 0 ? "text-tan font-medium" : "text-text-faint"}>
                            {questionCount > 0 ? `${questionCount} Questions in Reviewer` : "No Prompts Yet"}
                          </span>
                        </div>

                        {/* Online Quiz Configuration Badges */}
                        {(exam.has_time_limit || exam.shuffle_questions || exam.shuffle_options) && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            {exam.has_time_limit && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-steel/15 text-steel-light border border-steel-border">
                                <Timer className="h-3 w-3" />
                                {exam.time_limit_minutes || 60}m Timer
                              </span>
                            )}
                            {exam.shuffle_questions && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-tan-ghost text-tan border border-tan-border">
                                <Shuffle className="h-3 w-3" />
                                Rumbled Questions
                              </span>
                            )}
                            {exam.shuffle_options && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sage-ghost text-sage border border-sage-border">
                                <Sparkles className="h-3 w-3" />
                                Scrambled Keys
                              </span>
                            )}
                          </div>
                        )}

                        {/* Class Administration Notice */}
                        <div className="flex items-center gap-2.5 rounded-xl bg-surface-base p-2.5 border border-border-default text-xs text-text-muted my-3">
                          <School className="h-4 w-4 text-tan shrink-0" />
                          <span className="text-[11px] leading-tight">
                            To activate web quiz or release grades, assign this exam to your class in <strong>Class Sections</strong>.
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 space-y-2 pt-3 border-t border-border-default">
                        {isOwner && (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {/* Edit / View Answer Keys */}
                              <button
                                onClick={() => openEditBuilder(exam, "keys")}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-border-default bg-surface-overlay py-2 text-xs font-semibold text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
                                title="Edit answer keys"
                              >
                                <KeyRound className="h-3.5 w-3.5 text-tan" />
                                Edit Keys
                              </button>

                              {/* Questionnaire Modal Button */}
                              <button
                                onClick={() => openQuestionnaireModal(exam)}
                                className="flex items-center justify-center gap-1.5 rounded-xl border border-steel-border bg-steel/15 py-2 text-xs font-bold text-tan-light hover:bg-steel/25 transition-all cursor-pointer"
                                title="Edit questionnaire"
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Questionnaire
                              </button>
                            </div>

                            {/* Print / Preview Bubble Sheet */}
                            <button
                              onClick={() => {
                                setBlankQuestions(exam.total_questions);
                                openPreview();
                              }}
                              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-1.5 text-[11px] font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              Preview Bubble Sheet ({exam.total_questions} Questions)
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
          onClick={handleRequestCloseQuestionnaire}
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
                  Write question prompts, multiple-choice choices, study explanations, and select correct answer keys.
                </p>
              </div>

              <button
                onClick={handleRequestCloseQuestionnaire}
                className="rounded-xl bg-surface-subtle p-2 text-text-secondary hover:bg-surface-muted hover:text-text-primary transition-colors cursor-pointer"
                title="Close questionnaire"
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
                  Missing Question ({questionnaireList.filter((q) => !q.question_text?.trim()).length})
                </button>
                <button
                  onClick={() => setQuestionFilter("completed")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    questionFilter === "completed"
                      ? "bg-steel text-white"
                      : "bg-surface-overlay text-text-secondary"
                  }`}
                >
                  Question Ready ({questionnaireList.filter((q) => q.question_text?.trim()).length})
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
                <SkeletonQuestionnaireList count={4} />
              ) : (
                questionnaireList
                  .filter((q) => {
                    if (questionFilter === "missing") return !q.question_text?.trim();
                    if (questionFilter === "completed") return !!q.question_text?.trim();
                    return true;
                  })
                  .map((q) => {
                    const correctKey = questionnaireKeys[q.question_number] || "A";

                    return (
                      <div
                        key={q.question_number}
                        className="rounded-2xl border border-border-default bg-surface-base p-4 space-y-3.5 hover:border-border-emphasis transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border-default/60">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-text-secondary">
                              Question #{q.question_number}
                            </span>
                            {(() => {
                              const hasPrompt = !!q.question_text?.trim();
                              const hasChoices = !!(
                                q.option_a?.trim() ||
                                q.option_b?.trim() ||
                                q.option_c?.trim() ||
                                q.option_d?.trim()
                              );
                              if (hasPrompt && hasChoices) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sage-ghost text-sage border border-sage-border">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Question Ready
                                  </span>
                                );
                              }
                              if (hasPrompt) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tan-ghost text-tan border border-tan-border">
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Question Added
                                  </span>
                                );
                              }
                              return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface-muted text-text-muted">
                                  No Question Yet
                                </span>
                              );
                            })()}
                          </div>

                          {/* Quick Answer Key Picker for this question */}
                          <div className="flex items-center gap-1.5 bg-surface-overlay px-2 py-1 rounded-xl border border-border-default">
                            <span className="text-[11px] font-semibold text-text-muted flex items-center gap-1 mr-0.5">
                              <KeyRound className="h-3 w-3 text-sage" />
                              Answer Key:
                            </span>
                            {(["A", "B", "C", "D"] as const).map((opt) => {
                              const isSelected = correctKey === opt;
                              return (
                                <button
                                  type="button"
                                  key={opt}
                                  onClick={() =>
                                    setQuestionnaireKeys((prev) => ({
                                      ...prev,
                                      [q.question_number]: opt,
                                    }))
                                  }
                                  title={`Select ${opt} as correct answer for Question ${q.question_number}`}
                                  className={`h-6 w-6 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                                    isSelected
                                      ? "bg-sage text-white shadow-md shadow-sage/30 scale-105 ring-2 ring-sage/40"
                                      : "bg-surface-base text-text-muted hover:bg-surface-subtle hover:text-text-primary"
                                  }`}
                                >
                                  {opt}
                                </button>
                              );
                            })}
                          </div>
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
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[11px] font-medium text-text-muted">
                              Choices (Click letter or Key pill to set correct answer)
                            </label>
                            <span className="text-[10px] text-text-muted font-mono">
                              Correct Key: <strong className="text-sage">{correctKey}</strong>
                            </span>
                          </div>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {(["A", "B", "C", "D"] as const).map((opt) => {
                              const field = `option_${opt.toLowerCase()}` as keyof QuestionItem;
                              const isCorrect = correctKey === opt;

                              return (
                                <div
                                  key={opt}
                                  className={`group flex items-center gap-2 rounded-xl border p-2 transition-all ${
                                    isCorrect
                                      ? "border-sage-border bg-sage-ghost/50 ring-1 ring-sage/30 shadow-sm"
                                      : "border-border-default bg-surface-overlay hover:border-border-emphasis"
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setQuestionnaireKeys((prev) => ({
                                        ...prev,
                                        [q.question_number]: opt,
                                      }))
                                    }
                                    title={
                                      isCorrect
                                        ? "Currently correct Answer Key"
                                        : `Click to set ${opt} as Answer Key`
                                    }
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold transition-all cursor-pointer ${
                                      isCorrect
                                        ? "bg-sage text-white shadow-sm ring-2 ring-sage/40"
                                        : "bg-surface-muted text-text-muted hover:bg-sage/20 hover:text-sage"
                                    }`}
                                  >
                                    {opt}
                                  </button>
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
                                  {isCorrect ? (
                                    <span className="flex items-center gap-1 text-[10px] text-sage font-bold px-2 py-0.5 rounded-md bg-sage/15 whitespace-nowrap border border-sage-border">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Key
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setQuestionnaireKeys((prev) => ({
                                          ...prev,
                                          [q.question_number]: opt,
                                        }))
                                      }
                                      className="text-[10px] text-text-muted hover:text-sage font-medium whitespace-nowrap px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sage-ghost cursor-pointer"
                                      title={`Mark choice ${opt} as the correct answer key`}
                                    >
                                      Set key
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
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
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>
                  {questionnaireList.filter((q) => q.question_text?.trim()).length} of {questionnaireList.length} questions configured
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleRequestCloseQuestionnaire}
                  className="rounded-xl border border-border-emphasis bg-surface-subtle px-4 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  disabled={savingQuestionnaire}
                  onClick={handleSaveQuestionnaire}
                  className="flex items-center gap-2 rounded-xl gradient-bg-primary px-5 py-2 text-xs font-bold text-text-primary shadow-md shadow-steel/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-60"
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

      {/* Discard Questionnaire Changes Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardQuestionnaireConfirm}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this questionnaire. If you exit now, any modifications to question prompts, choices, or answer keys will be lost."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="warning"
        icon={<AlertCircle className="h-5 w-5 text-tan" />}
        onConfirm={() => {
          setShowDiscardQuestionnaireConfirm(false);
          setQuestionnaireExam(null);
        }}
        onCancel={() => setShowDiscardQuestionnaireConfirm(false)}
      />

      {/* Discard Exam Builder Changes Confirmation Modal */}
      <ConfirmModal
        isOpen={showDiscardBuilderConfirm}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this exam. If you go back now, your edits will be discarded."
        confirmText="Discard Changes"
        cancelText="Keep Editing"
        variant="warning"
        icon={<AlertCircle className="h-5 w-5 text-tan" />}
        onConfirm={() => {
          setShowDiscardBuilderConfirm(false);
          setIsBuilderOpen(false);
        }}
        onCancel={() => setShowDiscardBuilderConfirm(false)}
      />

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
                  className="flex items-center gap-1.5 rounded-xl bg-surface-subtle px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
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
