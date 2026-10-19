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
  Shirt,
  UserCog,
  PenTool,
  Award,
  BookOpen,
  Users,
} from "lucide-react";
import { ExamIcon } from "@/components/ui/ExamIcon";
import { MobileNav } from "@/components/MobileNav";
import { ConfirmModal } from "@/components/ConfirmModal";
import { NotificationBell } from "@/components/NotificationBell";
import { StudentNotificationBell } from "@/components/StudentNotificationBell";
import { useTheme } from "@/lib/theme-context";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import { CharacterCreatorModal } from "@/components/avatar/CharacterCreatorModal";
import {
  StudentAvatarConfig,
  parseAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_TEACHER_AVATAR_CONFIG,
} from "@/types/avatar";
import { teacher as teacherApi, student as studentApi } from "@/lib/api";

interface NavbarProps {
  onOpenPasswordModal?: () => void;
  onOpenCloset?: () => void;
}

export function Navbar({ onOpenPasswordModal, onOpenCloset }: NavbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [userAvatar, setUserAvatar] = useState<StudentAvatarConfig | null>(null);
  const [closetModalOpen, setClosetModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === "STUDENT" || user?.role === "TEACHER") {
      const isTeacher = user.role === "TEACHER";
      const storageKey = isTeacher ? `evalo_teacher_avatar_${user.id}` : `evalo_student_avatar_${user.id}`;
      const defaultCfg = isTeacher ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;

      const loadAvatar = () => {
        const stored = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
        if (stored) {
          setUserAvatar(parseAvatarConfig(stored));
        } else {
          // If not in localStorage, fetch from backend profile and cache it
          if (isTeacher) {
            teacherApi
              .getProfile()
              .then((p) => {
                const cfg = parseAvatarConfig(p.avatar_config || JSON.stringify(defaultCfg));
                setUserAvatar(cfg);
                if (typeof window !== "undefined") {
                  localStorage.setItem(storageKey, JSON.stringify(cfg));
                }
              })
              .catch(() => setUserAvatar(defaultCfg));
          } else {
            studentApi
              .getProfile()
              .then((p) => {
                const cfg = parseAvatarConfig(p.avatar_config || JSON.stringify(defaultCfg));
                setUserAvatar(cfg);
                if (typeof window !== "undefined") {
                  localStorage.setItem(storageKey, JSON.stringify(cfg));
                }
              })
              .catch(() => setUserAvatar(defaultCfg));
          }
        }
      };

      loadAvatar();
      window.addEventListener("evalo_avatar_updated", loadAvatar);
      return () => window.removeEventListener("evalo_avatar_updated", loadAvatar);
    }
  }, [user]);

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

  // NOTE: All hooks must run before any early return. Previously these lived below
  // `if (!user) return null`, which crashed the page ("This page couldn't load")
  // the moment logout cleared the user, because React saw fewer hooks than before.
  const [studentCurrentTab, setStudentCurrentTab] = useState<string>("dashboard");

  useEffect(() => {
    if (user?.role === "STUDENT") {
      if (pathname.startsWith("/student/reviewer")) {
        setStudentCurrentTab("reviewers");
        return;
      }
      if (pathname.startsWith("/student/dashboard")) {
        if (typeof window !== "undefined") {
          const tab = new URLSearchParams(window.location.search).get("tab") || "dashboard";
          setStudentCurrentTab(tab);
        }
      }
      const handler = (e: Event) => {
        const detail = (e as CustomEvent).detail;
        if (detail) {
          setStudentCurrentTab(detail);
        }
      };
      window.addEventListener("studentTabChange", handler);
      return () => window.removeEventListener("studentTabChange", handler);
    }
  }, [user, pathname]);

  if (!user) return null;

  const effectiveAvatar =
    userAvatar ||
    (user.role === "TEACHER"
      ? DEFAULT_TEACHER_AVATAR_CONFIG
      : user.role === "STUDENT"
      ? DEFAULT_AVATAR_CONFIG
      : null);

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
    { href: "/teacher/students", label: "Students", icon: Users },
    { href: "/teacher/exams", label: "Exams", icon: FileText },
    { href: "/teacher/scan", label: "Scan Sheet", icon: ScanLine },
  ];

  const studentNav = [
    { href: "/student/dashboard", tab: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student/dashboard?tab=available", tab: "available", label: "Available Exams", icon: PenTool },
    { href: "/student/dashboard?tab=grades", tab: "grades", label: "My Graded Exams", icon: Award },
    { href: "/student/reviewer", tab: "reviewers", label: "Study Reviewers", icon: BookOpen },
    { href: "/student/dashboard?tab=friends", tab: "friends", label: "Friends Circle", icon: Users },
  ];

  const homeHref = user
    ? user.role === "ADMIN"
      ? "/admin/dashboard"
      : user.role === "TEACHER"
      ? "/teacher/dashboard"
      : "/student/dashboard"
    : "/";

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border-default bg-surface-raised/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <Link href={homeHref} className="flex items-center gap-2.5 group">
              <ExamIcon className="h-8 w-8 transition-transform group-hover:scale-110 duration-200" />
              <div>
                <span className="text-xl font-black tracking-tight text-text-primary">
                  Evalo
                </span>
              </div>
            </Link>

            {/* Teacher Desktop Navigation Links */}
            {user.role === "TEACHER" && (
              <nav className="hidden sm:flex items-center gap-1.5 ml-6 border-l border-border-default pl-6">
                {teacherNav.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 ${
                        isActive
                          ? "bg-steel text-white shadow-sm shadow-steel/25"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/80"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Student Desktop Navigation Links */}
            {user.role === "STUDENT" && (
              <nav className="hidden sm:flex items-center gap-1.5 ml-6 border-l border-border-default pl-6">
                {studentNav.map((item) => {
                  const isReviewerRoute = pathname.startsWith("/student/reviewer");
                  const isActive = isReviewerRoute
                    ? item.tab === "reviewers"
                    : pathname.startsWith("/student/dashboard")
                    ? studentCurrentTab === item.tab
                    : false;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.tab}
                      href={item.href}
                      onClick={(e) => {
                        if (pathname.startsWith("/student/dashboard")) {
                          if (item.tab === "reviewers") return;
                          e.preventDefault();
                          setStudentCurrentTab(item.tab);
                          window.dispatchEvent(new CustomEvent("studentTabChange", { detail: item.tab }));
                          const url = item.tab === "dashboard" ? "/student/dashboard" : `/student/dashboard?tab=${item.tab}`;
                          window.history.pushState({}, "", url);
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? "bg-sage text-white shadow-sm shadow-sage/25"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-subtle/80"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            )}
          </div>

          {/* Right Controls: Notification Bell & User Profile */}
          <div className="flex items-center gap-2.5">
            {user.role === "TEACHER" && <NotificationBell />}
            {user.role === "STUDENT" && <StudentNotificationBell />}

            {/* User Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 rounded-2xl bg-surface-overlay border border-border-default px-3 py-1.5 hover:border-border-emphasis transition-all focus:outline-none"
              >
                {(user.role === "STUDENT" || user.role === "TEACHER") && effectiveAvatar ? (
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full overflow-hidden border shadow-xs shrink-0 bg-surface-base ${
                    user.role === "TEACHER" ? "border-steel-border ring-1 ring-steel/25" : "border-sage-border ring-1 ring-sage/25"
                  }`}>
                    <StudentAvatar config={effectiveAvatar} size={28} showBackdrop={false} />
                  </div>
                ) : (
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full border ${roleColors[user.role]}`}>
                    <RoleIcon className="h-3 w-3" />
                  </div>
                )}
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
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-border-default mb-1">
                    {(user.role === "STUDENT" || user.role === "TEACHER") && effectiveAvatar ? (
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full overflow-hidden border shadow-xs shrink-0 bg-surface-base ${
                        user.role === "TEACHER" ? "border-steel-border" : "border-sage-border"
                      }`}>
                        <StudentAvatar config={effectiveAvatar} size={36} showBackdrop={false} />
                      </div>
                    ) : (
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${roleColors[user.role]}`}>
                        <RoleIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-[11px] text-text-muted font-mono truncate">@{user.username}</p>
                    </div>
                  </div>

                  {(user.role === "STUDENT" || user.role === "TEACHER") && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        if (onOpenCloset) {
                          onOpenCloset();
                        } else {
                          setClosetModalOpen(true);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-sage hover:bg-sage-ghost transition-colors cursor-pointer"
                    >
                      <Shirt className="h-4 w-4" />
                      {user.role === "TEACHER" ? "Faculty Wardrobe Studio" : "Character Studio & Closet"}
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      if (onOpenPasswordModal) onOpenPasswordModal();
                    }}
                    className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-text-secondary hover:bg-surface-subtle hover:text-text-primary transition-colors cursor-pointer"
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

      {/* Standalone Wardrobe / Avatar Studio Modal */}
      {user && (user.role === "STUDENT" || user.role === "TEACHER") && (
        <CharacterCreatorModal
          isOpen={closetModalOpen}
          onClose={() => setClosetModalOpen(false)}
          initialConfig={effectiveAvatar || undefined}
          studentName={`${user.first_name} ${user.last_name || ""}`.trim()}
          role={user.role as "STUDENT" | "TEACHER"}
          onSave={async (config) => {
            if (user.role === "TEACHER") {
              await teacherApi.updateProfile({
                avatar_config: JSON.stringify(config),
                bio: config.bio,
              });
              if (typeof window !== "undefined") {
                localStorage.setItem(`evalo_teacher_avatar_${user.id}`, JSON.stringify(config));
              }
            } else {
              await studentApi.updateProfile({
                avatar_config: JSON.stringify(config),
                bio: config.bio,
              });
              if (typeof window !== "undefined") {
                localStorage.setItem(`evalo_student_avatar_${user.id}`, JSON.stringify(config));
              }
            }
            setUserAvatar(config);
            if (typeof window !== "undefined") {
              window.dispatchEvent(new Event("evalo_avatar_updated"));
            }
          }}
        />
      )}
    </>
  );
}
