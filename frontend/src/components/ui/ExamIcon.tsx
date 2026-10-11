import React from "react";

/**
 * Modern, multidimensional bespoke brand emblem for Evalo.
 * A freestanding geometric assessment prism combining overlapping isometric facets,
 * depth gradients, and an ascending precision checkmark spark.
 */
export function ExamIcon({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* Steel Slate Top Facet Gradient */}
        <linearGradient id="evalo-facet-top" x1="6" y1="4" x2="28" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#52839e" />
          <stop offset="100%" stopColor="#9bb4c0" />
        </linearGradient>

        {/* Deep Slate Left Wing Gradient */}
        <linearGradient id="evalo-facet-left" x1="4" y1="12" x2="18" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#3d6b84" />
          <stop offset="100%" stopColor="#2b4f63" />
        </linearGradient>

        {/* Luminous Warm Sand / Gold Check Ribbon */}
        <linearGradient id="evalo-facet-gold" x1="10" y1="28" x2="32" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a18d6d" />
          <stop offset="50%" stopColor="#e1d0b3" />
          <stop offset="100%" stopColor="#ffffff" />
        </linearGradient>

        {/* Sage Green Foundation Accent */}
        <linearGradient id="evalo-facet-sage" x1="14" y1="18" x2="30" y2="34" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#75a383" />
          <stop offset="100%" stopColor="#52839e" />
        </linearGradient>

        {/* Subtle drop shadow filter for 3D depth */}
        <filter id="evalo-shadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0d141b" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* ── Layer 1: Left Assessment Wing / Base ───────────────────── */}
      <path
        d="M 6 10 C 6 6.5, 9.5 4, 13 5.5 L 20 8.5 L 12 28 C 8 28, 6 24, 6 18 Z"
        fill="url(#evalo-facet-left)"
      />

      {/* ── Layer 2: Right Foundation Wing ────────────────────────── */}
      <path
        d="M 20 8.5 L 29 13 C 32 14.5, 32 18.5, 29.5 20.5 L 18 29.5 C 15 32, 11 29, 12 25 Z"
        fill="url(#evalo-facet-sage)"
        opacity="0.9"
      />

      {/* ── Layer 3: Top Curved Prism Arch ────────────────────────── */}
      <path
        d="M 8 11 C 9 6, 14 3, 20 4 C 26 5, 30 9, 31 15 L 24 15 C 23 11, 20 8, 15 8 C 12 8, 9.5 9.5, 8 11 Z"
        fill="url(#evalo-facet-top)"
      />

      {/* ── Layer 4: Dynamic Rising Assessment Checkmark (Foreground) */}
      <path
        d="M 10 18 L 15.5 23.5 C 16.3 24.3, 17.7 24.3, 18.5 23.5 L 32 8"
        stroke="url(#evalo-facet-gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#evalo-shadow)"
      />

      {/* ── Layer 5: Luminous Apex Assessment Spark ────────────────── */}
      <circle cx="32" cy="8" r="2.5" fill="#ffffff" />
    </svg>
  );
}
