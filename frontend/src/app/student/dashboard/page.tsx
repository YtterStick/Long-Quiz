"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { student as studentApi } from "@/lib/api";
import {
  GraduationCap,
  FileCheck,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Award,
  Eye,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Lock,
  Globe,
  FileText,
  Lightbulb,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonTable, SkeletonStudentInfoCard, SkeletonStudentStats } from "@/components/ui/Skeleton";

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

interface GradeItem {
  exam_id?: string;
  exam_title: string;
  total_score: number;
  max_score: number;
  percentage: number;
  scanned_image_url: string | null;
  is_published: boolean;
  is_public?: boolean;
  scanned_at: string;
  answers: Array<{
    id: string;
    question_number: number;
    shaded_option: string | null;
    is_correct: boolean;
  }>;
  answer_keys: Array<{
    id: string;
    question_number: number;
    correct_option: string;
  }>;
  questions?: QuestionItem[];
}

interface PublicReviewerItem {
  id: string;
  title: string;
  total_questions: number;
  is_public: boolean;
  created_at: string;
  answer_keys: Array<{ id: string; question_number: number; correct_option: string }>;
  questions: QuestionItem[];
}

interface StudentInfo {
  student_number: number;
  section_id: string;
  first_name: string;
  last_name: string;
  total_exams: number;
  average_percentage: number;
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"grades" | "reviewers">("grades");
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [publicReviewers, setPublicReviewers] = useState<PublicReviewerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviewers, setLoadingReviewers] = useState(false);

  // Forced Password Change Guard State
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Expanded feedback states
  const [expandedExamIndex, setExpandedExamIndex] = useState<number | null>(null);
  const [feedbackViewMode, setFeedbackViewMode] = useState<Record<number, "reviewer" | "grid">>({});
  const [expandedReviewerIndex, setExpandedReviewerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user || user.role !== "STUDENT") {
        router.push("/");
      }
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === "STUDENT" && !user.must_change_password) {
      Promise.all([studentApi.getDashboard(), studentApi.getGrades()])
        .then(([infoData, gradesData]) => {
          setInfo(infoData);
          setGrades(gradesData);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const loadPublicReviewers = async () => {
    if (publicReviewers.length > 0) return;
    setLoadingReviewers(true);
    try {
      const data = await studentApi.getPublicReviewers();
      setPublicReviewers(data);
    } catch (err) {
      console.error("Failed to load public reviewers:", err);
    } finally {
      setLoadingReviewers(false);
    }
  };

  const showPasswordReset = mustResetPassword || Boolean(user?.must_change_password);

  if (authLoading || showPasswordReset) {
    return (
      <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center">
        <PasswordChangeModal
          isOpen={true}
          forced={true}
          onClose={() => setMustResetPassword(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Welcome Header & Student ID Card */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-12 mb-8">
          <div className="md:col-span-8">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Student Grade & Study Portal
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Track your personal exam grades, check your paper sheet answers, and use public questionnaires as study reviewers.
            </p>
          </div>

          {/* Assigned 6-digit Student ID Card */}
          <div className="md:col-span-4">
            {loading ? (
              <SkeletonStudentInfoCard />
            ) : (
            <div className="glass-card rounded-2xl p-5 border border-border-default gradient-bg-primary/10 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-tan-light">
                    Your Assigned OMR Student ID
                  </p>
                  <p className="text-3xl font-extrabold font-mono text-sage mt-1 tracking-widest">
                    {info?.student_number || "------"}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>
              <p className="text-[10px] text-text-muted mt-3">
                * Shade this exact 6-digit ID on your paper bubble sheet during exams.
              </p>
            </div>
            )}
          </div>
        </div>

        {/* Stats Summary */}
        {loading ? (
          <SkeletonStudentStats />
        ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-8">
          <div className="glass-card rounded-2xl p-5 border border-border-default flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Public Graded Exams
              </p>
              <h3 className="mt-1 text-2xl font-bold text-text-primary">{info?.total_exams || 0}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tan-ghost text-tan">
              <FileCheck className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-border-default flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
                Overall Average Percentage
              </p>
              <h3 className="mt-1 text-2xl font-bold text-sage">
                {info?.average_percentage || 0}%
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-ghost text-sage">
              <Award className="h-5 w-5" />
            </div>
          </div>
        </div>
        )}

        {/* Portal Tabs: My Grades vs Study Reviewers */}
        <div className="flex items-center gap-2 mb-6 border-b border-border-default pb-2">
          <button
            onClick={() => setActiveTab("grades")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "grades"
                ? "bg-steel text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <Award className="h-4 w-4" />
            My Graded Exams ({grades.length})
          </button>

          <button
            onClick={() => {
              setActiveTab("reviewers");
              loadPublicReviewers();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === "reviewers"
                ? "bg-steel text-white shadow-sm"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Public Study Reviewers
          </button>
        </div>

        {/* TAB 1: My Graded Exams */}
        {activeTab === "grades" && (
          <div className="glass-card rounded-2xl p-6 border border-border-default">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary">
                  My Exam Grades & Answer Key Reviewers
                </h2>
                <p className="text-xs text-text-muted">
                  Only exams marked Public by your teacher are displayed here.
                </p>
              </div>

              {/* Privacy Notice Banner */}
              <div className="flex items-center gap-2 bg-surface-base border border-border-default px-3 py-1.5 rounded-xl text-[11px] text-text-secondary">
                <Lock className="h-3.5 w-3.5 text-tan" />
                <span>Strictly Private: Only you can view your score and answers</span>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={3} />
            ) : grades.length === 0 ? (
              <div className="py-12 text-center text-text-faint text-sm">
                No public exam grades available yet. When your teacher makes an exam public, your personal score, answers, and the reviewer key will appear here.
              </div>
            ) : (
              <div className="space-y-4">
                {grades.map((grade, idx) => {
                  const isExpanded = expandedExamIndex === idx;
                  const keyMap: Record<number, string> = {};
                  grade.answer_keys.forEach((k) => {
                    keyMap[k.question_number] = k.correct_option;
                  });

                  const questionMap: Record<number, QuestionItem> = {};
                  if (grade.questions) {
                    grade.questions.forEach((q) => {
                      questionMap[q.question_number] = q;
                    });
                  }

                  const hasQuestions = grade.questions && grade.questions.some((q) => q.question_text?.trim());
                  const currentMode = feedbackViewMode[idx] || (hasQuestions ? "reviewer" : "grid");

                  return (
                    <div
                      key={idx}
                      className="rounded-2xl border border-border-default bg-surface-base/80 p-5 transition-all"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              Public Exam
                            </span>
                            <span className="text-[10px] font-medium text-text-muted">
                              Private to you
                            </span>
                          </div>
                          <h3 className="text-lg font-bold text-text-primary mt-1.5">
                            {grade.exam_title}
                          </h3>
                          <p className="text-xs text-text-muted mt-0.5">
                            Scanned on {new Date(grade.scanned_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-2xl font-extrabold text-tan">
                              {grade.total_score}{" "}
                              <span className="text-sm text-text-faint">/ {grade.max_score}</span>
                            </p>
                            <p className="text-xs font-semibold text-sage">
                              {grade.percentage}%
                            </p>
                          </div>

                          <button
                            onClick={() => setExpandedExamIndex(isExpanded ? null : idx)}
                            className="flex items-center gap-1.5 rounded-xl bg-surface-overlay border border-border-emphasis px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-surface-subtle transition-colors"
                          >
                            <Eye className="h-4 w-4 text-tan" />
                            {isExpanded ? "Hide Reviewer" : "View Reviewer & Answers"}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Detailed Feedback & Reviewer Expansion */}
                      {isExpanded && (
                        <div className="mt-6 pt-5 border-t border-border-default space-y-5">
                          {/* Top Controls: View Mode Segmented Bar & Sheet Link */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center bg-surface-overlay border border-border-default p-1 rounded-xl">
                              <button
                                onClick={() => setFeedbackViewMode({ ...feedbackViewMode, [idx]: "reviewer" })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  currentMode === "reviewer"
                                    ? "bg-steel text-white"
                                    : "text-text-muted hover:text-text-primary"
                                }`}
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Study Reviewer Mode
                              </button>
                              <button
                                onClick={() => setFeedbackViewMode({ ...feedbackViewMode, [idx]: "grid" })}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                  currentMode === "grid"
                                    ? "bg-steel text-white"
                                    : "text-text-muted hover:text-text-primary"
                                }`}
                              >
                                <FileText className="h-3.5 w-3.5" />
                                OMR Bubble Grid
                              </button>
                            </div>

                            {/* Google Drive Embedded Image Link */}
                            {grade.scanned_image_url && (
                              <a
                                href={grade.scanned_image_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 rounded-xl bg-surface-overlay border border-border-default px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5 text-tan" />
                                View Original Scanned Paper Sheet
                              </a>
                            )}
                          </div>

                          {/* Confidentiality Reminder Banner */}
                          <div className="rounded-xl bg-surface-overlay p-3 border border-border-default flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 text-text-secondary">
                              <Lock className="h-4 w-4 text-sage" />
                              <span>
                                <strong>Confidential Review:</strong> Showing your score ({grade.total_score}/{grade.max_score}), your shaded choices, and the teacher&apos;s correct answer keys.
                              </span>
                            </div>
                            <span className="text-[11px] font-mono text-text-muted">
                              {grade.answers.filter((a) => a.is_correct).length} Correct • {grade.answers.filter((a) => !a.is_correct).length} Incorrect
                            </span>
                          </div>

                          {/* MODE 1: STUDY REVIEWER MODE */}
                          {currentMode === "reviewer" && (
                            <div className="space-y-4">
                              {grade.answers.map((ans) => {
                                const qObj = questionMap[ans.question_number];
                                const correctOpt = keyMap[ans.question_number];
                                const promptText = qObj?.question_text?.trim() || `Question #${ans.question_number}`;

                                return (
                                  <div
                                    key={ans.question_number}
                                    className={`rounded-2xl p-4 border transition-all ${
                                      ans.is_correct
                                        ? "bg-surface-overlay border-border-default"
                                        : "bg-burgundy-ghost/20 border-burgundy-border/50"
                                    }`}
                                  >
                                    {/* Question Header & Status */}
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-bold text-text-muted">
                                          Q{ans.question_number}.
                                        </span>
                                        <h4 className="text-sm font-semibold text-text-primary">
                                          {promptText}
                                        </h4>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        {ans.is_correct ? (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost border border-sage-border px-2.5 py-0.5 text-[11px] font-bold text-sage">
                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                            Correct (+1)
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 rounded-full bg-burgundy-ghost border border-burgundy-border px-2.5 py-0.5 text-[11px] font-bold text-burgundy-light">
                                            <XCircle className="h-3.5 w-3.5" />
                                            Incorrect (0)
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Choices A - D */}
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mt-3">
                                      {(["A", "B", "C", "D"] as const).map((opt) => {
                                        const optText = qObj ? (qObj[`option_${opt.toLowerCase()}` as keyof QuestionItem] as string) : "";
                                        const isCorrect = correctOpt === opt;
                                        const isShadedByStudent = ans.shaded_option === opt;

                                        let cardStyle = "bg-surface-base border-border-default text-text-secondary";
                                        if (isCorrect) {
                                          cardStyle = "bg-sage-ghost/50 border-sage-border text-text-primary font-semibold";
                                        } else if (isShadedByStudent && !isCorrect) {
                                          cardStyle = "bg-burgundy-ghost border-burgundy-border text-text-primary";
                                        }

                                        return (
                                          <div
                                            key={opt}
                                            className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition-all ${cardStyle}`}
                                          >
                                            <div className="flex items-center gap-2">
                                              <span
                                                className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                                  isCorrect
                                                    ? "bg-sage text-white"
                                                    : isShadedByStudent
                                                    ? "bg-burgundy text-white"
                                                    : "bg-surface-muted text-text-muted"
                                                }`}
                                              >
                                                {opt}
                                              </span>
                                              <span>{optText || `Option ${opt}`}</span>
                                            </div>

                                            <div className="flex items-center gap-1 text-[10px]">
                                              {isShadedByStudent && (
                                                <span className={`px-2 py-0.5 rounded-md font-bold ${
                                                  isCorrect
                                                    ? "bg-sage-ghost text-sage"
                                                    : "bg-burgundy-ghost text-burgundy-light"
                                                }`}>
                                                  Your Shaded Choice
                                                </span>
                                              )}
                                              {isCorrect && (
                                                <span className="px-2 py-0.5 rounded-md font-bold bg-sage-ghost text-sage">
                                                  ✓ Correct Answer
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Explanation note if provided */}
                                    {qObj?.explanation && (
                                      <div className="mt-3 flex items-start gap-2 rounded-xl bg-tan-ghost border border-tan-border p-3 text-xs text-tan-light">
                                        <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-tan" />
                                        <div>
                                          <strong className="font-semibold">Reviewer Explanation: </strong>
                                          <span>{qObj.explanation}</span>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* MODE 2: OMR SHEET BUBBLE GRID */}
                          {currentMode === "grid" && (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 font-mono text-xs">
                              {grade.answers.map((ans) => {
                                const correctOpt = keyMap[ans.question_number];
                                return (
                                  <div
                                    key={ans.question_number}
                                    className={`rounded-xl p-2.5 border ${
                                      ans.is_correct
                                        ? "bg-sage-ghost border-sage-border text-text-primary"
                                        : "bg-burgundy-ghost border-burgundy-border text-text-primary"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-text-muted">Q{ans.question_number}</span>
                                      {ans.is_correct ? (
                                        <CheckCircle2 className="h-4 w-4 text-sage" />
                                      ) : (
                                        <XCircle className="h-4 w-4 text-burgundy-light" />
                                      )}
                                    </div>
                                    <div className="mt-1 text-[11px]">
                                      <p className="text-text-secondary">
                                        Your Shaded:{" "}
                                        <span
                                          className={
                                            ans.shaded_option ? "font-bold text-tan" : "text-cream"
                                          }
                                        >
                                          {ans.shaded_option || "BLANK"}
                                        </span>
                                      </p>
                                      {!ans.is_correct && (
                                        <p className="text-sage font-semibold">
                                          Correct: {correctOpt || "N/A"}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Public Study Reviewers */}
        {activeTab === "reviewers" && (
          <div className="glass-card rounded-2xl p-6 border border-border-default">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-tan" />
                  Public Exam Questionnaires & Study Reviewers
                </h2>
                <p className="text-xs text-text-muted">
                  Browse public questionnaires and official answer keys published by your teachers to prepare and study.
                </p>
              </div>
            </div>

            {loadingReviewers ? (
              <SkeletonTable rows={3} />
            ) : publicReviewers.length === 0 ? (
              <div className="py-12 text-center text-text-faint text-sm">
                No public reviewers available right now. When teachers make exams public, they will be listed here.
              </div>
            ) : (
              <div className="space-y-4">
                {publicReviewers.map((rev, revIdx) => {
                  const isExpanded = expandedReviewerIndex === revIdx;
                  const keyMap: Record<number, string> = {};
                  rev.answer_keys.forEach((k) => {
                    keyMap[k.question_number] = k.correct_option;
                  });

                  return (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-border-default bg-surface-base/80 p-5 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                            Public Reviewer
                          </span>
                          <h3 className="text-lg font-bold text-text-primary mt-1.5">
                            {rev.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                            <span>{rev.total_questions} Questions</span>
                            <span>•</span>
                            <span>{rev.questions.filter((q) => q.question_text?.trim()).length} Prompts Configured</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedReviewerIndex(isExpanded ? null : revIdx)}
                          className="flex items-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2 text-xs font-semibold text-text-primary shadow-md shadow-steel/20"
                        >
                          <BookOpen className="h-4 w-4" />
                          {isExpanded ? "Hide Reviewer" : "Open Study Reviewer"}
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Expanded Public Reviewer Content */}
                      {isExpanded && (
                        <div className="mt-6 pt-5 border-t border-border-default space-y-4">
                          {rev.questions.map((q) => {
                            const correctKey = keyMap[q.question_number] || "A";

                            return (
                              <div
                                key={q.question_number}
                                className="rounded-2xl p-4 border border-border-default bg-surface-overlay space-y-3"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold text-text-muted">
                                      Q{q.question_number}.
                                    </span>
                                    <h4 className="text-sm font-semibold text-text-primary">
                                      {q.question_text || `Question #${q.question_number}`}
                                    </h4>
                                  </div>

                                  <span className="rounded-full bg-sage-ghost border border-sage-border px-2.5 py-0.5 text-[11px] font-bold text-sage">
                                    Answer Key: {correctKey}
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {(["A", "B", "C", "D"] as const).map((opt) => {
                                    const optText = q[`option_${opt.toLowerCase()}` as keyof QuestionItem] as string;
                                    const isCorrect = correctKey === opt;

                                    return (
                                      <div
                                        key={opt}
                                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs ${
                                          isCorrect
                                            ? "bg-sage-ghost border-sage-border text-text-primary font-semibold"
                                            : "bg-surface-base border-border-default text-text-secondary"
                                        }`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <span
                                            className={`flex h-5 w-5 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                              isCorrect
                                                ? "bg-sage text-white"
                                                : "bg-surface-muted text-text-muted"
                                            }`}
                                          >
                                            {opt}
                                          </span>
                                          <span>{optText || `Option ${opt}`}</span>
                                        </div>

                                        {isCorrect && (
                                          <span className="text-[10px] text-sage font-bold">
                                            ✓ Correct Key
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>

                                {q.explanation && (
                                  <div className="flex items-start gap-2 rounded-xl bg-tan-ghost border border-tan-border p-3 text-xs text-tan-light">
                                    <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-tan" />
                                    <div>
                                      <strong className="font-semibold">Reviewer Explanation: </strong>
                                      <span>{q.explanation}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
