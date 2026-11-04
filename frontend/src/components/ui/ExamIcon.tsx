import React from "react";

/**
 * Modern, multidimensional bespoke brand emblem for Evalo.
 * A freestanding geometric assessment prism combining overlapping isometric facets,
 * depth gradients, and an ascending precision checkmark spark.
 */
export function ExamIcon({
  className = "h-8 w-8",
  animated = false,
}: {
  className?: string;
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ overflow: "visible" }}
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
        <filter id="evalo-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0d141b" floodOpacity="0.35" />
        </filter>

        {animated && (
          <style>{`
            @keyframes evaloWingLeft {
              0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
              30% { transform: translate(-2.2px, 1.2px) rotate(-6deg) scale(0.96); }
              65% { transform: translate(0.8px, -0.8px) rotate(2deg) scale(1.03); }
            }
            @keyframes evaloWingRight {
              0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); opacity: 0.9; }
              35% { transform: translate(2.4px, 1.6px) rotate(6deg) scale(0.95); opacity: 0.75; }
              70% { transform: translate(-0.8px, -0.6px) rotate(-2deg) scale(1.04); opacity: 1; }
            }
            @keyframes evaloArchTop {
              0%, 100% { transform: translate(0px, 0px) rotate(0deg) scale(1); }
              32% { transform: translate(0px, -2.6px) rotate(-3deg) scale(1.05); }
              68% { transform: translate(0.6px, 0.8px) rotate(2deg) scale(0.98); }
            }
            @keyframes evaloCheckDraw {
              0% { stroke-dasharray: 34; stroke-dashoffset: 34; opacity: 0.3; }
              45% { stroke-dasharray: 34; stroke-dashoffset: 0; opacity: 1; }
              78% { stroke-dasharray: 34; stroke-dashoffset: 0; opacity: 1; }
              100% { stroke-dasharray: 34; stroke-dashoffset: -34; opacity: 0.3; }
            }
            @keyframes evaloSparkPop {
              0%, 30% { transform: scale(0); opacity: 0; }
              50% { transform: scale(1.45); opacity: 1; }
              72% { transform: scale(1); opacity: 1; }
              92%, 100% { transform: scale(0); opacity: 0; }
            }
            @keyframes evaloSparkRing {
              0%, 38% { transform: scale(0.4); opacity: 0; }
              55% { transform: scale(1.8); opacity: 0.75; }
              85%, 100% { transform: scale(2.6); opacity: 0; }
            }
            .evalo-anim-left {
              transform-origin: 13px 17px;
              animation: evaloWingLeft 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .evalo-anim-right {
              transform-origin: 21px 19px;
              animation: evaloWingRight 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .evalo-anim-top {
              transform-origin: 19px 9px;
              animation: evaloArchTop 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .evalo-anim-check {
              stroke-dasharray: 34;
              animation: evaloCheckDraw 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .evalo-anim-spark {
              transform-origin: 32px 8px;
              animation: evaloSparkPop 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
            }
            .evalo-anim-ring {
              transform-origin: 32px 8px;
              animation: evaloSparkRing 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
            }
          `}</style>
        )}
      </defs>

      {/* ── Layer 1: Left Assessment Wing / Base ───────────────────── */}
      <path
        className={animated ? "evalo-anim-left" : undefined}
        d="M 6 10 C 6 6.5, 9.5 4, 13 5.5 L 20 8.5 L 12 28 C 8 28, 6 24, 6 18 Z"
        fill="url(#evalo-facet-left)"
      />

      {/* ── Layer 2: Right Foundation Wing ────────────────────────── */}
      <path
        className={animated ? "evalo-anim-right" : undefined}
        d="M 20 8.5 L 29 13 C 32 14.5, 32 18.5, 29.5 20.5 L 18 29.5 C 15 32, 11 29, 12 25 Z"
        fill="url(#evalo-facet-sage)"
        opacity="0.9"
      />

      {/* ── Layer 3: Top Curved Prism Arch ────────────────────────── */}
      <path
        className={animated ? "evalo-anim-top" : undefined}
        d="M 8 11 C 9 6, 14 3, 20 4 C 26 5, 30 9, 31 15 L 24 15 C 23 11, 20 8, 15 8 C 12 8, 9.5 9.5, 8 11 Z"
        fill="url(#evalo-facet-top)"
      />

      {/* ── Layer 4: Dynamic Rising Assessment Checkmark (Foreground) */}
      <path
        className={animated ? "evalo-anim-check" : undefined}
        d="M 10 18 L 15.5 23.5 C 16.3 24.3, 17.7 24.3, 18.5 23.5 L 32 8"
        stroke="url(#evalo-facet-gold)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#evalo-shadow)"
      />

      {/* ── Layer 5: Luminous Apex Assessment Spark ────────────────── */}
      {animated && (
        <circle
          className="evalo-anim-ring"
          cx="32"
          cy="8"
          r="3.2"
          stroke="#e1d0b3"
          strokeWidth="1.2"
          fill="none"
        />
      )}
      <circle
        className={animated ? "evalo-anim-spark" : undefined}
        cx="32"
        cy="8"
        r="2.5"
        fill="#ffffff"
      />
    </svg>
  );
}
