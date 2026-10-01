"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, School, FileText, ScanLine, LogOut, Sun, Moon } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useTheme } from "@/lib/theme-context";

export function MobileNav() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

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
    { href: "/student/dashboard", label: "Portal", icon: LayoutDashboard },
  ];

  const items =
    user.role === "TEACHER"
      ? teacherNav
      : user.role === "ADMIN"
      ? adminNav
      : studentNav;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-surface-raised/90 backdrop-blur-xl border-t border-border-default px-3 py-2">
        <div className="flex items-center justify-around">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 transition-all ${
                  isActive
                    ? "bg-steel-ghost text-steel font-bold"
                    : "text-text-muted hover:text-text-secondary"
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-text-muted hover:text-steel transition-all"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-cream" />
            ) : (
              <Moon className="h-5 w-5 text-steel" />
            )}
            <span className="text-[10px] font-medium">{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-text-muted hover:text-burgundy-light transition-all"
          >
            <LogOut className="h-5 w-5" />
            <span className="text-[10px] font-medium">Logout</span>
          </button>
        </div>
      </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        title="Sign Out Confirmation"
        message="Are you sure you want to sign out of your account?"
        confirmText="Sign Out"
        cancelText="Stay Logged In"
        variant="danger"
        onConfirm={() => {
          setLogoutModalOpen(false);
          logout();
        }}
        onCancel={() => setLogoutModalOpen(false)}
      />
    </>
  );
}
