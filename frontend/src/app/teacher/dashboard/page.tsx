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

      <main className="mx-auto max-w-7xl px-4 py-8 pb-24 sm:pb-12 sm:px-6">
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
      </main>

      <PasswordChangeModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
      />
    </div>
  );
}
