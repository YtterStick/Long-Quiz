"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
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
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import {
  Skeleton,
  SkeletonStatCards,
  SkeletonWorkflowCards,
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
import { Shirt } from "lucide-react";

export default function TeacherDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({
    total_sections: 0,
    total_students: 0,
    total_exams: 0,
    total_submissions: 0,
  });
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
      teacherApi
        .getDashboard()
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));

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
    <div className="min-h-screen text-text-primary">
      <Navbar
        onOpenPasswordModal={() => setPasswordModalOpen(true)}
        onOpenCloset={() => setClosetModalOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 sm:px-6">
        {/* Shared role hero (all breakpoints) */}
        <div className="mb-6 sm:mb-8">
          <WelcomeHero
            role="teacher"
            name={user?.first_name}
            loading={authLoading}
            description={
              teacherBio ||
              "Manage your class rosters, generate and clone exams, launch live proctored lobbies, and grade bubble sheets with OpenCV."
            }
            badges={
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="rounded-full bg-steel-ghost px-3 py-1 text-[11px] font-bold text-steel border border-steel-border">
                  Academic Year 2026
                </span>
                <button
                  type="button"
                  onClick={() => setClosetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-sage-ghost hover:bg-sage text-sage hover:text-white px-3 py-1 text-[11px] font-bold border border-sage-border transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Shirt className="h-3 w-3" />
                  Faculty Wardrobe Studio
                </button>
              </div>
            }
            actions={
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/teacher/scan"
                  id="hero-scan-sheet"
                  className="group flex items-center gap-2 rounded-2xl bg-steel px-5 py-3 text-xs font-bold text-white shadow-lg shadow-steel/25 hover:bg-steel-light hover:shadow-steel/35 transition-all active:scale-95"
                >
                  <ScanLine className="h-4 w-4" />
                  Scan Bubble Sheet
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                  type="button"
                  onClick={() => setClosetModalOpen(true)}
                  className="group flex items-center gap-2 rounded-2xl bg-surface-raised border border-border-default hover:border-steel px-4 py-3 text-xs font-bold text-text-primary hover:bg-surface-subtle shadow-sm transition-all active:scale-95 cursor-pointer"
                >
                  <Shirt className="h-4 w-4 text-steel" />
                  Open Wardrobe
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
                <div className="relative p-1.5 rounded-full bg-surface-raised border border-border-emphasis/70 shadow-lg group-hover:shadow-xl group-hover:border-steel transition-all duration-300 group-hover:scale-105">
                  <StudentAvatar config={teacherAvatar} size={135} animate={true} />
                  <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-steel text-white shadow-md border-2 border-surface-raised group-hover:scale-110 transition-transform">
                    <Shirt className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span className="mt-1.5 text-[10px] font-bold text-text-muted group-hover:text-steel transition-colors flex items-center gap-1">
                  <Shirt className="h-2.5 w-2.5" />
                  Customize Faculty Avatar
                </span>
              </button>
            }
          />
        </div>

        {/* ============================================================== */}
        {/* MOBILE VIEW (block sm:hidden) — Dribbble-inspired Mobile UI    */}
        {/* ============================================================== */}
        <div className="block sm:hidden space-y-4">
          {/* Quick Action Buttons Row */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/teacher/scan"
              className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 border border-sage-border/40 bg-sage-ghost/15 active:scale-95 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border">
                <ScanLine className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-text-primary">Scan Sheet</span>
              <span className="text-[10px] text-sage font-medium">Camera OMR</span>
            </Link>

            <Link
              href="/teacher/exams"
              className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 border border-steel-border/40 bg-steel-ghost/15 active:scale-95 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                <FileCheck className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-text-primary">Exams</span>
              {loading ? (
                <span className="inline-block h-3.5 w-12 rounded bg-surface-muted/60 animate-pulse mt-0.5" />
              ) : (
                <span className="text-[10px] text-steel font-medium">{stats.total_exams} Active</span>
              )}
            </Link>

            <Link
              href="/teacher/sections"
              className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 border border-tan-border/40 bg-tan-ghost/15 active:scale-95 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                <School className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-text-primary">Sections</span>
              {loading ? (
                <span className="inline-block h-3.5 w-12 rounded bg-surface-muted/60 animate-pulse mt-0.5" />
              ) : (
                <span className="text-[10px] text-tan font-medium">{stats.total_sections} Classes</span>
              )}
            </Link>
          </div>

          {/* Compact 2x2 Overview Summary (Natural, fits in 1 glance) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Class Overview</span>
              <span className="text-[11px] text-text-faint font-mono flex items-center">
                {loading ? <Skeleton className="h-3 w-16" /> : "Live stats"}
              </span>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {[
                  { title: "Sections", subtitle: "Active Classes", icon: School },
                  { title: "Students", subtitle: "Enrolled Total", icon: GraduationCap },
                  { title: "Exams", subtitle: "Answer Keys", icon: FileSpreadsheet },
                  { title: "Graded", subtitle: "Papers Scored", icon: ScanLine },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      className="glass-card rounded-2xl p-3 border border-border-default/70 flex items-center justify-between"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0 pr-2">
                        <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider block">
                          {item.title}
                        </span>
                        <div className="h-6 w-11 rounded-lg bg-surface-muted animate-pulse" />
                        <span className="text-[10px] text-text-faint font-medium block">
                          {item.subtitle}
                        </span>
                      </div>
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface-subtle border border-border-subtle/80 opacity-60">
                        <Icon className="h-4 w-4 text-text-muted" />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/teacher/sections"
                  className="glass-card rounded-2xl p-3 border border-border-default flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Sections</span>
                    <p className="text-2xl font-black text-text-primary mt-0.5">{stats.total_sections}</p>
                    <span className="text-[10px] text-tan font-semibold">Active Classes</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                    <School className="h-4 w-4" />
                  </div>
                </Link>

                <Link
                  href="/teacher/sections"
                  className="glass-card rounded-2xl p-3 border border-border-default flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Students</span>
                    <p className="text-2xl font-black text-text-primary mt-0.5">{stats.total_students}</p>
                    <span className="text-[10px] text-steel font-semibold">Enrolled Total</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                </Link>

                <Link
                  href="/teacher/exams"
                  className="glass-card rounded-2xl p-3 border border-border-default flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Exams</span>
                    <p className="text-2xl font-black text-text-primary mt-0.5">{stats.total_exams}</p>
                    <span className="text-[10px] text-sage font-semibold">Answer Keys</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border">
                    <FileSpreadsheet className="h-4 w-4" />
                  </div>
                </Link>

                <Link
                  href="/teacher/scan"
                  className="glass-card rounded-2xl p-3 border border-border-default flex items-center justify-between active:scale-[0.98] transition-transform"
                >
                  <div>
                    <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Graded</span>
                    <p className="text-2xl font-black text-text-primary mt-0.5">{stats.total_submissions}</p>
                    <span className="text-[10px] text-cream font-semibold">Papers Scored</span>
                  </div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cream-ghost text-cream border border-cream-border">
                    <ScanLine className="h-4 w-4" />
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* Grouped Workflows List (Clean iOS / Dribbble Grouped Cell View) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Modules & Tools</span>
            </div>

            <div className="glass-card rounded-2xl border border-border-default overflow-hidden divide-y divide-border-default">
              <Link
                href="/teacher/sections"
                className="flex items-center justify-between p-3.5 hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                    <School className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Section & Student Roster</h3>
                    <p className="text-[11px] text-text-muted">Manage classes and 6-digit student OMR IDs</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  {loading ? (
                    <span className="inline-block h-4 w-7 rounded-full bg-surface-muted/70 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-semibold text-tan bg-tan-ghost px-2 py-0.5 rounded-full border border-tan-border">
                      {stats.total_sections}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/teacher/exams"
                className="flex items-center justify-between p-3.5 hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
                    <FileCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">Exams & Bubble Sheets</h3>
                    <p className="text-[11px] text-text-muted">Answer keys, clones & printable PDFs</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  {loading ? (
                    <span className="inline-block h-4 w-7 rounded-full bg-surface-muted/70 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-semibold text-steel bg-steel-ghost px-2 py-0.5 rounded-full border border-steel-border">
                      {stats.total_exams}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>

              <Link
                href="/teacher/scan"
                className="flex items-center justify-between p-3.5 hover:bg-surface-subtle active:bg-surface-subtle transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sage-ghost text-sage border border-sage-border">
                    <ScanLine className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-primary">OMR Scanner & Grading</h3>
                    <p className="text-[11px] text-text-muted">Camera grading & manual score override</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-text-muted">
                  {loading ? (
                    <span className="inline-block h-4 w-7 rounded-full bg-surface-muted/70 animate-pulse" />
                  ) : (
                    <span className="text-[10px] font-semibold text-sage bg-sage-ghost px-2 py-0.5 rounded-full border border-sage-border">
                      {stats.total_submissions}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP VIEW (hidden sm:block)                                 */}
        {/* ============================================================== */}
        <div className="hidden sm:block space-y-8">
          {/* Stats Grid */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Overview Metrics
              </span>
            </div>
            {loading ? (
              <SkeletonStatCards count={4} />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                  title="My Sections"
                  value={stats.total_sections}
                  subtitle="Active assigned classes"
                  badge="Classes"
                  icon={School}
                  color="tan"
                />
                <StatCard
                  title="Enrolled Students"
                  value={stats.total_students}
                  subtitle="Total student roster"
                  badge="Students"
                  icon={GraduationCap}
                  color="steel"
                />
                <StatCard
                  title="Created Exams"
                  value={stats.total_exams}
                  subtitle="Answer keys & quizzes"
                  badge="Exams"
                  icon={FileSpreadsheet}
                  color="sage"
                />
                <StatCard
                  title="Graded Submissions"
                  value={stats.total_submissions}
                  subtitle="OMR sheets scored"
                  badge="Scored"
                  icon={ScanLine}
                  color="cream"
                />
              </div>
            )}
          </div>

          {/* Quick Action Cards */}
          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-base font-bold text-text-primary">Core Workflows & Modules</h2>
              <span className="text-xs text-text-muted">3 active modules</span>
            </div>

            {loading ? (
              <SkeletonWorkflowCards count={3} />
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Card 1: Sections */}
                <Link
                  href="/teacher/sections"
                  className="glass-card glass-card-hover group rounded-[28px] p-7 flex flex-col justify-between border border-border-default hover:border-tan/40 transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div>
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-tan-ghost text-tan border border-tan-border mb-5 group-hover:scale-110 transition-transform shadow-inner">
                      <School className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-tan transition-colors">
                      Section & Student Roster
                    </h3>
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">
                      Create class sections, import students via CSV, assign class exams, and monitor live proctored lobbies in real-time.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-border-default/60">
                    <span className="text-xs font-bold text-tan">Manage Sections</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-tan-ghost text-tan group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>

                {/* Card 2: Exams */}
                <Link
                  href="/teacher/exams"
                  className="glass-card glass-card-hover group rounded-[28px] p-7 flex flex-col justify-between border border-border-default hover:border-steel/40 transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div>
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border mb-5 group-hover:scale-110 transition-transform shadow-inner">
                      <FileCheck className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-steel transition-colors">
                      Exams & Bubble Sheets
                    </h3>
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">
                      Design exams (1-50 questions), configure A-E answer keys, attach explanations, and download printable PDF bubble sheets.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-border-default/60">
                    <span className="text-xs font-bold text-steel">Manage Exams & Keys</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-steel-ghost text-steel group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>

                {/* Card 3: Scan Sheet */}
                <Link
                  href="/teacher/scan"
                  className="glass-card glass-card-hover group rounded-[28px] p-7 flex flex-col justify-between border border-border-default hover:border-sage/40 transition-all duration-300 shadow-sm hover:shadow-xl"
                >
                  <div>
                    <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border mb-5 group-hover:scale-110 transition-transform shadow-inner">
                      <ScanLine className="h-6 w-6" />
                    </div>
                    <h3 className="text-lg font-bold text-text-primary group-hover:text-sage transition-colors">
                      OMR Scanner & Grading
                    </h3>
                    <p className="text-xs text-text-muted mt-2 leading-relaxed">
                      Capture or upload paper bubble sheet photos, run automated OpenCV bubble mark detection, and publish grades with one click.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between pt-4 border-t border-border-default/60">
                    <span className="text-xs font-bold text-sage">Scan & Grade Sheets</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sage-ghost text-sage group-hover:translate-x-1 transition-transform">
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
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
