"use client";

import React, { useEffect, useRef, useState } from "react";
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
  Send,
  PenTool,
  Sparkles,
  Loader2,
  X,
  ArrowRight,
  AlertCircle,
  Check,
  Maximize,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Monitor,
  Play,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import { SkeletonTable, SkeletonStudentStats } from "@/components/ui/Skeleton";
import { ConfirmModal } from "@/components/ConfirmModal";

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
  is_grades_released?: boolean;
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
  release_mode?: "FULL" | "SCORES_ONLY";
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

interface AvailableExamItem {
  id: string;
  title: string;
  total_questions: number;
  is_public: boolean;
  is_online_active?: boolean;
  is_grades_released?: boolean;
  created_at: string;
  teacher_name: string;
  question_count: number;
  has_submitted: boolean;
  submission_id?: string | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  submitted_at?: string | null;
}

interface ExamTakingQuestion {
  question_number: number;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
}

interface ExamTakingDetail {
  id: string;
  title: string;
  total_questions: number;
  is_public: boolean;
  is_online_active?: boolean;
  is_grades_released?: boolean;
  created_at: string;
  teacher_name: string;
  has_submitted: boolean;
  submission_id?: string | null;
  total_score?: number | null;
  max_score?: number | null;
  percentage?: number | null;
  questions: ExamTakingQuestion[];
}

interface StudentInfo {
  student_number: number;
  full_student_id?: string;
  static_prefix?: string;
  section_id: string;
  first_name: string;
  last_name: string;
  total_exams: number;
  average_percentage: number;
}

