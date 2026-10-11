import React from "react";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-surface-subtle ${className}`}
    />
  );
}

export function SkeletonStatCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-default bg-surface-overlay p-5 backdrop-blur-md"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-9 rounded-xl" />
          </div>
          <Skeleton className="mt-4 h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border-default bg-surface-overlay p-6 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-36" />
        <Skeleton className="h-9 w-48 rounded-xl" />
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b border-border-subtle">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-4 w-1/6" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonExamGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border-default bg-surface-overlay p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-3/4" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-28" />
          </div>
          <Skeleton className="h-3.5 w-full" />
          <div className="pt-4 border-t border-border-subtle">
            <div className="grid grid-cols-2 gap-2">
              <Skeleton className="h-9 w-full rounded-xl" />
              <Skeleton className="h-9 w-full rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSectionGrid({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border-default bg-surface-overlay p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-lg" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <div className="pt-4 border-t border-border-subtle">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonStudentInfoCard() {
  return (
    <div className="glass-card rounded-2xl p-5 border border-border-default relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-28" />
        </div>
        <Skeleton className="h-12 w-12 rounded-2xl" />
      </div>
      <Skeleton className="mt-3 h-2.5 w-48" />
    </div>
  );
}

export function SkeletonStudentStats() {
  return (
    <div className="grid grid-cols-3 gap-2.5 sm:gap-4 mb-6 sm:mb-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-3 sm:p-5 border border-border-default flex items-center justify-between">
          <div className="space-y-1.5 sm:space-y-2">
            <Skeleton className="h-2.5 sm:h-3 w-16 sm:w-24" />
            <Skeleton className="h-5 sm:h-7 w-10 sm:w-14" />
          </div>
          <Skeleton className="hidden sm:block h-10 w-10 rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonWorkflowCards({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border-default bg-surface-overlay p-6 space-y-4">
          <Skeleton className="h-12 w-12 rounded-2xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <div className="pt-4">
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Student Available Exams Grid
 */
export function SkeletonStudentExamGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-card rounded-2xl p-4 sm:p-5 border border-border-default flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-4/5" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-3.5 w-full" />
          </div>
          <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Student Grades / Exam Feedback Cards
 */
export function SkeletonGradeCards({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-default bg-surface-base/80 p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-2/3" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Public Reviewers and Handouts List
 */
export function SkeletonReviewerList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-default bg-surface-base/80 p-4 sm:p-5 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-6 w-3/5" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-32" />
              </div>
            </div>
            <Skeleton className="h-9 w-32 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for AI Flashcard Deck Generating State
 */
export function SkeletonDeckGenerating() {
  return (
    <div className="rounded-2xl border border-steel-border/50 bg-surface-raised p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-72" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Main Flashcard Placeholder */}
      <div className="h-64 sm:h-72 rounded-3xl bg-surface-subtle border border-border-default p-8 flex flex-col justify-between items-center text-center">
        <Skeleton className="h-5 w-24 rounded-full" />
        <div className="space-y-3 w-full max-w-md mx-auto">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4 mx-auto" />
        </div>
        <Skeleton className="h-4 w-36 rounded" />
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-9 w-24 rounded-xl" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>
    </div>
  );
}

/**
 * Skeleton for Question editor in exam modal
 */
export function SkeletonQuestionnaireList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-default bg-surface-base p-4 space-y-3.5"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for Live Exam Monitor Roster
 */
export function SkeletonLiveRoster({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {/* Top metrics skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-subtle p-3.5 border border-border-default space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        ))}
      </div>

      {/* Roster cards skeleton */}
      <div className="space-y-2 pt-2">
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border-default bg-surface-base p-3.5 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for Notification Bell Dropdown Items
 */
export function SkeletonNotificationList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 py-1">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-border-default bg-surface-subtle p-3 flex items-start gap-3"
        >
          <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
            <Skeleton className="h-7 w-28 rounded-lg mt-1" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Full Page Dashboard Skeleton (Replaces raw full-screen spinners for Student, Teacher, Admin)
 */
export function SkeletonDashboardPage({
  role = "student",
}: {
  role?: "student" | "teacher" | "admin";
}) {
  return (
    <div className="min-h-screen text-text-primary bg-background">
      {/* Top Navbar Skeleton */}
      <header className="sticky top-0 z-40 border-b border-border-default/60 bg-surface-base/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-xl" />
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 space-y-6 sm:space-y-8">
        {/* WelcomeHero Banner Skeleton */}
        <div className="rounded-3xl border border-border-default bg-surface-raised p-6 sm:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="space-y-3.5 flex-1 min-w-0">
              <Skeleton className="h-5 w-32 rounded-full" />
              <Skeleton className="h-9 w-3/5 sm:w-2/5" />
              <Skeleton className="h-4 w-4/5" />
              <div className="flex items-center gap-2 pt-2">
                <Skeleton className="h-10 w-36 rounded-2xl" />
                <Skeleton className="h-10 w-32 rounded-2xl" />
              </div>
            </div>
            {/* Spotlight avatar placeholder */}
            <div className="shrink-0 flex flex-col items-center gap-2">
              <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        </div>

        {/* Role-Specific Body */}
        {role === "student" && (
          <div className="space-y-6">
            {/* 3 Stats cards */}
            <SkeletonStudentStats />

            {/* Tab navigation pills */}
            <div className="flex items-center gap-2 border-b border-border-default pb-3">
              <Skeleton className="h-9 w-36 rounded-xl" />
              <Skeleton className="h-9 w-32 rounded-xl" />
              <Skeleton className="h-9 w-40 rounded-xl" />
              <Skeleton className="h-9 w-36 rounded-xl" />
            </div>

            {/* Exam card grid */}
            <SkeletonStudentExamGrid count={4} />
          </div>
        )}

        {role === "teacher" && (
          <div className="space-y-6">
            <SkeletonStatCards count={4} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
              <Skeleton className="h-48 rounded-2xl" />
            </div>
          </div>
        )}

        {role === "admin" && (
          <div className="space-y-6">
            <SkeletonStatCards count={4} />
            <SkeletonTable rows={5} />
          </div>
        )}
      </main>
    </div>
  );
}
