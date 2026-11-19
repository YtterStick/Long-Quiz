"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatCard } from "@/components/StatCard";
import { teacher as teacherApi } from "@/lib/api";
import {
  School,
  GraduationCap,
  FileSpreadsheet,
  ScanLine,
  ArrowRight,
  FileCheck,
  Plus,
  Sparkles,
  Monitor,
  Users,
  Shirt,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Quote,
  Download,
  Loader2,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import {
  Skeleton,
  SkeletonStatCards,
  SkeletonDashboardPage,
} from "@/components/ui/Skeleton";
import { WelcomeHero, pickDailyQuote } from "@/components/WelcomeHero";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { CharacterCreatorModal } from "@/components/avatar/CharacterCreatorModal";
import { toTitleCaseName, formatCourseLabel } from "@/lib/format";
import {
  StudentAvatarConfig,
  parseAvatarConfig,
  DEFAULT_TEACHER_AVATAR_CONFIG,
} from "@/types/avatar";

interface SectionSummary {
  id: string;
  name: string;
  subject: string;
  student_count: number;
  average_score_pct?: number | null;
  last_exam_title?: string | null;
}

interface ExamSummary {
  id: string;
  title: string;
  total_questions: number;
  is_online_active?: boolean;
  is_grades_released?: boolean;
  submission_count?: number;
  assigned_student_count?: number;
  created_at: string;
}

const SECTION_ACCENTS = [
  {
    borderLeft: "border-l-4 border-l-steel",
    pill: "bg-steel-ghost text-steel border-steel-border",
    hover: "hover:border-steel/50",
  },
  {
    borderLeft: "border-l-4 border-l-sage",
    pill: "bg-sage-ghost text-sage border-sage-border",
    hover: "hover:border-sage/50",
  },
  {
    borderLeft: "border-l-4 border-l-tan",
    pill: "bg-tan-ghost text-tan border-tan-border",
    hover: "hover:border-tan/50",
  },
  {
    borderLeft: "border-l-4 border-l-cream",
    pill: "bg-cream-ghost text-cream border-cream-border",
    hover: "hover:border-cream/50",
  },
] as const;

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    total_sections: 0,
    total_students: 0,
    total_exams: 0,
    total_submissions: 0,
  });
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [exams, setExams] = useState<ExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [closetModalOpen, setClosetModalOpen] = useState(false);
  const [teacherAvatar, setTeacherAvatar] = useState<StudentAvatarConfig>(DEFAULT_TEACHER_AVATAR_CONFIG);
  const [teacherBio, setTeacherBio] = useState<string>("");
  const [exportingExamId, setExportingExamId] = useState<string | null>(null);

  const handleExportExamCsv = async (exam: ExamSummary) => {
    setExportingExamId(exam.id);
    try {
      const subs = await teacherApi.listSubmissions(exam.id);
      const esc = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
      const header = ["Student ID", "Student Name", "Score", "Max Score", "Percentage", "Submitted At"].join(",");
      const lines = subs.map((s) => {
        const omr = s.student ? String(s.student.student_number).padStart(6, "0") : "";
        const fullId = omr ? `02000${omr}` : s.student_id;
        const name = s.student?.user
          ? toTitleCaseName(`${s.student.user.first_name} ${s.student.user.last_name}`)
          : "Student";
        const pct = s.max_score ? `${Math.round((s.total_score / s.max_score) * 100)}%` : "0%";
        const dt = s.scanned_at ? new Date(s.scanned_at).toLocaleString() : "";
        return [esc(fullId), esc(name), s.total_score, s.max_score, esc(pct), esc(dt)].join(",");
      });
      const blob = new Blob([[header, ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const slug = exam.title.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
      a.download = `${slug || "exam"}_grades.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export exam CSV:", err);
    } finally {
      setExportingExamId(null);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "TEACHER")) {
      router.push("/");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user && user.role === "TEACHER") {
      Promise.allSettled([
        teacherApi.getDashboard().then(setStats),
        teacherApi.listSections().then(setSections),
        teacherApi.listExams(false).then((data) => setExams(data as ExamSummary[])),
      ]).finally(() => setLoading(false));

      const stored = typeof window !== "undefined" ? localStorage.getItem(`evalo_teacher_avatar_${user.id}`) : null;
      if (stored) {
        const cfg = parseAvatarConfig(stored);
        setTeacherAvatar(cfg);
        setTeacherBio(cfg.bio || "");
      } else {
        teacherApi
          .getProfile()
          .then((p) => {
            const cfg = parseAvatarConfig(p.avatar_config || JSON.stringify(DEFAULT_TEACHER_AVATAR_CONFIG));
            setTeacherAvatar(cfg);
            setTeacherBio(p.bio || cfg.bio || "");
          })
          .catch(() => {
            setTeacherAvatar(DEFAULT_TEACHER_AVATAR_CONFIG);
          });
      }
    }
  }, [user]);

  const handleSaveAvatar = async (config: StudentAvatarConfig) => {
    if (!user) return;
    try {
      await teacherApi.updateProfile({
        avatar_config: JSON.stringify(config),
        bio: config.bio,
      });
      setTeacherAvatar(config);
      setTeacherBio(config.bio || "");
      if (typeof window !== "undefined") {
        localStorage.setItem(`evalo_teacher_avatar_${user.id}`, JSON.stringify(config));
        window.dispatchEvent(new Event("evalo_avatar_updated"));
      }
    } catch (err) {
      console.error("Failed to update teacher character:", err);
    }
  };

  if (authLoading || !user || user.role !== "TEACHER" || loading) {
    return <SkeletonDashboardPage role="teacher" />;
  }

  const footerQuote = pickDailyQuote("teacher");

  return (
    <div className="min-h-screen text-text-primary bg-background">
      <Navbar
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onOpenCloset={() => setClosetModalOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-3.5 sm:py-4.5 pb-24 sm:pb-10 space-y-4 sm:space-y-5">
        {/* Modern Faculty Hero */}
        <WelcomeHero
          role="teacher"
          showRoleBadge={false}
          showQuote={false}
          compact={true}
          name={user?.first_name}
          loading={authLoading}
          description={
            teacherBio ||
            "Manage class rosters, build questionnaires, launch live proctored lobbies, and grade bubble sheets."
          }
          actions={
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href="/teacher/exams"
                className="inline-flex items-center gap-1.5 rounded-xl bg-steel px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-steel-light transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Create Exam</span>
              </Link>

              <button
                type="button"
                onClick={() => setClosetModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-surface-subtle/60 border border-border-default hover:border-border-emphasis px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-subtle transition-all active:scale-95 cursor-pointer"
                title="Customize Faculty Character & Wardrobe"
              >
                <Shirt className="h-3.5 w-3.5 shrink-0 text-sage" />
                <span>Wardrobe</span>
              </button>
            </div>
          }
          customIllustration={
            <button
              type="button"
              onClick={() => setClosetModalOpen(true)}
              className="group relative cursor-pointer flex flex-col items-center focus:outline-none"
              title="Click to customize your faculty character avatar!"
            >
              <div className="relative p-1 rounded-full bg-surface-raised border border-border-emphasis/70 shadow-lg group-hover:shadow-xl group-hover:border-steel transition-all duration-300 group-hover:scale-105">
                <div className="hidden sm:block">
                  <StudentAvatar config={teacherAvatar} size={86} animate={true} />
                </div>
                <div className="sm:hidden">
                  <StudentAvatar config={teacherAvatar} size={56} animate={true} />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-steel text-white shadow-md border-2 border-surface-raised group-hover:scale-110 transition-transform">
                  <Shirt className="h-3 w-3" />
                </div>
              </div>
              <span className="hidden sm:flex mt-1 text-[10px] font-bold text-text-muted group-hover:text-steel transition-colors items-center gap-1">
                <Shirt className="h-2.5 w-2.5" />
                Edit Look
              </span>
            </button>
          }
        />

        {/* ── Key Metrics Overview ──────────────────────────────────── */}
        <section aria-labelledby="metrics-title">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 id="metrics-title" className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
              Faculty Overview
            </h2>
            <span className="text-[11px] text-text-faint font-mono">Academic Year 2026</span>
          </div>

          {loading ? (
            <SkeletonStatCards count={4} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                title="My Sections"
                value={stats.total_sections}
                subtitle="Active class sections"
                icon={School}
                color="tan"
                compact={true}
              />
              <StatCard
                title="Enrolled Students"
                value={stats.total_students}
                subtitle="Total student roster"
                icon={GraduationCap}
                color="steel"
                compact={true}
              />
              <StatCard
                title="Created Exams"
                value={stats.total_exams}
                subtitle="Questionnaires & keys"
                icon={FileSpreadsheet}
                color="sage"
                compact={true}
              />
              <StatCard
                title="Graded Submissions"
                value={stats.total_submissions}
                subtitle="Bubble sheets scored"
                icon={ScanLine}
                color="cream"
                compact={true}
              />
            </div>
          )}
        </section>

        {/* ── Quick Workflows Hub ─────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* Card 1: Scanner Launcher */}
          <div className="glass-card rounded-2xl p-4 border border-border-default flex flex-col justify-between gap-3 hover:border-steel/40 transition-all shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border shadow-inner">
                  <ScanLine className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-text-primary leading-tight">
                  OMR Bubble Sheet Scanner
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                Capture paper answer sheets via webcam, phone camera, or file upload with automated bubble detection.
              </p>
            </div>

            <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium truncate">Auto score calculation</span>
              <Link
                href="/teacher/scan"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-steel hover:bg-steel-light text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
              >
                <span>Launch Scanner</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Card 2: Live Room & Online Proctoring */}
          <div className="glass-card rounded-2xl p-4 border border-border-default flex flex-col justify-between gap-3 hover:border-sage/40 transition-all shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border shadow-inner">
                  <Monitor className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-text-primary leading-tight">
                  Live Online Exam Lobbies
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                Run synchronized exam sessions with anti-cheat detection, fullscreen lockdown, and strike logs.
              </p>
            </div>

            <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium truncate">Auto-submit on violation</span>
              <Link
                href="/teacher/exams"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sage hover:bg-sage-light text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
              >
                <span>Manage Exams</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Card 3: AI Handout Exam Generator */}
          <div className="glass-card rounded-2xl p-4 border border-border-default flex flex-col justify-between gap-3 hover:border-tan/40 transition-all shadow-xs">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border shadow-inner">
                  <Sparkles className="h-4.5 w-4.5" />
                </div>
                <h3 className="text-sm sm:text-base font-black text-text-primary leading-tight">
                  AI Exam Generator from Handout
                </h3>
              </div>
              <p className="text-xs text-text-muted leading-relaxed line-clamp-2">
                Upload PDF handouts or lecture notes to generate questions, A–D choices, and answer keys with AI.
              </p>
            </div>

            <div className="pt-2.5 flex items-center justify-between gap-2 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium truncate">5 generations / 3 weeks</span>
              <Link
                href="/teacher/exams?ai=true"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-tan hover:bg-tan-light text-white text-xs font-bold shadow-xs transition-all active:scale-95 shrink-0"
              >
                <span>Generate Exam (AI)</span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Active Class Sections ───────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm sm:text-base font-black text-text-primary flex items-center gap-2">
                <School className="h-4 w-4 text-tan shrink-0" />
                My Class Sections
              </h2>
              <p className="text-[11px] text-text-muted">Assigned student rosters and class management</p>
            </div>
            <Link
              href="/teacher/sections"
              className="inline-flex items-center gap-1 rounded-xl border border-border-default bg-surface-subtle/50 hover:bg-surface-subtle px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
            >
              <span>Manage Sections</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 border border-border-default space-y-2.5">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-3 w-24" />
                  <div className="pt-2 flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : sections.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border-default text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-tan-ghost text-tan border border-tan-border">
                <School className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">No Class Sections Created Yet</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Create your first class section to import students, generate 6-digit student IDs, and assign exams.
              </p>
              <Link
                href="/teacher/sections"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tan hover:bg-tan-light text-white text-xs font-bold shadow-sm transition-all"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                <span>Create Section</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[...sections]
                .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                .map((section, idx) => {
                  const accent = SECTION_ACCENTS[idx % SECTION_ACCENTS.length];
                  return (
                    <Link
                      key={section.id}
                      href={`/teacher/sections?section=${encodeURIComponent(section.name)}`}
                      className={`glass-card glass-card-hover rounded-2xl p-3.5 border border-border-default ${accent.borderLeft} ${accent.hover} flex flex-col justify-between space-y-2.5 transition-all shadow-xs group`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider truncate max-w-[74%] ${accent.pill}`}
                            title={formatCourseLabel(section.subject)}
                          >
                            {formatCourseLabel(section.subject)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted shrink-0">
                            <Users className="h-3 w-3 shrink-0" />
                            {section.student_count}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-text-primary truncate group-hover:text-steel transition-colors">
                          {section.name}
                        </h3>
                      </div>

                      <div className="pt-2 border-t border-border-subtle flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-text-muted truncate">
                          {section.average_score_pct !== null && section.average_score_pct !== undefined ? (
                            <>
                              Avg: <strong className="text-text-primary">{Math.round(section.average_score_pct)}%</strong>
                            </>
                          ) : section.last_exam_title ? (
                            section.last_exam_title
                          ) : (
                            "No graded exams"
                          )}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-steel group-hover:translate-x-0.5 transition-transform shrink-0">
                          <span>Roster</span>
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        </span>
                      </div>
                    </Link>
                  );
                })}
            </div>
          )}
        </section>

        {/* ── Recent Questionnaires & Exams ─────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm sm:text-base font-black text-text-primary flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-steel shrink-0" />
                Recent Questionnaires &amp; Exams
              </h2>
              <p className="text-[11px] text-text-muted">Answer keys, bubble sheets, and grade releases</p>
            </div>
            <Link
              href="/teacher/exams"
              className="inline-flex items-center gap-1 rounded-xl border border-border-default bg-surface-subtle/50 hover:bg-surface-subtle px-3 py-1.5 text-xs font-bold text-text-secondary hover:text-text-primary transition-colors"
            >
              <span>View All Exams</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-card rounded-2xl p-4 border border-border-default space-y-2.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-3 w-28" />
                  <div className="pt-2 flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-7 w-24 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : exams.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 border border-border-default text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">No Exams Created Yet</h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Create an exam manually, or use AI to generate questions and answer keys directly from course lecture notes.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                <Link
                  href="/teacher/exams"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-steel hover:bg-steel-light text-white text-xs font-bold shadow-sm transition-all"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" />
                  <span>Create Exam</span>
                </Link>
                <Link
                  href="/teacher/exams?ai=true"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border-default bg-surface-subtle/60 hover:bg-surface-subtle text-text-secondary hover:text-text-primary text-xs font-bold transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-tan" />
                  <span>Generate with AI</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {exams.slice(0, 3).map((exam) => {
                const gradedCount = exam.submission_count ?? 0;
                const targetCount =
                  exam.assigned_student_count && exam.assigned_student_count > 0
                    ? exam.assigned_student_count
                    : stats.total_students;
                const remainingCount = targetCount > 0 ? Math.max(0, targetCount - gradedCount) : 0;
                const hasRemaining = targetCount > 0 && remainingCount > 0;
                const progressPct =
                  targetCount > 0 ? Math.min(100, Math.round((gradedCount / targetCount) * 100)) : 0;

                return (
                  <div
                    key={exam.id}
                    className="glass-card rounded-2xl p-4 border border-border-default flex flex-col justify-between space-y-3 hover:border-steel/40 transition-all shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold text-steel bg-steel-ghost px-2 py-0.5 rounded-md border border-steel-border">
                          {exam.total_questions} Questions
                        </span>
                        {exam.is_online_active ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-sage bg-sage-ghost px-2.5 py-0.5 rounded-full border border-sage-border">
                            <span className="h-1.5 w-1.5 rounded-full bg-sage animate-pulse shrink-0" />
                            Online Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-text-muted bg-surface-subtle/80 px-2.5 py-0.5 rounded-full border border-border-default">
                            <span className="h-1.5 w-1.5 rounded-full bg-tan shrink-0" />
                            Paper / Offline
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-text-primary line-clamp-1">{exam.title}</h3>

                      {/* Compact Grading Progress Bar + Remaining Status Pill */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <span className="font-mono font-semibold text-text-secondary">
                            {targetCount > 0
                              ? `${gradedCount} / ${targetCount} submissions graded`
                              : `${gradedCount} submissions graded`}
                          </span>
                          {targetCount > 0 &&
                            (hasRemaining ? (
                              <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold text-amber-300 shrink-0">
                                {remainingCount} left
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-sage-ghost border border-sage-border px-2 py-0.5 text-[10px] font-bold text-sage shrink-0">
                                All graded
                              </span>
                            ))}
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-surface-muted overflow-hidden">
                          <div
                            style={{ width: `${progressPct}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              progressPct >= 100 ? "bg-sage" : "bg-steel"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-border-subtle flex items-center justify-between gap-2">
                      <Link
                        href="/teacher/scan"
                        className={
                          hasRemaining
                            ? "inline-flex items-center gap-1.5 rounded-lg bg-steel hover:bg-steel-light px-3 py-1.5 text-[11px] font-bold text-white shadow-xs transition-all active:scale-95"
                            : "inline-flex items-center gap-1.5 rounded-lg border border-border-default bg-surface-subtle/50 hover:bg-surface-subtle px-2.5 py-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                        }
                      >
                        <ScanLine className={`h-3 w-3 shrink-0 ${hasRemaining ? "text-white" : "text-sage"}`} />
                        <span>Grade Sheets</span>
                      </Link>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleExportExamCsv(exam)}
                          disabled={exportingExamId === exam.id}
                          className="inline-flex items-center justify-center rounded-lg border border-border-default bg-surface-subtle/50 hover:bg-surface-subtle p-1.5 text-text-muted hover:text-text-primary transition-colors cursor-pointer disabled:opacity-50"
                          title="Export CSV"
                          aria-label="Export CSV"
                        >
                          {exportingExamId === exam.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-tan" />
                          ) : (
                            <Download className="h-3.5 w-3.5 text-tan" />
                          )}
                        </button>
                        <Link
                          href="/teacher/exams"
                          className="inline-flex items-center gap-1 rounded-lg border border-border-default bg-surface-subtle/50 hover:bg-surface-subtle px-2.5 py-1.5 text-[11px] font-bold text-text-secondary hover:text-text-primary transition-colors"
                        >
                          <span>Manage</span>
                          <ChevronRight className="h-3 w-3 shrink-0" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Subtle Daily Quote Footer */}
        <footer className="border-t border-border-default/60 pt-4 flex items-center justify-center gap-2 text-[11px] text-text-faint text-center">
          <Quote className="h-3 w-3 shrink-0 text-steel/70" />
          <p suppressHydrationWarning className="italic">
            &ldquo;{footerQuote.text}&rdquo;
            {footerQuote.author && footerQuote.author.toLowerCase() !== "unknown" && (
              <span className="not-italic font-semibold text-text-muted ml-1.5">— {footerQuote.author}</span>
            )}
          </p>
        </footer>
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onOpenCloset={() => setClosetModalOpen(true)}
      />

      {/* Teacher Character Creator & Faculty Wardrobe Studio Modal */}
      <CharacterCreatorModal
        isOpen={closetModalOpen}
        onClose={() => setClosetModalOpen(false)}
        initialConfig={teacherAvatar}
        studentName={
          user?.first_name
            ? toTitleCaseName(`${user.first_name} ${user.last_name || ""}`)
            : "Faculty Teacher"
        }
        role="TEACHER"
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
