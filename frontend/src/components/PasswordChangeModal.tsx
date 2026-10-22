"use client";

import React, { useState, useEffect } from "react";
import { auth as authApi, student as studentApi, teacher as teacherApi } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import {
  KeyRound,
  Lock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  LogOut,
  User,
  X,
  Shirt,
  ShieldCheck,
  Quote,
  Check,
} from "lucide-react";
import { StudentAvatar } from "@/components/avatar/StudentAvatar";
import {
  StudentAvatarConfig,
  parseAvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_TEACHER_AVATAR_CONFIG,
} from "@/types/avatar";

interface PasswordChangeModalProps {
  isOpen: boolean;
  forced?: boolean;
  onClose?: () => void;
  onOpenCloset?: () => void;
}

export function PasswordChangeModal({
  isOpen,
  forced = false,
  onClose,
  onOpenCloset,
}: PasswordChangeModalProps) {
  const { user, logout, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Character & Motto state
  const [userAvatar, setUserAvatar] = useState<StudentAvatarConfig | null>(null);
  const [studyMotto, setStudyMotto] = useState<string>("");
  const [mottoLoading, setMottoLoading] = useState(false);
  const [mottoSaved, setMottoSaved] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setError(null);
      setSuccess(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      if (forced) {
        setActiveTab("password");
      }

      if (user.role === "STUDENT") {
        const stored = typeof window !== "undefined" ? localStorage.getItem(`evalo_student_avatar_${user.id}`) : null;
        if (stored) {
          const cfg = parseAvatarConfig(stored);
          setUserAvatar(cfg);
          setStudyMotto(cfg.bio || "");
        } else {
          studentApi
            .getProfile()
            .then((p) => {
              const cfg = parseAvatarConfig(p.avatar_config);
              setUserAvatar(cfg);
              setStudyMotto(p.bio || cfg.bio || "");
            })
            .catch(() => {
              setUserAvatar(DEFAULT_AVATAR_CONFIG);
            });
        }
      } else if (user.role === "TEACHER") {
        const stored = typeof window !== "undefined" ? localStorage.getItem(`evalo_teacher_avatar_${user.id}`) : null;
        if (stored) {
          const cfg = parseAvatarConfig(stored);
          setUserAvatar(cfg);
          setStudyMotto(cfg.bio || "");
        } else {
          teacherApi
            .getProfile()
            .then((p) => {
              const cfg = parseAvatarConfig(p.avatar_config || JSON.stringify(DEFAULT_TEACHER_AVATAR_CONFIG));
              setUserAvatar(cfg);
              setStudyMotto(p.bio || cfg.bio || "");
            })
            .catch(() => {
              setUserAvatar(DEFAULT_TEACHER_AVATAR_CONFIG);
            });
        }
      }
    }
  }, [isOpen, user, forced]);

  if (!isOpen) return null;

  const handleSaveMotto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setMottoLoading(true);
    try {
      const defaultCfg = user.role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;
      const updatedConfig: StudentAvatarConfig = userAvatar
        ? { ...userAvatar, bio: studyMotto.trim() }
        : { ...defaultCfg, bio: studyMotto.trim() };

      if (user.role === "TEACHER") {
        await teacherApi.updateProfile({
          avatar_config: JSON.stringify(updatedConfig),
          bio: studyMotto.trim(),
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`evalo_teacher_avatar_${user.id}`, JSON.stringify(updatedConfig));
          window.dispatchEvent(new Event("evalo_avatar_updated"));
        }
      } else if (user.role === "STUDENT") {
        await studentApi.updateProfile({
          avatar_config: JSON.stringify(updatedConfig),
          bio: studyMotto.trim(),
        });
        if (typeof window !== "undefined") {
          localStorage.setItem(`evalo_student_avatar_${user.id}`, JSON.stringify(updatedConfig));
          window.dispatchEvent(new Event("evalo_avatar_updated"));
        }
      }

      setUserAvatar(updatedConfig);
      setMottoSaved(true);
      setTimeout(() => setMottoSaved(false), 1500);
    } catch (err) {
      console.error("Failed to update motto:", err);
    } finally {
      setMottoLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setError("New password must contain at least one letter and one number.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setSuccess(true);

      if (forced) {
        const usernameParam = user?.username ? `&u=${encodeURIComponent(user.username)}` : "";
        setTimeout(() => {
          if (typeof window !== "undefined") {
            localStorage.removeItem("token");
            localStorage.removeItem("evalo_user");
            window.location.replace(`/?reset=success${usernameParam}`);
          } else {
            logout();
          }
        }, 1200);
      } else {
        await refreshUser?.();
        setTimeout(() => {
          setSuccess(false);
          setCurrentPassword("");
          setNewPassword("");
          setConfirmPassword("");
          if (onClose) onClose();
        }, 1500);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.toLowerCase().includes("failed to fetch")) {
          setError("Incorrect password");
        } else {
          setError(msg);
        }
      } else {
        setError("Incorrect password");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl border border-border-emphasis bg-surface-overlay p-6 shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {!forced && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer"
            aria-label="Close settings modal"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Modal Header */}
        <div className="flex items-center gap-3 border-b border-border-default pb-4 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-steel-ghost text-steel border border-steel-border">
            {activeTab === "profile" && !forced ? <User className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-base font-black text-text-primary">
              {forced ? "First-Time Password Change Required" : "Account Settings & Profile"}
            </h2>
            <p className="text-xs text-text-muted">
              {forced
                ? "For security reasons, you must set a new password before accessing your dashboard."
                : activeTab === "profile"
                ? "Manage your institutional identity, student character, and motto."
                : "Manage your account security and password."}
            </p>
          </div>
        </div>

        {/* Tab switch bar when not forced */}
        {!forced && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-surface-base border border-border-default mb-5">
            <button
              type="button"
              onClick={() => setActiveTab("profile")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-surface-raised text-text-primary shadow-xs border border-border-default"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <User className="h-3.5 w-3.5" />
              Profile & Character
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("password")}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "password"
                  ? "bg-surface-raised text-text-primary shadow-xs border border-border-default"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              Security & Password
            </button>
          </div>
        )}

        {/* TAB 1: PROFILE & CHARACTER SETUP */}
        {activeTab === "profile" && !forced ? (
          <div className="space-y-4">
            {/* Official School Record Card (Non-editable) */}
            <div className="p-4 rounded-2xl bg-surface-base border border-border-default space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5 text-sage" />
                  Official Institutional Record
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-steel-ghost text-steel border border-steel-border">
                  {user?.role}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-text-muted">Assigned Full Name</label>
                  <p className="text-sm font-black text-text-primary">
                    {user?.first_name} {user?.last_name}
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-text-muted">Username Handle</label>
                  <p className="text-sm font-mono font-bold text-steel">@{user?.username}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border-default/60 flex items-center gap-1.5 text-[11px] text-text-muted">
                <Lock className="h-3 w-3 shrink-0 text-text-muted" />
                <span>Names and usernames are institutional records and cannot be altered.</span>
              </div>
            </div>

            {/* If Student or Teacher: Character Creation & Closet Wardrobe Setup Card */}
            {(user?.role === "STUDENT" || user?.role === "TEACHER") && (
              <div className="p-4 rounded-2xl border border-sage-border/50 bg-sage-ghost/10 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sage-ghost text-sage border border-sage-border">
                      <Shirt className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-text-primary">
                        {user.role === "TEACHER" ? "Faculty Character & Wardrobe" : "Student Character & Wardrobe"}
                      </h4>
                      <p className="text-[11px] text-text-muted">Personalize outfits, hair, accessories & style</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-sage bg-sage-ghost px-2 py-0.5 rounded-full border border-sage-border">
                    Customizable
                  </span>
                </div>

                {/* Avatar spotlight inside account settings */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-surface-raised border border-border-default">
                  <div className="relative p-1 rounded-full bg-surface-base border border-border-default shadow-xs shrink-0">
                    <StudentAvatar
                      config={userAvatar || (user.role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG)}
                      size={68}
                      showBackdrop={true}
                      animate={false}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {user.first_name}&apos;s Character
                    </p>
                    <p className="text-[11px] text-text-muted italic truncate">
                      &ldquo;{studyMotto || (user.role === "TEACHER" ? "Inspiring excellence in every lesson 🎓" : "Ready to ace every quiz! 🚀")}&rdquo;
                    </p>

                    {onOpenCloset && (
                      <button
                        type="button"
                        onClick={() => {
                          if (onClose) onClose();
                          onOpenCloset();
                        }}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sage hover:bg-sage-light text-white text-[11px] font-black transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <Shirt className="h-3 w-3" />
                        {user.role === "TEACHER" ? "Open Faculty Wardrobe Studio" : "Open Character Studio & Closet"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Direct Study Motto Setup in Account Settings */}
                <form onSubmit={handleSaveMotto} className="space-y-2 pt-1">
                  <label className="flex items-center gap-1 text-[11px] font-bold text-text-secondary uppercase tracking-wider">
                    <Quote className="h-3 w-3 text-sage" />
                    {user.role === "TEACHER" ? "Teaching Philosophy / Status" : "Study Motto / Status"}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={120}
                      value={studyMotto}
                      onChange={(e) => setStudyMotto(e.target.value)}
                      placeholder="e.g. Aiming for 100% on every quiz! 🚀"
                      className="flex-1 rounded-xl border border-border-default bg-surface-base px-3 py-2 text-xs font-medium text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-2 focus:ring-steel/10 transition-all"
                    />
                    <button
                      type="submit"
                      disabled={mottoLoading || mottoSaved}
                      className="px-3.5 py-2 rounded-xl bg-steel hover:bg-steel-light text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {mottoLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : mottoSaved ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-white" />
                          Saved
                        </>
                      ) : (
                        "Save Motto"
                      )}
                    </button>
                  </div>
                  <span className="text-[10px] text-text-muted block">
                    Displays on your profile card, online exam lobbies, and hero badge.
                  </span>
                </form>
              </div>
            )}

            <div className="flex justify-end pt-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-border-default bg-surface-subtle hover:bg-surface-muted text-xs font-bold text-text-secondary transition-colors cursor-pointer"
                >
                  Close Settings
                </button>
              )}
            </div>
          </div>
        ) : (
          /* TAB 2: PASSWORD CHANGE FORM */
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-burgundy-ghost border border-burgundy-border p-3 text-xs text-burgundy-light">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-xl bg-sage-ghost border border-sage-border p-3 text-xs text-sage">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>
                  {forced
                    ? "Password set successfully! Redirecting to login..."
                    : "Password changed successfully!"}
                </span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Current / Temporary Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                New Password (min 8 characters, letters + numbers)
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  minLength={8}
                  maxLength={72}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-secondary mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-border-emphasis bg-surface-base px-3.5 py-2.5 pl-10 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
                />
                <Lock className="absolute left-3 top-3 h-4 w-4 text-text-faint" />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              {forced ? (
                <button
                  type="button"
                  onClick={logout}
                  className="w-1/2 flex items-center justify-center gap-1.5 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-burgundy-ghost hover:text-burgundy-light transition-colors cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log Out
                </button>
              ) : (
                onClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-1/2 rounded-xl border border-border-emphasis bg-surface-subtle py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                )
              )}
              <button
                type="submit"
                disabled={loading || success}
                className="w-1/2 flex items-center justify-center gap-2 rounded-xl gradient-bg-primary py-2.5 text-xs font-semibold text-white shadow-lg shadow-steel/20 hover:opacity-95 transition-opacity disabled:opacity-50 cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Set New Password"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
