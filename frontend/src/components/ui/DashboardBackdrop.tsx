import React from "react";
import { ROLE_THEME, type RoleKey } from "@/lib/role-theme";

/**
 * Softer, dashboard-friendly sibling of the login page's DoodleBackgroundElements.
 *
 * - Fixed to the viewport so it stays put while data scrolls.
 * - Doodles live in two narrow SVG strips pinned to the left/right edges
 *   (never cropped away, never sitting behind the busy centre of the page).
 * - Ambient glows are tinted with the signed-in role's accent colour.
 * - Doodles are hidden on small screens; only the glows remain on mobile.
 *
 * Must be rendered inside an `isolate` parent (see role layouts) so that the
 * negative z-index keeps it behind page content but above the body colour.
 */
export function DashboardBackdrop({ role }: { role: RoleKey }) {
  const t = ROLE_THEME[role];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden select-none"
    >
      {/* ─── Ambient role-tinted illumination ─────────────────────────── */}
      <div className={`absolute -top-48 -left-40 h-140 w-140 rounded-full blur-[150px] ${t.glowA}`} />
      <div className={`absolute -bottom-48 -right-40 h-140 w-140 rounded-full blur-[150px] ${t.glowB}`} />
      <div className="absolute top-1/3 -right-52 h-105 w-105 rounded-full bg-steel/8 blur-[130px]" />
      <div className="absolute bottom-0 -left-52 h-95 w-95 rounded-full bg-cream/10 blur-[130px]" />

      {/* ─── Left doodle strip ────────────────────────────────────────── */}
      <svg
        className="absolute left-0 top-0 hidden h-full w-65 opacity-70 dark:opacity-50 md:block"
        viewBox="0 0 260 900"
        preserveAspectRatio="xMinYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Flowing waves */}
        <path
          d="M -20 190 C 60 140, 120 240, 270 175"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={t.stroke}
        />
        <path
          d="M -20 225 C 70 180, 135 270, 270 212"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className="text-tan/40"
        />

        {/* Major starburst */}
        <Starburst x={34} y={100} size={40} className={t.star} pulse="4s" />
        <Starburst x={190} y={120} size={18} className="text-cream" pulse="5.2s" />

        {/* Cross sparkle */}
        <Cross x={182} y={300} size={18} className="text-steel" />

        {/* Floating mini note card */}
        <g transform="translate(28, 360)">
          <rect
            width="78"
            height="56"
            rx="11"
            className="fill-surface-raised/90 stroke-border-emphasis"
            strokeWidth="1.5"
          />
          <line x1="14" y1="17" x2="62" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/60" />
          <line x1="14" y1="29" x2="46" y2="29" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/45" />
          <circle cx="62" cy="41" r="5" className="fill-sage" />
          <polyline points="59.5,41 61.3,42.8 64.5,39.4" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Concentric ring */}
        <g transform="translate(196, 488)">
          <circle r="18" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" className="text-text-muted/40" />
          <circle r="9" stroke="currentColor" strokeWidth="1" className={t.stroke} />
          <circle r="2.5" fill="currentColor" className="text-tan" />
        </g>

        {/* Dashed arch */}
        <path
          d="M -10 660 C 60 570, 170 580, 250 670"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="5 7"
          className={t.strokeSoft}
        />

        {/* Pencil doodle */}
        <g transform="translate(150, 590) rotate(35)">
          <rect width="9" height="46" rx="2" className="fill-tan stroke-text-primary/70" strokeWidth="1.1" />
          <polygon points="0,46 9,46 4.5,57" className="fill-cream stroke-text-primary/70" strokeWidth="1.1" />
          <rect width="9" height="7" rx="1" className="fill-burgundy stroke-text-primary/70" strokeWidth="1.1" />
        </g>

        {/* Dot matrix */}
        <DotGrid x={36} y={730} cols={4} rows={3} className="fill-steel/50" />

        <Starburst x={176} y={800} size={22} className="text-tan" pulse="4.6s" />

        {/* Scattered constellation dots */}
        <circle cx="120" cy="80" r="3" fill="currentColor" className="text-tan/80" />
        <circle cx="90" cy="270" r="2.5" fill="currentColor" className="text-steel/70" />
        <circle cx="230" cy="400" r="3" fill="currentColor" className="text-sage/70" />
        <circle cx="60" cy="540" r="2.5" fill="currentColor" className="text-cream" />
        <circle cx="220" cy="760" r="3" fill="currentColor" className="text-text-muted/50" />
      </svg>

      {/* ─── Right doodle strip ───────────────────────────────────────── */}
      <svg
        className="absolute right-0 top-0 hidden h-full w-65 opacity-70 dark:opacity-50 md:block"
        viewBox="0 0 260 900"
        preserveAspectRatio="xMaxYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Flowing waves */}
        <path
          d="M -10 170 C 90 225, 160 125, 280 180"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-tan/55"
        />
        <path
          d="M -10 205 C 100 258, 170 160, 280 215"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className={t.strokeSoft}
        />

        <Starburst x={176} y={88} size={44} className={t.star} pulse="4.2s" />
        <Starburst x={50} y={110} size={16} className="text-tan" pulse="5.5s" />

        {/* "A+" grade pill */}
        <g transform="translate(96, 268)">
          <rect width="70" height="28" rx="14" className="fill-sage-ghost stroke-sage/50" strokeWidth="1.25" />
          <text x="35" y="18.5" textAnchor="middle" className="fill-sage font-mono text-[12px] font-bold">
            ✓ A+
          </text>
        </g>

        <Cross x={40} y={370} size={20} className={t.star} />

        {/* Floating bubble-sheet card */}
        <g transform="translate(150, 420)">
          <rect
            width="80"
            height="62"
            rx="11"
            className="fill-surface-raised/90 stroke-border-emphasis"
            strokeWidth="1.5"
          />
          {[18, 31, 44].map((cy, row) => (
            <g key={cy}>
              {[18, 32, 46, 60].map((cx, col) => (
                <circle
                  key={cx}
                  cx={cx}
                  cy={cy}
                  r="4"
                  strokeWidth="1"
                  className={
                    col === (row + 1) % 4
                      ? "fill-steel stroke-steel"
                      : "fill-surface-base stroke-border-emphasis"
                  }
                />
              ))}
            </g>
          ))}
        </g>

        {/* Swirl loop */}
        <path
          d="M 70 570 C 40 545 15 580 30 610 C 45 630 75 620 70 595 C 65 577 45 583 42 593"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className={t.stroke}
        />

        {/* Open-book doodle */}
        <g transform="translate(150, 610)">
          <path d="M 40 10 C 28 2, 12 2, 0 6 L 0 40 C 12 36, 28 36, 40 44 Z" className="fill-surface-raised/90 stroke-text-primary/60" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M 40 10 C 52 2, 68 2, 80 6 L 80 40 C 68 36, 52 36, 40 44 Z" className="fill-surface-raised/90 stroke-text-primary/60" strokeWidth="1.3" strokeLinejoin="round" />
          <line x1="10" y1="16" x2="30" y2="18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-text-muted/50" />
          <line x1="10" y1="24" x2="28" y2="26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-text-muted/40" />
          <line x1="50" y1="18" x2="70" y2="16" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-text-muted/50" />
          <line x1="52" y1="26" x2="70" y2="24" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-text-muted/40" />
        </g>

        <DotGrid x={164} y={730} cols={4} rows={3} className="fill-tan/50" />

        <Starburst x={50} y={800} size={24} className="text-steel" pulse="5s" />

        {/* Scattered constellation dots */}
        <circle cx="130" cy="70" r="3" fill="currentColor" className="text-steel/80" />
        <circle cx="200" cy="300" r="2.5" fill="currentColor" className="text-tan/70" />
        <circle cx="30" cy="470" r="3" fill="currentColor" className="text-cream" />
        <circle cx="120" cy="540" r="2.5" fill="currentColor" className="text-sage/70" />
        <circle cx="110" cy="840" r="3" fill="currentColor" className="text-text-muted/50" />
      </svg>
    </div>
  );
}

