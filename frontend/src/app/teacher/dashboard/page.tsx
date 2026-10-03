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
  Camera,
  ChevronRight,
} from "lucide-react";
import { PasswordChangeModal } from "@/components/PasswordChangeModal";
import Link from "next/link";
import { SkeletonStatCards, SkeletonWorkflowCards } from "@/components/ui/Skeleton";

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
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-surface-base text-text-primary">
      <Navbar onOpenPasswordModal={() => setPasswordModalOpen(true)} />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 pb-24 sm:pb-12 sm:px-6">
        {/* ============================================================== */}
        {/* MOBILE VIEW (block sm:hidden) — Dribbble-inspired Mobile UI    */}
        {/* ============================================================== */}
        <div className="block sm:hidden space-y-4">
          {/* Mobile Top Welcome Card */}
          <div className="glass-card rounded-2xl p-4 border border-border-default flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-tan bg-tan-ghost px-2 py-0.5 rounded-full border border-tan-border">
                  Teacher
                </span>
                <span className="text-xs text-text-muted">Classroom Portal</span>
              </div>
              <h1 className="text-xl font-extrabold text-text-primary mt-1.5">
                Hello, <span className="gradient-text">{user?.first_name}</span> 👋
              </h1>
              <p className="text-xs text-text-muted mt-0.5">Quick access to your grading & exams</p>
            </div>
            <Link
              href="/teacher/scan"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-steel text-white shadow-md shadow-steel/25 active:scale-90 transition-transform"
              title="Camera Scanner"
            >
              <Camera className="h-5 w-5" />
            </Link>
          </div>

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
              <span className="text-[10px] text-steel font-medium">{stats.total_exams} Active</span>
            </Link>

            <Link
              href="/teacher/sections"
              className="glass-card rounded-2xl p-3 flex flex-col items-center justify-center text-center gap-1.5 border border-tan-border/40 bg-tan-ghost/15 active:scale-95 transition-all"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tan-ghost text-tan border border-tan-border">
                <School className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold text-text-primary">Sections</span>
              <span className="text-[10px] text-tan font-medium">{stats.total_sections} Classes</span>
            </Link>
          </div>

          {/* Compact 2x2 Overview Summary (Natural, fits in 1 glance) */}
          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Class Overview</span>
              <span className="text-[11px] text-text-faint font-mono">Live stats</span>
            </div>
            {loading ? (
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="glass-card rounded-2xl p-3.5 h-20 animate-pulse bg-surface-subtle" />
                ))}
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
                  <span className="text-[10px] font-semibold text-tan bg-tan-ghost px-2 py-0.5 rounded-full border border-tan-border">
                    {stats.total_sections}
                  </span>
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
                  <span className="text-[10px] font-semibold text-steel bg-steel-ghost px-2 py-0.5 rounded-full border border-steel-border">
                    {stats.total_exams}
                  </span>
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
                  <span className="text-[10px] font-semibold text-sage bg-sage-ghost px-2 py-0.5 rounded-full border border-sage-border">
                    {stats.total_submissions}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </div>
              </Link>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* DESKTOP VIEW (hidden sm:block) — Unaltered Original Layout    */}
        {/* ============================================================== */}
        <div className="hidden sm:block">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
              Welcome back, <span className="gradient-text">{user?.first_name}</span>!
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Manage your class sections, create exam answer keys, print bubble sheets, and grade answer sheets.
            </p>
          </div>

          {/* Stats Grid */}
          {loading ? (
            <SkeletonStatCards count={4} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <StatCard
                title="My Sections"
                value={stats.total_sections}
                icon={School}
                color="tan"
              />
              <StatCard
                title="Enrolled Students"
                value={stats.total_students}
                icon={GraduationCap}
                color="steel"
              />
              <StatCard
                title="Created Exams"
                value={stats.total_exams}
                icon={FileSpreadsheet}
                color="sage"
              />
              <StatCard
                title="Graded Submissions"
                value={stats.total_submissions}
                icon={ScanLine}
                color="cream"
              />
            </div>
          )}

          {/* Quick Action Cards */}
          <h2 className="text-lg font-bold text-text-primary mb-4">Core Workflows</h2>
          {loading ? (
            <SkeletonWorkflowCards count={3} />
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Card 1: Sections */}
              <Link
                href="/teacher/sections"
                className="glass-card glass-card-hover group rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tan-ghost text-tan border border-tan-border mb-4">
                    <School className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-tan-light transition-colors">
                    Section & Student Roster
                  </h3>
                  <p className="text-xs text-text-muted mt-2">
                    Create sections (e.g. BSIT 3-A), add students manually or via CSV upload, and generate 6-digit Student IDs.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-tan">
                  Manage Sections
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 2: Exams */}
              <Link
                href="/teacher/exams"
                className="glass-card glass-card-hover group rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-steel-ghost text-steel border border-steel-border mb-4">
                    <FileCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-steel-light transition-colors">
                    Exams & PDF Bubble Sheets
                  </h3>
                  <p className="text-xs text-text-muted mt-2">
                    Create exams (1-50 questions), define A-E answer keys, clone public exams, and download printable PDF bubble sheets.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-steel">
                  Manage Exams & Keys
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>

              {/* Card 3: Scan Sheet */}
              <Link
                href="/teacher/scan"
                className="glass-card glass-card-hover group rounded-2xl p-6 flex flex-col justify-between"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-ghost text-sage border border-sage-border mb-4">
                    <ScanLine className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary group-hover:text-sage-light transition-colors">
                    OMR Scanner & Grading
                  </h3>
                  <p className="text-xs text-text-muted mt-2">
                    Upload scanned sheet photos, run OpenCV auto-grading, inspect shaded anomalies, manually override scores, and publish.
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-semibold text-sage">
                  Scan & Grade Sheet
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </div>
          )}
        </div>
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
