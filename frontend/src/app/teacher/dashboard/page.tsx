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
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import {
  Skeleton,
  SkeletonStatCards,
  SkeletonDashboardPage,
} from "@/components/ui/Skeleton";
import { WelcomeHero } from "@/components/WelcomeHero";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { CharacterCreatorModal } from "@/components/avatar/CharacterCreatorModal";
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
}

interface ExamSummary {
  id: string;
  title: string;
  total_questions: number;
  is_online_active?: boolean;
  is_grades_released?: boolean;
  created_at: string;
}

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

  if (authLoading) {
    return <SkeletonDashboardPage role="teacher" />;
  }

  return (
    <div className="min-h-screen text-text-primary bg-background">
      <Navbar
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onOpenCloset={() => setClosetModalOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-3 sm:px-6 py-5 sm:py-8 pb-24 sm:pb-12 space-y-6 sm:space-y-8">
        {/* Modern Faculty Hero */}
        <WelcomeHero
          role="teacher"
          showRoleBadge={false}
          name={user?.first_name}
          loading={authLoading}
          description={
            teacherBio ||
            "Manage class rosters, build questionnaires, launch live proctored lobbies, and grade bubble sheets."
          }
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link
                href="/teacher/scan"
                id="hero-scan-sheet"
                className="group inline-flex items-center gap-2 rounded-2xl bg-steel px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-steel/25 hover:bg-steel-light hover:shadow-steel/35 transition-all active:scale-95"
              >
                <ScanLine className="h-4 w-4" />
                <span>Scan Bubble Sheet</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </Link>

              <Link
                href="/teacher/exams?ai=true"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-sage-ghost border border-sage-border hover:bg-sage/20 px-3.5 py-2.5 text-xs font-bold text-sage shadow-xs transition-all active:scale-95"
                title="Generate exam questions and answer keys from handout notes using AI"
              >
                <Sparkles className="h-3.5 w-3.5 text-sage animate-pulse" />
                <span>Generate Exam (AI)</span>
              </Link>

              <Link
                href="/teacher/exams"
                className="inline-flex items-center gap-1.5 rounded-2xl bg-surface-raised border border-border-default hover:border-steel px-4 py-2.5 text-xs font-bold text-text-primary hover:bg-surface-subtle shadow-xs transition-all active:scale-95"
              >
                <Plus className="h-3.5 w-3.5 text-steel" />
                <span>New Exam</span>
              </Link>

              <button
                type="button"
                onClick={() => setClosetModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-2xl bg-surface-raised border border-border-default hover:border-sage px-3.5 py-2.5 text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-subtle shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Customize Faculty Character & Wardrobe"
              >
                <Shirt className="h-3.5 w-3.5 text-sage" />
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
                  <StudentAvatar config={teacherAvatar} size={118} animate={true} />
                </div>
                <div className="sm:hidden">
                  <StudentAvatar config={teacherAvatar} size={70} animate={true} />
                </div>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-steel text-white shadow-md border-2 border-surface-raised group-hover:scale-110 transition-transform">
                  <Shirt className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </div>
              </div>
              <span className="hidden sm:flex mt-1.5 text-[10px] font-bold text-text-muted group-hover:text-steel transition-colors items-center gap-1">
                <Shirt className="h-2.5 w-2.5" />
                Edit Look
              </span>
            </button>
          }
        />

        {/* ── Key Metrics Overview ──────────────────────────────────── */}
        <section aria-labelledby="metrics-title">
          <div className="flex items-center justify-between mb-3 px-1">
            <h2 id="metrics-title" className="text-xs font-bold text-text-muted uppercase tracking-wider">
              Faculty Overview
            </h2>
            <span className="text-[11px] text-text-faint font-mono">Academic Year 2026</span>
          </div>

          {loading ? (
            <SkeletonStatCards count={4} />
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard
                title="My Sections"
                value={stats.total_sections}
                subtitle="Active class sections"
                icon={School}
                color="tan"
              />
              <StatCard
                title="Enrolled Students"
                value={stats.total_students}
                subtitle="Total student roster"
                icon={GraduationCap}
                color="steel"
              />
              <StatCard
                title="Created Exams"
                value={stats.total_exams}
                subtitle="Questionnaires & keys"
                icon={FileSpreadsheet}
                color="sage"
              />
              <StatCard
                title="Graded Submissions"
                value={stats.total_submissions}
                subtitle="Bubble sheets scored"
                icon={ScanLine}
                color="cream"
              />
            </div>
          )}
        </section>

        {/* ── Quick Workflows Hub ─────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Scanner Launcher */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border-default flex flex-col justify-between space-y-4 hover:border-steel/40 transition-all shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border shadow-inner">
                  <ScanLine className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-text-primary">
                  OMR Bubble Sheet Scanner
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Capture paper answer sheets via webcam, phone camera, or file upload with automated bubble mark detection.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium">Automatic score calculation</span>
              <Link
                href="/teacher/scan"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-steel hover:bg-steel-light text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <span>Launch Scanner</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 2: Live Room & Online Proctoring */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border-default flex flex-col justify-between space-y-4 hover:border-sage/40 transition-all shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border shadow-inner">
                  <Monitor className="h-5 w-5" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-text-primary">
                  Live Online Exam Lobbies
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Open synchronized exam sessions with anti-cheat detection, full-screen lockdown enforcement, and strike logs.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium">Auto-submission on violation</span>
              <Link
                href="/teacher/exams"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sage hover:bg-sage-light text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <span>Manage Exams</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Card 3: AI Handout Exam Generator */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border-default flex flex-col justify-between space-y-4 hover:border-tan/40 transition-all shadow-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tan-ghost text-tan border border-tan-border shadow-inner">
                  <Sparkles className="h-5 w-5 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-text-primary">
                  AI Exam Generator from Handout
                </h3>
                <p className="text-xs text-text-muted mt-1 leading-relaxed">
                  Upload PDF course handouts or lecture notes to automatically formulate questions, choices (A–D), and answer keys with AI.
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t border-border-subtle">
              <span className="text-[11px] text-text-faint font-medium">5 AI generations / 3 weeks</span>
              <Link
                href="/teacher/exams?ai=true"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-tan hover:bg-tan-light text-white text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <span>Generate Exam (AI)</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── Active Class Sections ───────────────────────────────── */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm sm:text-base font-black text-text-primary flex items-center gap-2">
                <School className="h-4 w-4 text-tan" />
                My Class Sections
              </h2>
              <p className="text-[11px] text-text-muted">Assigned student rosters and class management</p>
            </div>
            <Link
              href="/teacher/sections"
              className="inline-flex items-center gap-1 text-xs font-bold text-steel hover:text-steel-light transition-colors"
            >
              <span>Manage Sections</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
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
                <Plus className="h-3.5 w-3.5" />
                <span>Create Section</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {sections.slice(0, 4).map((section) => (
                <div
                  key={section.id}
                  className="glass-card rounded-2xl p-4 border border-border-default flex flex-col justify-between space-y-3 hover:border-tan/40 transition-all shadow-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-tan uppercase tracking-wider">
                        {section.subject || "General"}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-text-muted">
                        <Users className="h-3 w-3" />
                        {section.student_count}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary truncate">{section.name}</h3>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <span className="text-[10px] text-text-muted font-medium">{section.student_count} Students</span>
                    <Link
                      href="/teacher/sections"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-tan hover:text-tan-light transition-colors"
                    >
                      <span>Roster</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Recent Questionnaires & Exams ─────────────────────────── */}
        <section className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <div>
              <h2 className="text-sm sm:text-base font-black text-text-primary flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-steel" />
                Recent Questionnaires & Exams
              </h2>
              <p className="text-[11px] text-text-muted">Answer keys, bubble sheets, and grade releases</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/teacher/exams?ai=true"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sage-border bg-sage-ghost text-xs font-bold text-sage hover:bg-sage/20 transition-all shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5 text-sage animate-pulse" />
                <span>Generate with AI</span>
              </Link>
              <Link
                href="/teacher/exams"
                className="inline-flex items-center gap-1 text-xs font-bold text-steel hover:text-steel-light transition-colors"
              >
                <span>View All Exams</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
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
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Exam</span>
                </Link>
                <Link
                  href="/teacher/exams?ai=true"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-sage-border bg-sage-ghost hover:bg-sage/20 text-sage text-xs font-bold shadow-sm transition-all"
                >
                  <Sparkles className="h-3.5 w-3.5 text-sage" />
                  <span>Generate with AI</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {exams.slice(0, 3).map((exam) => (
                <div
                  key={exam.id}
                  className="glass-card rounded-2xl p-4.5 border border-border-default flex flex-col justify-between space-y-3 hover:border-steel/40 transition-all shadow-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold text-steel bg-steel-ghost px-2 py-0.5 rounded-md border border-steel-border">
                        {exam.total_questions} Questions
                      </span>
                      {exam.is_online_active ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sage bg-sage-ghost px-2 py-0.5 rounded-full border border-sage-border">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Online Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-text-faint">Paper / Offline</span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-text-primary line-clamp-1">{exam.title}</h3>
                  </div>

                  <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
                    <Link
                      href="/teacher/scan"
                      className="text-[11px] font-bold text-sage hover:text-sage-light transition-colors flex items-center gap-1"
                    >
                      <ScanLine className="h-3 w-3" />
                      <span>Grade Sheets</span>
                    </Link>
                    <Link
                      href="/teacher/exams"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-steel hover:text-steel-light transition-colors"
                    >
                      <span>Manage</span>
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
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
            ? `${user.first_name} ${user.last_name || ""}`.trim()
            : "Faculty Teacher"
        }
        role="TEACHER"
        onSave={handleSaveAvatar}
      />
    </div>
  );
}
