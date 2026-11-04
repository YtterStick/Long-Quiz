"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Trash2,
  FileText,
  ShieldCheck,
  X,
  Loader2,
  Info,
} from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  icon?: React.ReactNode;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen || !mounted) return null;

  const isDeleteOrRemove =
    /delete|remove/i.test(title) || /delete|remove/i.test(confirmText);

  // Split message into primary question and optional secondary consequence note
  const questionSplitIndex = message.indexOf("? ");
  const primaryQuestion =
    questionSplitIndex !== -1
      ? message.slice(0, questionSplitIndex + 1).trim()
      : message.trim();
  const secondaryNote =
    questionSplitIndex !== -1
      ? message.slice(questionSplitIndex + 2).trim()
      : "";

  // Check if primary question is a direct `Are you sure you want to (permanently) delete/remove (the account for) <Target>?`
  const directTargetMatch =
    !/\sfrom\s/i.test(primaryQuestion) &&
    primaryQuestion.match(
      /^Are you sure you want to ((?:permanently\s+)?(?:delete|remove))\s+(?:the account for\s+)?(.+?)\??$/i
    );
  const actionVerb = directTargetMatch
    ? directTargetMatch[1].toLowerCase()
    : "remove";
  const rawTarget = directTargetMatch ? directTargetMatch[2].trim() : null;
  const extractedTargetName = rawTarget
    ? rawTarget.replace(/^"([^"]+)"$/, "$1").replace(/"/g, "")
    : null;

  // Determine whether the secondary note is a reassuring "safe/preserved" note vs destructive warning
  const isSafeNote =
    /remain safe|not be deleted|preserved|no flashcards will be deleted/i.test(
      secondaryNote
    );

  // Render inline quoted strings as high-contrast badges when not using the extracted target card
  const renderHighlightedText = (text: string) => {
    const parts = text.split(/("[^"]+")/g);
    return parts.map((part, idx) => {
      if (part.startsWith('"') && part.endsWith('"') && part.length > 2) {
        const inner = part.slice(1, -1);
        return (
          <span
            key={idx}
            className="mx-0.5 inline-flex items-center rounded-lg border border-border-emphasis bg-surface-subtle px-2 py-0.5 font-bold text-text-primary break-all"
          >
            {inner}
          </span>
        );
      }
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    });
  };

  const badgeTone = {
    danger:
      "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
    primary: "bg-steel-ghost text-steel border-steel-border",
    warning:
      "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
  }[variant];

  const confirmButtonTone = {
    danger:
      "bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 text-white shadow-red-600/25",
    primary: "bg-steel hover:bg-steel-light text-white shadow-steel/20",
    warning:
      "bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-500 text-white shadow-amber-600/20",
  }[variant];

  const subtitleLabel =
    variant === "danger"
      ? isDeleteOrRemove
        ? "Confirm Removal"
        : "Confirmation Required"
      : variant === "warning"
        ? "Please Review"
        : "Confirmation";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/65 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border-emphasis bg-surface-raised shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3.5 px-6 pt-6 pb-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${badgeTone}`}
            >
              {isDeleteOrRemove && variant === "danger" ? (
                <Trash2 className="h-5 w-5" />
              ) : icon ? (
                icon
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <span
                className={`inline-block text-[11px] font-bold uppercase tracking-wider ${
                  variant === "danger"
                    ? "text-red-600 dark:text-red-400"
                    : variant === "warning"
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-steel"
                }`}
              >
                {subtitleLabel}
              </span>
              <h3
                id="confirm-modal-title"
                className="text-lg font-bold text-text-primary leading-snug"
              >
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close confirmation dialog"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-text-muted hover:bg-surface-subtle hover:text-text-primary transition-colors cursor-pointer disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="px-6 pb-6 space-y-3.5">
          {extractedTargetName ? (
            <>
              <p className="text-sm font-medium text-text-secondary">
                Are you sure you want to {actionVerb} the following item?
              </p>
              <div className="flex items-center gap-3 rounded-2xl border border-border-emphasis bg-surface-subtle/75 px-4 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border-default bg-surface-raised text-steel">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">
                    Selected Item
                  </p>
                  <p className="text-sm font-bold text-text-primary break-all leading-snug">
                    {extractedTargetName}
                  </p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-[15px] leading-relaxed font-medium text-text-primary">
              {renderHighlightedText(primaryQuestion)}
            </p>
          )}

          {secondaryNote && (
            <div
              className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-[13px] leading-relaxed ${
                isSafeNote
                  ? "border-sage-border bg-sage-ghost text-text-primary"
                  : variant === "danger"
                    ? "border-red-500/30 bg-red-500/10 text-text-primary"
                    : "border-amber-500/30 bg-amber-500/10 text-text-primary"
              }`}
            >
              {isSafeNote ? (
                <ShieldCheck className="h-4 w-4 shrink-0 text-sage mt-0.5" />
              ) : variant === "danger" ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400 mt-0.5" />
              ) : (
                <Info className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              )}
              <span className="font-medium">{secondaryNote}</span>
            </div>
          )}
        </div>

        {/* Modal Action Footer */}
        <div className="flex items-center gap-3 border-t border-border-default bg-surface-subtle/40 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 min-h-11 rounded-2xl border border-border-emphasis bg-surface-raised px-4 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-subtle transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 min-h-11 flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold shadow-md transition-all cursor-pointer disabled:opacity-60 disabled:cursor-wait ${confirmButtonTone}`}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isDeleteOrRemove && variant === "danger" ? (
              <Trash2 className="h-4 w-4" />
            ) : null}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