export default function StudentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "grades" | "reviewers">("available");
  const [info, setInfo] = useState<StudentInfo | null>(null);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [availableExams, setAvailableExams] = useState<AvailableExamItem[]>([]);
  const [publicReviewers, setPublicReviewers] = useState<PublicReviewerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingReviewers, setLoadingReviewers] = useState(false);

  // Online Exam Taking & Proctoring State
  const [mobileBlockedOpen, setMobileBlockedOpen] = useState(false);
  const [examLobbyOpen, setExamLobbyOpen] = useState(false);
  const [lobbyExamId, setLobbyExamId] = useState<string | null>(null);
  const [lobbyExamInfo, setLobbyExamInfo] = useState<{
    title: string;
    total_questions: number;
    teacher_name: string;
  } | null>(null);
  const [isWaitingInLobby, setIsWaitingInLobby] = useState(false);
  const [isExamInProgress, setIsExamInProgress] = useState(false);
  const [antiCheatStrikes, setAntiCheatStrikes] = useState(0);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  // Refs keep the anti-cheat engine free of stale closures / double-firing
  const strikesRef = useRef(0);
  const awayRef = useRef(false);
  const autoSubmittingRef = useRef(false);
  const [antiCheatAlert, setAntiCheatAlert] = useState<{
    message: string;
    type: "blur" | "fullscreen";
  } | null>(null);

  const [activeTakingExam, setActiveTakingExam] = useState<ExamTakingDetail | null>(null);
  const [takingAnswers, setTakingAnswers] = useState<Record<number, string>>({});
  const [loadingTakingExam, setLoadingTakingExam] = useState(false);
  const [submittingOnlineExam, setSubmittingOnlineExam] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Celebration / Submission Result Modal
  const [submissionSuccessResult, setSubmissionSuccessResult] = useState<{
    submission_id: string;
    exam_id: string;
    exam_title: string;
    total_score?: number | null;
    max_score?: number | null;
    percentage?: number | null;
    is_grades_released?: boolean;
  } | null>(null);

  // Forced Password Change Guard State
  const [mustResetPassword, setMustResetPassword] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  // Expanded feedback states
  const [expandedExamIndex, setExpandedExamIndex] = useState<number | null>(null);
  const [feedbackViewMode, setFeedbackViewMode] = useState<Record<number, "reviewer" | "grid">>({});
  const [expandedReviewerIndex, setExpandedReviewerIndex] = useState<number | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!authLoading && mounted) {
      if (!user || user.role !== "STUDENT") {
        router.push("/");
      }
    }
  }, [user, authLoading, mounted, router]);

  const refreshAllStudentData = async () => {
    try {
      const [infoData, gradesData, availableData] = await Promise.all([
        studentApi.getDashboard(),
        studentApi.getGrades(),
        studentApi.listAvailableExams(),
      ]);
      setInfo(infoData);
      setGrades(gradesData);
      setAvailableExams(availableData);
    } catch (err) {
      console.error("Failed to load student data:", err);
    }
  };

  useEffect(() => {
    if (user && user.role === "STUDENT" && !user.must_change_password) {
      setLoading(true);
      refreshAllStudentData().finally(() => setLoading(false));
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "available" || tabParam === "grades" || tabParam === "reviewers") {
        setActiveTab(tabParam);
        if (tabParam === "reviewers") {
          loadPublicReviewers();
        }
      }
    }

    const handleTabChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "available" || detail === "grades" || detail === "reviewers") {
        setActiveTab(detail);
        if (detail === "reviewers") {
          loadPublicReviewers();
        }
      }
    };
    window.addEventListener("studentTabChange", handleTabChange);
    return () => window.removeEventListener("studentTabChange", handleTabChange);
  }, []);

  const handleTabSelect = (tab: "available" | "grades" | "reviewers") => {
    setActiveTab(tab);
    if (tab === "reviewers") {
      loadPublicReviewers();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("studentTabChange", { detail: tab }));
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState({}, "", url.toString());
    }
  };

  const handleOpenTakeExam = async (examId: string) => {
    // 1. Device Gate: Desktop / Laptop only (not mobile phone)
    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 1024);

    if (isMobile) {
      setMobileBlockedOpen(true);
      return;
    }

    setLoadingTakingExam(true);
    setSubmitError(null);
    setTakingAnswers({});
    try {
      // Ping lobby first to check status
      const res = await studentApi.pingLobby(examId, { is_fullscreen: false, is_focused: true });
      if (res.status === "SUBMITTED") {
        alert("You have already submitted this exam. Each exam can only be taken once.");
        return;
      }
      if (res.status === "CLOSED") {
        alert("This online exam is currently closed by your instructor.");
        return;
      }

      setLobbyExamId(examId);
      setLobbyExamInfo({
        title: res.title,
        total_questions: res.total_questions,
        teacher_name: res.teacher_name,
      });
      setIsWaitingInLobby(false);
      setExamLobbyOpen(true);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to enter exam lobby");
    } finally {
      setLoadingTakingExam(false);
    }
  };

  const handleJoinLobbyFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch (e) {
      console.warn("Fullscreen request error:", e);
    }

    // Engage W3C Keyboard Lock API in fullscreen (captures Alt+Tab, Escape, Meta keys in Chrome/Edge)
    if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.lock === "function") {
      try {
        await (navigator as any).keyboard.lock(["Tab", "AltLeft", "AltRight", "Escape", "MetaLeft", "MetaRight"]);
      } catch {
        try {
          await (navigator as any).keyboard.lock();
        } catch {}
      }
    }

    setIsWaitingInLobby(true);
    setAntiCheatStrikes(0);
    setTabSwitchCount(0);
    strikesRef.current = 0;
    awayRef.current = false;
    autoSubmittingRef.current = false;
    setAntiCheatAlert(null);
  };

  const handleLeaveLobby = async () => {
    if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.unlock === "function") {
      try {
        (navigator as any).keyboard.unlock();
      } catch {}
    }
    if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen().catch(() => {});
    }
    setIsWaitingInLobby(false);
    setExamLobbyOpen(false);
    setLobbyExamId(null);
    setLobbyExamInfo(null);
  };

  // Lobby Polling Effect: pings backend every 2 seconds while in lobby
  useEffect(() => {
    if (!isWaitingInLobby || !lobbyExamId) return;

    let isSubscribed = true;

    const doPing = async () => {
      try {
        const isFullscreen = Boolean(document.fullscreenElement);
        const isFocused = !document.hidden;
        const res = await studentApi.pingLobby(lobbyExamId, {
          is_fullscreen: isFullscreen,
          is_focused: isFocused,
        });

        if (!isSubscribed) return;

        if (res.status === "STARTED") {
          // Instructor started the exam! Fetch questions and begin immediately
          const detail = await studentApi.getExamForTaking(lobbyExamId);
          setActiveTakingExam(detail);
          setIsWaitingInLobby(false);
          setExamLobbyOpen(false);
          setIsExamInProgress(true);
          setAntiCheatStrikes(0);
          strikesRef.current = 0;
          awayRef.current = false;
          autoSubmittingRef.current = false;
          setAntiCheatAlert(null);
        } else if (res.status === "CLOSED") {
          if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
            await document.exitFullscreen().catch(() => {});
          }
          setIsWaitingInLobby(false);
          setExamLobbyOpen(false);
          setLobbyExamId(null);
          setLobbyExamInfo(null);
          alert("The online exam lobby was closed by your instructor.");
        }
      } catch (err) {
        console.error("Lobby ping error:", err);
      }
    };

    doPing();
    const interval = setInterval(doPing, 2000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [isWaitingInLobby, lobbyExamId]);

  const handleSelectOption = (questionNumber: number, optionKey: string) => {
    setTakingAnswers((prev) => ({
      ...prev,
      [questionNumber]: optionKey,
    }));
  };

  const doSubmitExam = async (autoSubmitted = false) => {
    if (!activeTakingExam) return;
    setSubmittingOnlineExam(true);
    setSubmitError(null);

    const answersPayload = Object.entries(takingAnswers).map(([qNum, opt]) => ({
      question_number: Number(qNum),
      selected_option: opt,
    }));

    try {
      const res = await studentApi.submitExamOnline(activeTakingExam.id, {
        answers: answersPayload,
        auto_submitted: autoSubmitted,
      });

      if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.unlock === "function") {
        try {
          (navigator as any).keyboard.unlock();
        } catch {}
      }
      if (typeof document !== "undefined" && document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => {});
      }

      setConfirmSubmitOpen(false);
      setIsExamInProgress(false);
      setAntiCheatAlert(null);
      setActiveTakingExam(null);
      setSubmissionSuccessResult({
        submission_id: res.submission_id,
        exam_id: res.exam_id,
        exam_title: res.exam_title,
        total_score: res.total_score ?? null,
        max_score: res.max_score ?? null,
        percentage: res.percentage ?? null,
        is_grades_released: res.is_grades_released ?? false,
      });

      await refreshAllStudentData();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit exam");
    } finally {
      setSubmittingOnlineExam(false);
    }
  };

  const handleConfirmSubmit = async () => {
    await doSubmitExam();
  };

  const handleAutoSubmit = async (reason: string) => {
    if (autoSubmittingRef.current) return;
    autoSubmittingRef.current = true;
    if (activeTakingExam) {
      alert(`Security Violation: ${reason}. Auto-submitting your exam now.`);
      await doSubmitExam(true);
    } else if (isWaitingInLobby && lobbyExamId) {
      // Violation in lobby
      alert(`Security Violation: ${reason}. Exiting exam lobby.`);
      handleLeaveLobby();
    }
  };

  // Exam heartbeat: keeps the teacher's live monitor updated while the student is answering
  useEffect(() => {
    if (!isExamInProgress || !lobbyExamId) return;
    const beat = () => {
      studentApi
        .pingLobby(lobbyExamId, {
          is_fullscreen: Boolean(document.fullscreenElement),
          is_focused: !document.hidden && document.hasFocus(),
        })
        .catch(() => {});
    };
    beat();
    const interval = setInterval(beat, 3000);
    return () => clearInterval(interval);
  }, [isExamInProgress, lobbyExamId]);

  // Anti-Cheat Engine: monitors fullscreen exits and tab switching / Alt-Tab (Active during both Lobby & Exam)
  useEffect(() => {
    const isGuarded = isExamInProgress || isWaitingInLobby;
    if (!isGuarded) return;

    const MAX_STRIKES = 3;

    const registerStrike = (reason: string) => {
      strikesRef.current += 1;
      setAntiCheatStrikes(strikesRef.current);
      if (strikesRef.current >= MAX_STRIKES) {
        handleAutoSubmit(reason);
      }
    };

    const report = (type: "TAB" | "FULLSCREEN") => {
      if (!lobbyExamId) return;
      studentApi
        .pingLobby(lobbyExamId, {
          is_fullscreen: Boolean(document.fullscreenElement),
          is_focused: type === "TAB" ? false : !document.hidden,
          violation: true,
          violation_type: type,
        })
        .catch(() => {});
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.unlock === "function") {
          try {
            (navigator as any).keyboard.unlock();
          } catch {}
        }
        report("FULLSCREEN");
        setAntiCheatAlert({
          message:
            "Full-screen mode was exited! Full-screen mode is strictly required. Please re-enter full-screen immediately.",
          type: "fullscreen",
        });
        registerStrike(`Maximum security violations reached (${MAX_STRIKES} strikes)`);
      } else {
        // Re-lock keyboard on fullscreen re-entry
        if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.lock === "function") {
          (navigator as any).keyboard.lock(["Tab", "AltLeft", "AltRight", "Escape", "MetaLeft", "MetaRight"]).catch(() => {
            (navigator as any).keyboard.lock().catch(() => {});
          });
        }
      }
    };

    // A single Alt-Tab can fire both `blur` and `visibilitychange`; count it once per away-episode.
    const onFocusLost = (customReason?: string) => {
      if (awayRef.current) return;
      awayRef.current = true;
      setTabSwitchCount((c) => c + 1);
      report("TAB");

      // Aggressively attempt to bring focus back to the window
      try {
        window.focus();
        setTimeout(() => {
          try { window.focus(); } catch {}
        }, 50);
      } catch {}

      setAntiCheatAlert({
        message: customReason || "Focus Lost! Alt-Tab or switching away from the exam window is prohibited and blocked.",
        type: "blur",
      });
      registerStrike(`Maximum tab switch / focus loss violations reached (${MAX_STRIKES} strikes)`);
    };

    const onFocusRegained = () => {
      if (!document.hidden && document.hasFocus()) {
        awayRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) onFocusLost("Tab or window was hidden!");
      else onFocusRegained();
    };

    // Keyboard capture: intercepts and neutralizes Alt+Tab, Alt alone, Tab during Alt, Windows key, etc.
    const onKeyDownCapture = (e: KeyboardEvent) => {
      const isAlt = e.altKey || e.key === "Alt" || e.code?.startsWith("Alt");
      const isTab = e.key === "Tab" || e.code === "Tab";
      const isMeta = e.metaKey || e.key === "Meta" || e.key === "OS" || e.code?.startsWith("Meta");
      const isCtrl = e.ctrlKey || e.key === "Control";

      // Block Alt+Tab or Alt held with Tab
      if ((isAlt && isTab) || (e.altKey && isTab) || (isAlt && e.key === "Tab")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onFocusLost("Alt-Tab was intercepted and blocked!");
        return false;
      }

      // Block Alt key alone or combined with navigation (Alt+Left/Right, Alt+F4)
      if (isAlt && (e.key === "F4" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Block Windows / Meta key (start menu popup)
      if (isMeta) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onFocusLost("Windows / Command key was blocked!");
        return false;
      }

      // Block browser tab navigation / closing / opening
      if (
        isCtrl &&
        (isTab ||
          e.key === "w" || e.key === "W" ||
          e.key === "t" || e.key === "T" ||
          e.key === "n" || e.key === "N" ||
          e.key === "r" || e.key === "R" ||
          e.key === "q" || e.key === "Q" ||
          e.key === "u" || e.key === "U")
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Block Developer Tools (F12, Ctrl+Shift+I/J/C)
      if (
        e.key === "F12" ||
        (isCtrl && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c"))
      ) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        return false;
      }

      // Suppress Escape key from canceling fullscreen
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onKeyUpCapture = (e: KeyboardEvent) => {
      const isAlt = e.altKey || e.key === "Alt" || e.code?.startsWith("Alt");
      const isTab = e.key === "Tab" || e.code === "Tab";
      if ((isAlt && isTab) || (e.altKey && isTab)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    // Prevent right-click context menu and copy/paste/cut during exam
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", () => onFocusLost());
    window.addEventListener("focus", onFocusRegained);
    window.addEventListener("keydown", onKeyDownCapture, { capture: true });
    window.addEventListener("keyup", onKeyUpCapture, { capture: true });
    document.addEventListener("contextmenu", onContextMenu, { capture: true });
    document.addEventListener("copy", onClipboard, { capture: true });
    document.addEventListener("cut", onClipboard, { capture: true });
    document.addEventListener("paste", onClipboard, { capture: true });

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", () => onFocusLost());
      window.removeEventListener("focus", onFocusRegained);
      window.removeEventListener("keydown", onKeyDownCapture, { capture: true });
      window.removeEventListener("keyup", onKeyUpCapture, { capture: true });
      document.removeEventListener("contextmenu", onContextMenu, { capture: true });
      document.removeEventListener("copy", onClipboard, { capture: true });
      document.removeEventListener("cut", onClipboard, { capture: true });
      document.removeEventListener("paste", onClipboard, { capture: true });
    };
  }, [isExamInProgress, isWaitingInLobby, activeTakingExam, lobbyExamId, takingAnswers]);


  const showPasswordReset = mustResetPassword || Boolean(user?.must_change_password);

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-surface-base text-text-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-steel" />
      </div>
    );
  }

  if (showPasswordReset) {
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

      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-12 space-y-6">
        {/* Elevated Student Header Hero Banner */}
        <div className="relative overflow-hidden rounded-[28px] border border-border-emphasis/60 bg-surface-raised p-6 sm:p-7 shadow-lg">
          <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-sage/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-4 -bottom-10 h-36 w-36 rounded-full bg-steel/10 blur-2xl" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="rounded-full bg-sage-ghost px-3 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                  Student Portal
                </span>
                {info && (info.full_student_id || info.student_number) && (
                  <span className="rounded-full bg-steel-ghost px-3 py-0.5 text-[10px] font-bold text-steel font-mono border border-steel-border">
                    ID: {info.full_student_id || info.student_number}
                  </span>
                )}
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-text-primary">
                Welcome back, {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : "Student"}! 👋
              </h1>
              <p className="text-xs text-text-muted mt-1 max-w-xl">
                Take live proctored online exams, review graded bubble sheet results, and explore public study reviewer question banks.
              </p>
            </div>

            {info && info.average_percentage !== undefined && (
              <div className="flex items-center gap-3 rounded-2xl bg-surface-base border border-border-default p-3.5 shadow-sm shrink-0 self-start sm:self-auto">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border shadow-inner">
                  <Award className="h-5 w-5" />
                </div>
                <div className="text-left sm:text-right">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">Overall Average</span>
                  <span className="text-lg font-black text-sage font-mono">{info.average_percentage}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modern Segmented Tab Switcher */}
        <div className="p-1.5 rounded-[22px] bg-surface-raised border border-border-default grid grid-cols-3 gap-1.5 shadow-sm">
          <button
            type="button"
            onClick={() => handleTabSelect("available")}
            className={`flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === "available"
                ? "bg-steel text-white shadow-md shadow-steel/25"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <PenTool className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Available Exams</span>
            <span className="sm:hidden">Exams</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === "available" ? "bg-white/20 text-white" : "bg-surface-subtle text-text-muted"
            }`}>
              {availableExams.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect("grades")}
            className={`flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === "grades"
                ? "bg-steel text-white shadow-md shadow-steel/25"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <Award className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">My Graded Exams</span>
            <span className="sm:hidden">Results</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === "grades" ? "bg-white/20 text-white" : "bg-surface-subtle text-text-muted"
            }`}>
              {grades.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabSelect("reviewers")}
            className={`flex items-center justify-center gap-2 py-3 rounded-[16px] text-xs font-bold transition-all cursor-pointer ${
              activeTab === "reviewers"
                ? "bg-steel text-white shadow-md shadow-steel/25"
                : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
            }`}
          >
            <BookOpen className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">Study Reviewers</span>
            <span className="sm:hidden">Reviewers</span>
          </button>
        </div>

        {/* TAB 0: Available Online Exams */}
        {activeTab === "available" && (
          <div className="glass-card rounded-[28px] p-5 sm:p-7 border border-border-default shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div>
                <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                  <PenTool className="h-5 w-5 text-steel-light" />
                  Available Online Exams
                </h2>
                <p className="text-xs text-text-muted mt-0.5">
                  Published questionnaires with multiple-choice questions released by your teachers. Take them online and receive immediate grading.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-surface-base border border-border-default px-3 py-1.5 rounded-xl text-[11px] text-text-secondary self-start sm:self-auto">
                <Globe className="h-3.5 w-3.5 text-sage" />
                <span>Live Student Questionnaire System</span>
              </div>
            </div>

            {loading ? (
              <SkeletonTable rows={3} />
            ) : availableExams.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-surface-subtle border border-border-default text-text-faint">
                  <BookOpen className="h-8 w-8" />
                </div>
                <h3 className="text-base font-bold text-text-primary">No Online Exams Released Yet</h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">
                  When your teachers publish question prompts and multiple-choice choices, they will appear here ready for you to answer.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="glass-card glass-card-hover rounded-2xl p-4 sm:p-5 border border-border-default flex flex-col justify-between space-y-4 hover:border-steel/40 transition-all shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="rounded-full bg-steel/15 px-2.5 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30">
                          {exam.teacher_name}
                        </span>

                        {exam.has_submitted ? (
                          exam.is_grades_released && exam.percentage !== null ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sage-ghost px-2.5 py-0.5 text-[10px] font-bold text-sage border border-sage-border">
                              <CheckCircle2 className="h-3 w-3" />
                              Graded ({exam.percentage}%)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/20">
                              <Lock className="h-3 w-3" />
                              Submitted • Pending Grade Release
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-tan-ghost px-2.5 py-0.5 text-[10px] font-bold text-tan border border-tan-border">
                            <Sparkles className="h-3 w-3" />
                            Online Exam Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-text-primary">{exam.title}</h3>

                      <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="font-semibold text-text-secondary">{exam.total_questions} Questions</span>
                        <span>•</span>
                        <span className="text-steel font-medium font-mono">{exam.question_count} Prompts</span>
                        {exam.has_submitted && exam.is_grades_released && exam.percentage !== null && (
                          <>
                            <span>•</span>
                            <span className="text-sage font-bold font-mono">
                              Score: {exam.total_score}/{exam.max_score} ({exam.percentage}%)
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-border-default/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <span className="text-[11px] text-text-muted">
                        {exam.has_submitted
                          ? exam.is_grades_released
                            ? "Grades & reviewer released"
                            : "Submitted. Scores released by teacher later."
                          : "Desktop full-screen proctored questionnaire"}
                      </span>

                      {exam.has_submitted ? (
                        exam.is_grades_released && exam.percentage !== null ? (
                          <button
                            type="button"
                            onClick={() => {
                              handleTabSelect("grades");
                              const gIdx = grades.findIndex((g) => g.exam_id === exam.id);
                              if (gIdx !== -1) setExpandedExamIndex(gIdx);
                            }}
                            className="flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2.5 text-xs font-semibold text-text-primary hover:bg-surface-muted transition-colors cursor-pointer w-full sm:w-auto"
                          >
                            <Eye className="h-3.5 w-3.5 text-steel-light" />
                            View Grade & Reviewer
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 py-1">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Awaiting Teacher Grade Release</span>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenTakeExam(exam.id)}
                          disabled={loadingTakingExam}
                          className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-bold text-text-primary shadow-md shadow-steel/20 hover:opacity-95 transition-all cursor-pointer w-full sm:w-auto"
                        >
                          {loadingTakingExam ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <PenTool className="h-3.5 w-3.5" />
                          )}
                          Enter Exam Lobby
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 1: My Graded Exams */}
        {activeTab === "grades" && (
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border-default">
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
              <div className="flex items-center gap-2 bg-surface-base border border-border-default px-3 py-1.5 rounded-xl text-[11px] text-text-secondary self-start sm:self-auto">
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
                      className="rounded-2xl border border-border-default bg-surface-base/80 p-4 sm:p-5 transition-all"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
                          <h3 className="text-base sm:text-lg font-bold text-text-primary mt-1.5">
                            {grade.exam_title}
                          </h3>
                          <p className="text-xs text-text-muted mt-0.5">
                            Scanned on {new Date(grade.scanned_at).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 pt-2.5 sm:pt-0 border-t sm:border-0 border-border-default/40">
                          <div className="text-left sm:text-right">
                            <p className="text-xl sm:text-2xl font-extrabold text-tan">
                              {grade.total_score}{" "}
                              <span className="text-sm text-text-faint">/ {grade.max_score}</span>
                            </p>
                            <p className="text-xs font-semibold text-sage">
                              {grade.percentage}%
                            </p>
                          </div>

                          {grade.release_mode === "SCORES_ONLY" ? (
                            <span className="flex items-center gap-1.5 rounded-xl bg-surface-overlay border border-border-default px-3 py-2 text-[11px] font-semibold text-text-muted">
                              <Lock className="h-3.5 w-3.5 text-tan" />
                              Score only • Answer key not released
                            </span>
                          ) : (
                          <button
                            onClick={() => setExpandedExamIndex(isExpanded ? null : idx)}
                            className="flex items-center justify-center gap-1.5 rounded-xl bg-surface-overlay border border-border-emphasis px-3.5 py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-subtle transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4 text-tan" />
                            {isExpanded ? "Hide Reviewer" : "View Answers"}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                          )}
                        </div>
                      </div>

                      {/* Detailed Feedback & Reviewer Expansion */}
                      {isExpanded && grade.release_mode !== "SCORES_ONLY" && (
                        <div className="mt-6 pt-5 border-t border-border-default space-y-5">
                          {/* Top Controls: View Mode Segmented Bar & Sheet Link */}
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center bg-surface-overlay border border-border-default p-1 rounded-xl w-full sm:w-auto">
                              <button
                                onClick={() => setFeedbackViewMode({ ...feedbackViewMode, [idx]: "reviewer" })}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  currentMode === "reviewer"
                                    ? "bg-steel text-white shadow-xs"
                                    : "text-text-muted hover:text-text-primary"
                                }`}
                              >
                                <BookOpen className="h-3.5 w-3.5" />
                                Study Reviewer Mode
                              </button>
                              <button
                                onClick={() => setFeedbackViewMode({ ...feedbackViewMode, [idx]: "grid" })}
                                className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  currentMode === "grid"
                                    ? "bg-steel text-white shadow-xs"
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
          <div className="glass-card rounded-2xl p-4 sm:p-6 border border-border-default">
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
                            <span>{rev.questions.filter((q) => q.question_text?.trim()).length} Prompts Configured</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setExpandedReviewerIndex(isExpanded ? null : revIdx)}
                          className="flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary px-4 py-2.5 text-xs font-semibold text-text-primary shadow-md shadow-steel/20 w-full sm:w-auto cursor-pointer"
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

      {/* 1. Modal: Mobile Phone Blocked Gate */}
      {mobileBlockedOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border">
              <Lock className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-black text-text-primary">
              Desktop Examination Only
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              Per academic regulations, online long quizzes must be completed on a <strong>desktop or laptop computer</strong> in full-screen mode. Mobile phones and small touchscreens are not permitted for this assessment.
            </p>
            <p className="text-[11px] text-text-muted">
              Please log in to your student account using a desktop web browser (Chrome, Edge, or Safari) to take this exam.
            </p>
            <button
              type="button"
              onClick={() => setMobileBlockedOpen(false)}
              className="w-full rounded-xl gradient-bg-primary text-text-primary font-bold py-2.5 text-xs shadow-md cursor-pointer hover:opacity-95"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal: Exam Lobby (Desktop Fullscreen & Anti-Cheat Preparation) */}
      {examLobbyOpen && lobbyExamInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-border-default bg-surface-overlay p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            {!isWaitingInLobby ? (
              /* Step 1: Pre-Lobby Honor Code & Fullscreen Entry */
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="rounded-full bg-steel/15 px-2.5 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30">
                      Examination Lobby
                    </span>
                    <h2 className="text-xl font-black text-text-primary mt-1">
                      {lobbyExamInfo.title}
                    </h2>
                    <p className="text-xs text-text-muted mt-0.5">
                      Instructor: {lobbyExamInfo.teacher_name} • {lobbyExamInfo.total_questions} Questions
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleLeaveLobby}
                    className="rounded-xl bg-surface-subtle p-2 text-text-secondary hover:text-text-primary cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Honor Code & Security Protocols */}
                <div className="rounded-2xl bg-surface-base border border-border-default p-4 space-y-3 text-xs">
                  <h4 className="font-bold text-text-primary flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-tan" />
                    Examination Protocols & Integrity Guidelines
                  </h4>
                  <ul className="space-y-2.5 text-text-secondary text-[11px] leading-relaxed">
                    <li className="flex items-start gap-2">
                      <span className="text-steel font-bold shrink-0">1.</span>
                      <span><strong>Class Simultaneous Start:</strong> Clicking below enters the live lobby in full screen. You will wait until your instructor releases the exam for the entire class.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-steel font-bold shrink-0">2.</span>
                      <span><strong>Full Screen Mode Required:</strong> You must remain in full screen. Leaving full-screen mode is recorded as a violation.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-steel font-bold shrink-0">3.</span>
                      <span><strong>Alt-Tab & Window Switch Forbidden:</strong> Leaving the exam window or switching tabs is strictly forbidden (3 strikes auto-submits).</span>
                    </li>
                  </ul>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleLeaveLobby}
                    className="flex-1 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted cursor-pointer"
                  >
                    Cancel & Return
                  </button>
                  <button
                    type="button"
                    onClick={handleJoinLobbyFullscreen}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 cursor-pointer"
                  >
                    <Maximize className="h-4 w-4" />
                    Enter Fullscreen & Join Lobby
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: Active Fullscreen Waiting Lobby */
              <div className="text-center py-4 space-y-6">
                {/* Pulsing Radar Ring Animation */}
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sage/20 opacity-75" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border shadow-lg">
                    <Clock className="h-8 w-8 animate-pulse" />
                  </div>
                </div>

                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-sage-ghost px-3 py-1 text-xs font-bold text-sage border border-sage-border">
                    <span className="inline-block h-2 w-2 rounded-full bg-sage animate-ping" />
                    Checked Into Class Lobby
                  </span>
                  <h2 className="text-2xl font-black text-text-primary mt-2">
                    {lobbyExamInfo.title}
                  </h2>
                  <p className="text-xs text-text-muted mt-1">
                    Instructor: {lobbyExamInfo.teacher_name} • {lobbyExamInfo.total_questions} Questions
                  </p>
                </div>

                {/* Live Integrity Badges */}
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto text-xs">
                  <div className="rounded-xl border border-sage-border bg-sage-ghost/30 p-3 text-left">
                    <span className="text-[10px] text-text-muted block">Screen Mode</span>
                    <strong className="text-sage flex items-center gap-1 mt-0.5 text-xs">
                      <Maximize className="h-3.5 w-3.5" /> Fullscreen Locked
                    </strong>
                  </div>
                  <div className="rounded-xl border border-sage-border bg-sage-ghost/30 p-3 text-left">
                    <span className="text-[10px] text-text-muted block">Anti-Cheat</span>
                    <strong className="text-sage flex items-center gap-1 mt-0.5 text-xs">
                      <ShieldCheck className="h-3.5 w-3.5" /> Proctored Active
                    </strong>
                  </div>
                </div>

                {/* Waiting Banner */}
                <div className="rounded-2xl border border-steel-border bg-steel-ghost p-4 max-w-md mx-auto text-xs text-left space-y-1.5">
                  <div className="font-bold text-text-primary flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-steel animate-spin shrink-0" />
                    Waiting for Instructor to start the exam...
                  </div>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Your instructor is reviewing the live lobby roster. As soon as the teacher clicks <strong>Start Exam</strong>, this window will automatically load your test questions.
                  </p>
                  <p className="text-[10px] text-burgundy-light font-semibold pt-1">
                    ⚠️ Do not exit fullscreen or switch tabs. Any focus loss is recorded as a violation strike.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleLeaveLobby}
                    className="rounded-xl border border-border-emphasis bg-surface-subtle px-5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Leave Lobby & Exit Fullscreen
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* 3. Modal: Active Proctored Online Exam */}
      {isExamInProgress && activeTakingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-2 sm:p-4 select-none">
          <div className="w-full max-w-4xl h-[96vh] flex flex-col rounded-2xl border border-border-default bg-surface-overlay shadow-2xl overflow-hidden">
            {/* Modal Header with Fullscreen Indicator */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-border-default bg-surface-base shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-steel/15 px-2.5 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30">
                    <Maximize className="h-3 w-3" />
                    Proctored Fullscreen Exam
                  </span>
                  <span className="text-xs text-text-muted">By {activeTakingExam.teacher_name}</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-text-primary mt-0.5">
                  {activeTakingExam.title}
                </h2>
              </div>

              {/* Progress Tracker */}
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="font-mono text-xs font-bold text-tan">
                    {Object.keys(takingAnswers).length} of {activeTakingExam.questions.length} Answered
                  </span>
                  <div className="w-32 h-1.5 rounded-full bg-surface-subtle mt-1 overflow-hidden">
                    <div
                      className="h-full bg-steel transition-all duration-300"
                      style={{
                        width: `${(Object.keys(takingAnswers).length / (activeTakingExam.questions.length || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Questions Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {submitError && (
                <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {activeTakingExam.questions.length === 0 ? (
                <div className="py-12 text-center text-xs text-text-muted">
                  No questions found in this exam.
                </div>
              ) : (
                activeTakingExam.questions.map((q) => {
                  const selectedOption = takingAnswers[q.question_number];
                  const optionsList: Array<{ key: string; text?: string | null }> = [
                    { key: "A", text: q.option_a },
                    { key: "B", text: q.option_b },
                    { key: "C", text: q.option_c },
                    { key: "D", text: q.option_d },
                  ];

                  return (
                    <div
                      key={q.question_number}
                      className="rounded-2xl border border-border-default bg-surface-base p-5 space-y-4 shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-text-muted">
                          Question #{q.question_number}
                        </span>
                        {selectedOption ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-steel/15 px-2.5 py-0.5 text-[10px] font-bold text-steel-light border border-steel/30">
                            <Check className="h-3 w-3" />
                            Choice {selectedOption}
                          </span>
                        ) : (
                          <span className="rounded-full bg-surface-subtle px-2.5 py-0.5 text-[10px] font-medium text-text-muted border border-border-emphasis">
                            Unanswered
                          </span>
                        )}
                      </div>

                      {/* Question Text Prompt */}
                      <p className="text-sm font-semibold text-text-primary leading-relaxed">
                        {q.question_text || `Question ${q.question_number}`}
                      </p>

                      {/* Multiple Choice Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {optionsList.map(({ key, text }) => {
                          const isSelected = selectedOption === key;

                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleSelectOption(q.question_number, key)}
                              className={`flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all cursor-pointer select-none ${
                                isSelected
                                  ? "border-steel bg-steel/20 text-text-primary ring-1 ring-steel shadow-md"
                                  : "border-border-emphasis/60 bg-surface-subtle/70 hover:bg-surface-muted hover:border-steel/50 text-text-secondary"
                              }`}
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono font-bold text-xs transition-colors ${
                                  isSelected
                                    ? "bg-steel text-white shadow-sm"
                                    : "bg-surface-base border border-border-emphasis text-text-muted"
                                }`}
                              >
                                {key}
                              </div>
                              <span className="text-xs font-medium leading-snug flex-1">
                                {text || `Option ${key}`}
                              </span>
                              {isSelected && (
                                <Check className="h-4 w-4 shrink-0 text-steel-light" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Sticky Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-border-default shrink-0 bg-surface-base">
              <div className="text-xs text-text-muted flex items-center gap-2">
                <span className="font-semibold text-text-primary font-mono">
                  {Object.keys(takingAnswers).length} / {activeTakingExam.questions.length}
                </span>
                <span>questions answered</span>
                {Object.keys(takingAnswers).length < activeTakingExam.questions.length && (
                  <span className="text-tan font-medium">
                    ({activeTakingExam.questions.length - Object.keys(takingAnswers).length} remaining)
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={submittingOnlineExam || activeTakingExam.questions.length === 0}
                  onClick={() => {
                    if (Object.keys(takingAnswers).length < activeTakingExam.questions.length) {
                      setConfirmSubmitOpen(true);
                    } else {
                      handleConfirmSubmit();
                    }
                  }}
                  className="flex items-center gap-2 rounded-xl gradient-bg-primary px-6 py-2.5 text-xs font-bold text-text-primary shadow-lg shadow-steel/20 hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submittingOnlineExam ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Submit Answers
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Modal: Anti-Cheat Violation Alert */}
      {antiCheatAlert && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 select-none">
          <div className="w-full max-w-md rounded-2xl border border-burgundy-border bg-surface-overlay p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-burgundy-ghost text-burgundy-light border border-burgundy-border">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-black text-burgundy-light">
              Academic Integrity Warning
            </h2>
            <p className="text-xs text-text-secondary leading-relaxed">
              {antiCheatAlert.message}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-burgundy-ghost/50 border border-burgundy-border p-3 text-xs font-mono font-bold text-burgundy-light">
                Strikes: {antiCheatStrikes} / 3
              </div>
              <div className="rounded-xl bg-burgundy-ghost/50 border border-burgundy-border p-3 text-xs font-mono font-bold text-burgundy-light">
                Alt-Tabs: {tabSwitchCount}
              </div>
            </div>
            <p className="text-[11px] text-text-muted">
              Alt-Tab, window switching, or leaving full-screen is forbidden. 3 strikes will trigger automatic submission of your examination.
            </p>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                  }
                  if (typeof navigator !== "undefined" && "keyboard" in navigator && typeof (navigator as any).keyboard?.lock === "function") {
                    try {
                      await (navigator as any).keyboard.lock(["Tab", "AltLeft", "AltRight", "Escape", "MetaLeft", "MetaRight"]);
                    } catch {
                      try {
                        await (navigator as any).keyboard.lock();
                      } catch {}
                    }
                  }
                } catch (e) {
                  console.warn("Fullscreen request error:", e);
                }
                setAntiCheatAlert(null);
              }}
              className="w-full rounded-xl bg-burgundy-light text-white font-bold py-2.5 text-xs shadow-md cursor-pointer hover:opacity-95 transition-all"
            >
              Re-Enter Fullscreen & Resume Exam
            </button>
          </div>
        </div>
      )}

      {/* Confirmation Modal when submitting incomplete exam */}
      <ConfirmModal
        isOpen={confirmSubmitOpen}
        title="Submit Incomplete Exam?"
        message={`You have answered ${Object.keys(takingAnswers).length} out of ${activeTakingExam?.questions.length || 0} questions. Any unanswered questions will receive 0 points. Are you sure you want to submit now?`}
        confirmText="Yes, Submit Now"
        cancelText="Review Questions"
        variant="warning"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setConfirmSubmitOpen(false)}
      />

      {/* 5. Modal: Post-Submission Confirmation (Scores Private Until Released) */}
      {submissionSuccessResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-default bg-surface-overlay p-6 shadow-2xl text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-text-primary">
                Exam Submitted!
              </h2>
              <p className="text-xs text-text-muted mt-1 font-medium">
                {submissionSuccessResult.exam_title}
              </p>
            </div>

            {submissionSuccessResult.is_grades_released && submissionSuccessResult.percentage !== null ? (
              <div className="rounded-2xl bg-surface-base border border-border-default p-4 space-y-1">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
                  Your Online Score
                </span>
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-3xl font-extrabold text-sage font-mono">
                    {submissionSuccessResult.total_score}
                  </span>
                  <span className="text-sm text-text-muted font-mono font-semibold">
                    / {submissionSuccessResult.max_score}
                  </span>
                  <span className="text-sm font-bold text-tan ml-2">
                    ({submissionSuccessResult.percentage}%)
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-surface-base border border-border-default p-4 space-y-2 text-left">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
                  <Lock className="h-4 w-4" />
                  <span>Scores & Reviewer Pending Release</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Your answers have been securely recorded. Per your teacher's instructions, your personal score, shaded answers, and question reviewer will be made visible once your teacher releases the grades.
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const wasReleased = submissionSuccessResult.is_grades_released;
                  setSubmissionSuccessResult(null);
                  if (wasReleased) {
                    setActiveTab("grades");
                  } else {
                    setActiveTab("available");
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl gradient-bg-primary py-2.5 text-xs font-bold text-text-primary shadow-md shadow-steel/20 cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
