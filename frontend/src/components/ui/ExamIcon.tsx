import React from "react";

/**
 * Bespoke custom brand logo mark for Evalo.
 * Combines an aerodynamic "E" monogram with optical mark check and assessment layers.
 */
export function ExamIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="evalo-mark-grad" x1="4" y1="4" x2="28" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="currentColor" stopOpacity="1" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.85" />
        </linearGradient>
      </defs>

      {/* Main Evalo "E" & Assessment Check Geometry */}
      {/* Vertical Spine */}
      <rect x="6" y="5" width="4.5" height="22" rx="2.25" fill="url(#evalo-mark-grad)" />

      {/* Top Arm with aerodynamic rounded cap */}
      <path
        d="M 8 7.25 H 23.5 C 24.75 7.25 25.75 8.25 25.75 9.5 C 25.75 10.75 24.75 11.75 23.5 11.75 H 8 Z"
        fill="url(#evalo-mark-grad)"
      />

      {/* Middle Arm with precision check dot */}
      <path
        d="M 8 13.75 H 19 C 20.25 13.75 21.25 14.75 21.25 16 C 21.25 17.25 20.25 18.25 19 18.25 H 8 Z"
        fill="url(#evalo-mark-grad)"
      />

      {/* Bottom Arm */}
      <path
        d="M 8 20.25 H 24 C 25.25 20.25 26.25 21.25 26.25 22.5 C 26.25 23.75 25.25 24.75 24 24.75 H 8 Z"
        fill="url(#evalo-mark-grad)"
      />

      {/* Precision Assessment Diamond / Star Accent */}
      <circle cx="23.5" cy="16" r="2.25" fill="currentColor" opacity="0.95" />
    </svg>
  );
}
