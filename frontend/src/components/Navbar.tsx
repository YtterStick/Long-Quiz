"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LogOut,
  User,
  Shield,
  GraduationCap,
  School,
  Settings,
  LayoutDashboard,
  FileText,
  ScanLine,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { ExamIcon } from "@/components/ui/ExamIcon";
import { MobileNav } from "@/components/MobileNav";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/lib/theme-context";

interface NavbarProps {
  onOpenPasswordModal?: () => void;
}

export function Navbar({ onOpenPasswordModal }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const roleColors = {
    ADMIN: "bg-tan-ghost text-tan border-tan-border",
    TEACHER: "bg-steel-ghost text-steel border-steel-border",
    STUDENT: "bg-sage-ghost text-sage border-sage-border",
  };

  const roleIcons = {
    ADMIN: Shield,
    TEACHER: School,
    STUDENT: GraduationCap,
  };

  const RoleIcon = roleIcons[user.role] || User;

  const teacherNav = [
    { href: "/teacher/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/teacher/sections", label: "Sections", icon: School },
    { href: "/teacher/exams", label: "Exams", icon: FileText },
    { href: "/teacher/scan", label: "Scan Sheet", icon: ScanLine },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border-default bg-surface-raised/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-steel text-white shadow-md shadow-steel/15 group-hover:scale-105 transition-transform">
                <ExamIcon className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-text-primary">
                  Long<span className="text-steel">Quiz</span>
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            {user.role === "TEACHER" && (
              <nav className="hidden sm:flex items-center gap-1 ml-6 border-l border-border-default pl-6">
                {teacherNav.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-surface-subtle text-text-primary shadow-sm"
                          : "text-text-muted hover:text-text-secondary hover:bg-surface-overlay"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Controls: Theme Toggle & User Profile */}
          <div className="flex items-center gap-2.5">
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-2xl bg-surface-overlay border border-border-default px-3.5 py-1.5 hover:border-border-emphasis transition-all focus:outline-none"
              >
                <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${roleColors[user.role]}`}>
                  <RoleIcon className="h-3 w-3" />
                </div>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-semibold text-text-secondary">
                    {user.first_name} {user.last_name}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${roleColors[user.role]}`}>
                  {user.role}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-border-default bg-surface-overlay p-2 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="px-3 py-2 border-b border-border-default mb-1">
                    <p className="text-xs font-bold text-text-primary">
                      {user.first_name} {user.last_name}
                    </p>
                    <p className="text-[11px] text-text-muted font-mono">@{user.username}</p>
                  </div>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenPasswordModal) onOpenPasswordModal();
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                  >
                    <Settings className="h-4 w-4 text-text-muted" />
                    Account Settings
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {theme === "dark" ? (
                        <Sun className="h-4 w-4 text-cream" />
                      ) : (
                        <Moon className="h-4 w-4 text-steel" />
                      )}
                      <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface-subtle text-text-muted">
                      {theme}
                    </span>
                  </button>

                  <div className="my-1 border-t border-border-default" />

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setLogoutModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-burgundy-light hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav />

      {/* Logout Confirmation Dialog */}
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
