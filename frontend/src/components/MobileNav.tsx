"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  School,
  FileText,
  ScanLine,
  PenTool,
  Award,
  BookOpen,
  Users,
} from "lucide-react";

export function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [studentActiveTab, setStudentActiveTab] = useState<"dashboard" | "available" | "grades" | "reviewers" | "friends">("dashboard");

  useEffect(() => {
    if (pathname.startsWith("/student/reviewer")) {
      setStudentActiveTab("reviewers");
      return;
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "available" || tab === "grades" || tab === "reviewers" || tab === "friends" || tab === "dashboard") {
        setStudentActiveTab(tab);
      } else if (pathname.startsWith("/student/dashboard")) {
        setStudentActiveTab("dashboard");
      }
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "available" || detail === "grades" || detail === "reviewers" || detail === "friends" || detail === "dashboard") {
        setStudentActiveTab(detail);
      }
    };
    window.addEventListener("studentTabChange", handler);
    return () => window.removeEventListener("studentTabChange", handler);
  }, [pathname]);

  if (!user) return null;

  const teacherNav = [
    { href: "/teacher/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/teacher/sections", label: "Sections", icon: School },
    { href: "/teacher/students", label: "Students", icon: Users },
    { href: "/teacher/exams", label: "Exams", icon: FileText },
    { href: "/teacher/scan", label: "Scan", icon: ScanLine },
  ];

  const adminNav = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const studentNav = [
    { tab: "dashboard" as const, label: "Home", icon: LayoutDashboard },
    { tab: "available" as const, label: "Exams", icon: PenTool },
    { tab: "grades" as const, label: "Results", icon: Award },
    { tab: "reviewers" as const, label: "Reviewers", icon: BookOpen },
    { tab: "friends" as const, label: "Friends", icon: Users },
  ];

  if (user.role === "STUDENT") {
    const isReviewerRoute = pathname.startsWith("/student/reviewer");

    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-surface-raised/95 backdrop-blur-xl border-t border-border-default safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around px-1 py-1.5">
          {studentNav.map((item) => {
            const Icon = item.icon;
            const isActive = isReviewerRoute ? item.tab === "reviewers" : studentActiveTab === item.tab;

            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => {
                  if (item.tab === "reviewers") {
                    setStudentActiveTab("reviewers");
                    if (!isReviewerRoute) {
                      router.push("/student/reviewer");
                    }
                  } else {
                    setStudentActiveTab(item.tab);
                    const targetUrl = item.tab === "dashboard" ? "/student/dashboard" : `/student/dashboard?tab=${item.tab}`;
                    if (isReviewerRoute) {
                      router.push(targetUrl);
                    } else {
                      window.dispatchEvent(new CustomEvent("studentTabChange", { detail: item.tab }));
                      window.history.pushState({}, "", targetUrl);
                    }
                  }
                }}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-1.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-sage-ghost text-sage font-bold"
                    : "text-text-muted hover:text-text-secondary active:scale-95"
                }`}
              >
                <Icon className={`${isActive ? "h-5 w-5" : "h-4.5 w-4.5"} transition-all`} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const items = user.role === "TEACHER" ? teacherNav : adminNav;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-surface-raised/95 backdrop-blur-xl border-t border-border-default safe-area-bottom shadow-lg">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-2.5 py-2 transition-all ${
                isActive
                  ? "bg-steel-ghost text-steel font-bold"
                  : "text-text-muted hover:text-text-secondary active:scale-95"
              }`}
            >
              <Icon className={`${isActive ? "h-5 w-5" : "h-4.5 w-4.5"} transition-all`} />
              <span className="text-[10px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
