"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { LayoutDashboard, School, FileText, ScanLine, LogOut } from "lucide-react";
import { ConfirmModal } from "@/components/ConfirmModal";

export function MobileNav() {
  const { user, logout } = useAuth();
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
      <div className="fixed bottom-0 left-0 right-0 z-40 block sm:hidden bg-surface-raised/95 backdrop-blur-xl border-t border-border-default safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-1.5">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all ${
                  isActive
                    ? "bg-steel-ghost text-steel font-bold"
                    : "text-text-muted active:text-text-secondary active:scale-95"
                }`}
              >
                <Icon className={`${isActive ? "h-5 w-5" : "h-4.5 w-4.5"} transition-all`} />
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 text-text-muted active:text-burgundy-light active:scale-95 transition-all"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span className="text-[10px] font-medium leading-tight">Logout</span>
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
