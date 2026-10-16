"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Navbar } from "@/components/Navbar";
import { StudentHandoutReviewer } from "@/components/StudentHandoutReviewer";
import { SkeletonReviewerList } from "@/components/ui/Skeleton";
import { student as studentApi } from "@/lib/api";
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Lightbulb,
  Sparkles,
  Search,
  LayoutDashboard,
} from "lucide-react";

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

interface PublicReviewerItem {
  id: string;
  title: string;
  total_questions: number;
  is_public: boolean;
  created_at: string;
  answer_keys: Array<{ id: string; question_number: number; correct_option: string }>;
  questions: QuestionItem[];
}

export default function StudentReviewerPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<"ai_handout" | "public_exams">("ai_handout");
  const [publicReviewers, setPublicReviewers] = useState<PublicReviewerItem[]>([]);
  const [loadingReviewers, setLoadingReviewers] = useState(false);
  const [expandedReviewerIndex, setExpandedReviewerIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    } else if (!authLoading && user && user.role !== "STUDENT") {
      router.push("/login");
    }
  }, [user, authLoading, router]);

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

  useEffect(() => {
    if (mode === "public_exams") {
      loadPublicReviewers();
    }
  }, [mode]);

  if (authLoading || !user) {
    return null;
  }

  const filteredPublicReviewers = publicReviewers.filter((rev) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      rev.title?.toLowerCase().includes(q) ||
      rev.questions.some((item) => item.question_text?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-surface-base text-text-primary flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-3 sm:px-6 py-4 sm:py-6 pb-28 sm:pb-16 space-y-4 sm:space-y-6">
        {/* Streamlined Reviewer Header (NO WelcomeHero, NO Wardrobe clutter) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-surface-raised border border-border-default shadow-xs">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link
              href="/student/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border-default bg-surface-base text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition active:scale-95 text-xs font-bold shadow-xs shrink-0"
              title="Return to Student Dashboard"
              aria-label="Return to Student Dashboard"
            >
              <ChevronLeft className="h-4 w-4" />
              <LayoutDashboard className="h-3.5 w-3.5 text-sage" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-text-muted">
                <Link href="/student/dashboard" className="hover:text-text-primary transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="inline-flex items-center gap-1 font-bold text-steel uppercase tracking-wider font-mono">
                  <Sparkles className="h-3 w-3" />
                  Study Reviewers
                </span>
              </div>
              <h1 className="text-base sm:text-xl font-black text-text-primary truncate leading-tight mt-0.5">
                Flashcards &amp; Practice Reviewer
              </h1>
            </div>
          </div>

          {/* Sub-mode Switcher: AI Handout vs Teacher Decks */}
          <div className="grid grid-cols-2 p-1 rounded-xl sm:rounded-2xl bg-surface-subtle border border-border-default w-full sm:w-auto shrink-0">
            <button
              type="button"
              onClick={() => setMode("ai_handout")}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer min-h-10 ${
                mode === "ai_handout"
                  ? "bg-steel text-white shadow-sm shadow-steel/20"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>AI Handouts</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("public_exams")}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg sm:rounded-xl text-xs font-bold transition-all cursor-pointer min-h-10 ${
                mode === "public_exams"
                  ? "bg-steel text-white shadow-sm shadow-steel/20"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Teacher Decks</span>
              {publicReviewers.length > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono shrink-0 ${
                    mode === "public_exams" ? "bg-white/20 text-white" : "bg-surface-muted text-text-muted"
                  }`}
                >
                  {publicReviewers.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Mode 1: AI Handout Reviewer Deck Engine ───────────── */}
        {mode === "ai_handout" && (
          <div className="rv-fade">
            <StudentHandoutReviewer />
          </div>
        )}

        {/* ── Mode 2: Teacher Public Questionnaires & Official Answer Keys ── */}
        {mode === "public_exams" && (
          <div className="glass-card rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-border-default space-y-4 rv-fade">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-tan" />
                  Teacher Public Questionnaires
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Browse official questionnaires and answer keys released by your teachers.
                </p>
              </div>

              {publicReviewers.length > 0 && (
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search questionnaire..."
                    className="w-full rounded-xl border border-border-default bg-surface-base py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-faint focus:border-steel focus:outline-none transition"
                  />
                </div>
              )}
            </div>

            {loadingReviewers ? (
              <SkeletonReviewerList count={3} />
            ) : filteredPublicReviewers.length === 0 ? (
              <div className="py-12 text-center text-text-faint text-sm border-2 border-dashed border-border-default rounded-2xl p-6">
                <FileText className="mx-auto h-8 w-8 text-text-faint mb-2" />
                <p className="font-semibold text-text-secondary">
                  {searchQuery ? "No questionnaires match your search." : "No public reviewers available right now."}
                </p>
                <p className="text-xs text-text-muted mt-1">
                  When your teachers make questionnaires public, they will automatically appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPublicReviewers.map((rev, revIdx) => {
                  const isExpanded = expandedReviewerIndex === revIdx;
                  const keyMap: Record<number, string> = {};
                  rev.answer_keys.forEach((k) => {
                    keyMap[k.question_number] = k.correct_option;
                  });

                  return (
                    <div
                      key={rev.id}
                      className="rounded-2xl border border-border-default bg-surface-base/80 p-4 sm:p-5 transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <span className="rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                            Public Reviewer
                          </span>
                          <h3 className="text-base sm:text-lg font-bold text-text-primary mt-1.5">
                            {rev.title}
                          </h3>
                          <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                            <span>{rev.total_questions} Questions</span>
                            <span>•</span>
                            <span>
                              {rev.questions.filter((q) => q.question_text?.trim()).length} Prompts Configured
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedReviewerIndex(isExpanded ? null : revIdx)}
                          className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary shadow-md shadow-steel/20 w-full sm:w-auto cursor-pointer"
                        >
                          <BookOpen className="h-4 w-4" />
                          <span>{isExpanded ? "Hide Reviewer" : "Open Study Reviewer"}</span>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>

                      {/* Expanded Questionnaire Items */}
                      {isExpanded && (
                        <div className="mt-6 pt-5 border-t border-border-default space-y-4 rv-fade">
                          {rev.questions.map((q) => {
                            const correctKey = keyMap[q.question_number] || "A";

                            return (
                              <div
                                key={q.question_number}
                                className="rounded-2xl p-4 border border-border-default bg-surface-overlay space-y-3"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="font-mono text-xs font-bold text-text-muted shrink-0">
                                      Q{q.question_number}.
                                    </span>
                                    <h4 className="text-sm font-semibold text-text-primary truncate">
                                      {q.question_text || `Question #${q.question_number}`}
                                    </h4>
                                  </div>

                                  <span className="rounded-full bg-sage-ghost border border-sage-border px-2.5 py-0.5 text-[11px] font-bold text-sage shrink-0">
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
                                        <div className="flex items-center gap-2 min-w-0">
                                          <span
                                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md font-mono text-[10px] font-bold ${
                                              isCorrect
                                                ? "bg-sage text-white"
                                                : "bg-surface-muted text-text-muted"
                                            }`}
                                          >
                                            {opt}
                                          </span>
                                          <span className="truncate">{optText || `Option ${opt}`}</span>
                                        </div>

                                        {isCorrect && (
                                          <span className="text-[10px] text-sage font-bold flex items-center gap-1 shrink-0">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Key
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
                                      <strong className="font-semibold">Explanation: </strong>
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
    </div>
  );
}
