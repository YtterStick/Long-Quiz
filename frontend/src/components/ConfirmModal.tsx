"use client";

import React from "react";
import { AlertCircle } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary" | "warning";
  icon?: React.ReactNode;
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
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const variantColors = {
    danger: "bg-burgundy hover:bg-burgundy-light text-white shadow-burgundy/20",
    primary: "bg-steel hover:bg-steel-light text-white shadow-steel/20",
    warning: "bg-tan hover:bg-tan-light text-white shadow-tan/20",
  };

  const iconColors = {
    danger: "bg-burgundy-ghost text-burgundy-light border-burgundy-border",
    primary: "bg-steel-ghost text-steel border-steel-border",
    warning: "bg-cream-ghost text-cream border-cream-border",
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm rounded-3xl border border-border-default bg-surface-overlay p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3.5">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconColors[variant]}`}>
            {icon ? (
              icon
            ) : variant === "danger" ? (
              <AlertCircle className="h-5 w-5" />
            ) : (
              <AlertCircle className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <p className="text-xs text-text-muted mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-2xl border border-border-default bg-surface-base py-2.5 text-xs font-semibold text-text-secondary hover:bg-surface-subtle transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 rounded-2xl py-2.5 text-xs font-semibold shadow-lg transition-all ${variantColors[variant]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