/* ── Tiny doodle primitives ─────────────────────────────────────────────── */

function Starburst({
  x,
  y,
  size,
  className,
  pulse,
}: {
  x: number;
  y: number;
  size: number;
  className: string;
  pulse?: string;
}) {
  const h = size / 2;
  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={pulse ? "animate-pulse" : undefined}
      style={pulse ? { animationDuration: pulse } : undefined}
    >
      <path
        d={`M ${h} 0 Q ${h} ${h} ${size} ${h} Q ${h} ${h} ${h} ${size} Q ${h} ${h} 0 ${h} Q ${h} ${h} ${h} 0 Z`}
        fill="currentColor"
        className={className}
      />
      {size >= 30 && <circle cx={h} cy={h} r={size / 10} fill="white" className="opacity-80" />}
    </g>
  );
}

function Cross({ x, y, size, className }: { x: number; y: number; size: number; className: string }) {
  const h = size / 2;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <line x1="0" y1={h} x2={size} y2={h} stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" className={className} />
      <line x1={h} y1="0" x2={h} y2={size} stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" className={className} />
    </g>
  );
}

function DotGrid({
  x,
  y,
  cols,
  rows,
  className,
}: {
  x: number;
  y: number;
  cols: number;
  rows: number;
  className: string;
}) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => (
          <circle key={`${r}-${c}`} cx={c * 20} cy={r * 20} r="3" className={className} />
        ))
      )}
    </g>
  );
}
