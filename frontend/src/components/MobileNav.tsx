"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  School,
  FileText,
  ScanLine,
  PenTool,
  Award,
  BookOpen,
} from "lucide-react";

export function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [studentActiveTab, setStudentActiveTab] = useState<"available" | "grades" | "reviewers">("available");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "available" || tab === "grades" || tab === "reviewers") {
        setStudentActiveTab(tab);
      }
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail === "available" || detail === "grades" || detail === "reviewers") {
        setStudentActiveTab(detail);
      }
    };
    window.addEventListener("studentTabChange", handler);
    return () => window.removeEventListener("studentTabChange", handler);
  }, []);

  if (!user) return null;

  const teacherNav = [
    { href: "/teacher/dashboard", label: "Home", icon: LayoutDashboard },
    { href: "/teacher/sections", label: "Sections", icon: School },
    { href: "/teacher/exams", label: "Exams", icon: FileText },
    { href: "/teacher/scan", label: "Scan", icon: ScanLine },
  ];

  const adminNav = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  ];

  const studentNav = [
    { tab: "available" as const, label: "Exams", icon: PenTool },
    { tab: "grades" as const, label: "Results", icon: Award },
    { tab: "reviewers" as const, label: "Reviewers", icon: BookOpen },
  ];

  if (user.role === "STUDENT") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-surface-raised/95 backdrop-blur-xl border-t border-border-default safe-area-bottom shadow-lg">
        <div className="flex items-center justify-around px-2 py-1.5">
          {studentNav.map((item) => {
            const Icon = item.icon;
            const isActive = studentActiveTab === item.tab;
            return (
              <button
                key={item.tab}
                type="button"
                onClick={() => {
                  setStudentActiveTab(item.tab);
                  window.dispatchEvent(new CustomEvent("studentTabChange", { detail: item.tab }));
                }}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-2 transition-all cursor-pointer ${
                  isActive
                    ? "bg-steel-ghost text-steel font-bold"
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
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-4 py-2 transition-all ${
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
