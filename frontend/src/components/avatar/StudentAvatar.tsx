"use client";

import React from "react";
import { StudentAvatarConfig } from "@/types/avatar";
import { StudentAvatar3D } from "./StudentAvatar3D";

export interface StudentAvatarProps {
  config?: StudentAvatarConfig | null;
  size?: number | string;
  className?: string;
  showBackdrop?: boolean;
  animate?: boolean;
  loading?: boolean;
  /** "head" crops to the head + hair only (used for hairstyle thumbnails). */
  variant?: "full" | "head";
  /** Allow click/touch drag to rotate 360 degrees */
  interactive?: boolean;
  /** External yaw angle in radians (0 = front, Math.PI = back) */
  yaw?: number;
  /** Continuously auto-rotate 360 degrees */
  autoRotate?: boolean;
  onYawChange?: (yaw: number) => void;
}

export function StudentAvatar({
  config: rawConfig,
  size = 120,
  className = "",
  showBackdrop = true,
  animate = false,
  loading = false,
  variant = "full",
  interactive = false,
  yaw,
  autoRotate = false,
  onYawChange,
}: StudentAvatarProps) {
  if (loading || !rawConfig) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full bg-surface-subtle/80 border border-border-default/80 ${className}`}
      >
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 dark:via-white/5 to-transparent animate-shimmer" />
        <div className="h-1/2 w-1/2 rounded-full bg-surface-muted/50" />
      </div>
    );
  }

  return (
    <StudentAvatar3D
      config={rawConfig}
      size={size}
      className={className}
      showBackdrop={showBackdrop}
      animate={animate}
      variant={variant}
      interactive={interactive}
      yaw={yaw}
      autoRotate={autoRotate}
      onYawChange={onYawChange}
    />
  );
}
