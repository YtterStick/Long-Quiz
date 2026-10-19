import React from "react";

interface IllustrationProps {
  className?: string;
}

/**
 * Modern minimalist line-art student illustration working with a laptop & bubble sheet on geometric pedestals.
 * Inspired by modern tech & editorial UI design (pastel shapes, fine line-art, warm accents).
 */
export function StudentDeskIllustration({ className = "w-72 h-72" }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 360 360"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Decorative dashed arch */}
      <path
        d="M 60 260 C 60 120, 300 120, 300 260"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="4 4"
        className="text-text-muted/30"
      />

      {/* Floating Sparkles & Squiggles */}
      <path
        d="M 45 140 Q 60 130 75 140 T 105 140"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-steel/40"
      />
      <circle cx="85" cy="115" r="3" fill="currentColor" className="text-tan/60" />
      <circle cx="280" cy="95" r="2.5" fill="currentColor" className="text-steel/50" />
      
      {/* Top right floating note/bubble sheet */}
      <g className="animate-pulse" style={{ animationDuration: "4s" }}>
        <rect
          x="245"
          y="105"
          width="50"
          height="38"
          rx="6"
          className="fill-surface-raised stroke-border-emphasis"
          strokeWidth="1.5"
        />
        <line x1="255" y1="118" x2="285" y2="118" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted/50" />
        <line x1="255" y1="128" x2="275" y2="128" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-text-muted/40" />
      </g>

      {/* Left Pedestal - Polka Dots Pattern */}
      <g>
        <rect
          x="30"
          y="230"
          width="48"
          height="90"
          rx="8"
          className="fill-tan-ghost stroke-tan/40"
          strokeWidth="1.5"
        />
        {/* Polka dots */}
        <circle cx="44" cy="245" r="2.5" className="fill-tan" />
        <circle cx="62" cy="255" r="2.5" className="fill-tan" />
        <circle cx="44" cy="270" r="2.5" className="fill-tan" />
        <circle cx="62" cy="285" r="2.5" className="fill-tan" />
        <circle cx="44" cy="300" r="2.5" className="fill-tan" />
      </g>

      {/* Center-left Arrow Block */}
      <g>
        <rect
          x="90"
          y="255"
          width="46"
          height="65"
          rx="6"
          className="fill-surface-raised stroke-border-emphasis"
          strokeWidth="1.5"
        />
        <path
          d="M 102 295 Q 112 285 122 272"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="text-text-primary"
        />
        <path
          d="M 112 272 L 122 272 L 122 282"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-text-primary"
        />
      </g>

      {/* Main Student Seating Block */}
      <rect
        x="215"
        y="215"
        width="65"
        height="105"
        rx="8"
        className="fill-surface-raised stroke-text-primary"
        strokeWidth="1.75"
      />

      {/* Right Polka Pedestal */}
      <g>
        <rect
          x="295"
          y="240"
          width="44"
          height="80"
          rx="6"
          className="fill-steel-ghost stroke-steel/40"
          strokeWidth="1.5"
        />
        <circle cx="308" cy="255" r="2" className="fill-steel" />
        <circle cx="324" cy="268" r="2" className="fill-steel" />
        <circle cx="308" cy="282" r="2" className="fill-steel" />
        <circle cx="324" cy="298" r="2" className="fill-steel" />
      </g>

      {/* Student Character */}
      {/* Hair / Head */}
      <circle cx="232" cy="148" r="14" className="fill-text-primary stroke-text-primary" strokeWidth="1.5" />
      {/* Ponytail bun */}
      <path
        d="M 242 144 C 255 146 258 160 250 168 C 244 165 240 156 242 144 Z"
        className="fill-text-primary stroke-text-primary"
      />
      {/* Face profile & neck */}
      <path
        d="M 226 150 C 224 156 226 162 230 166 L 230 174 L 235 174"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        className="text-text-primary"
      />
      {/* Patterned Blouse / Torso */}
      <path
        d="M 222 176 C 218 190 220 215 228 220 L 254 220 C 258 200 256 185 248 176 Z"
        className="fill-surface-base stroke-text-primary"
        strokeWidth="1.75"
      />
      {/* Blouse micro-pattern dashes */}
      <line x1="228" y1="184" x2="232" y2="188" stroke="currentColor" strokeWidth="1.2" className="text-text-primary" />
      <line x1="240" y1="182" x2="243" y2="186" stroke="currentColor" strokeWidth="1.2" className="text-text-primary" />
      <line x1="234" y1="196" x2="238" y2="200" stroke="currentColor" strokeWidth="1.2" className="text-text-primary" />
      <line x1="244" y1="198" x2="247" y2="202" stroke="currentColor" strokeWidth="1.2" className="text-text-primary" />
      <line x1="230" y1="208" x2="234" y2="212" stroke="currentColor" strokeWidth="1.2" className="text-text-primary" />

      {/* Arms & Hands typing */}
      <path
        d="M 230 185 L 210 205 L 195 205"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-primary"
      />

      {/* Laptop on lap */}
      <polygon
        points="178,206 198,206 206,178 186,178"
        className="fill-tan/30 stroke-tan"
        strokeWidth="1.5"
      />
      <line x1="172" y1="206" x2="205" y2="206" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />

      {/* Legs & Pants */}
      <path
        d="M 230 220 L 200 248 L 195 285 L 180 285"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-primary fill-none"
      />
      <path
        d="M 245 220 L 215 258 L 215 292 L 205 292"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-text-primary fill-none"
      />
      {/* Shoes */}
      <rect x="175" y="284" width="16" height="8" rx="2" className="fill-text-primary" />
      <rect x="202" y="291" width="16" height="8" rx="2" className="fill-text-primary" />

      {/* Base Floor Line */}
      <line
        x1="20"
        y1="320"
        x2="340"
        y2="320"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        className="text-border-emphasis"
      />
    </svg>
  );
}

/**
 * Modern floating exam & bubble sheet illustration with subtle badge flair.
 */
export function ExamSheetIllustration({ className = "w-64 h-64" }: IllustrationProps) {
  return (
    <svg
      viewBox="0 0 280 280"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Ambient background glow */}
      <circle cx="140" cy="140" r="100" className="fill-steel-ghost/40" />

      {/* Background slanted sheet */}
      <rect
        x="60"
        y="50"
        width="130"
        height="170"
        rx="14"
        transform="rotate(-8 60 50)"
        className="fill-surface-subtle stroke-border-default"
        strokeWidth="1.5"
      />

      {/* Foreground Exam Sheet */}
      <rect
        x="80"
        y="45"
        width="140"
        height="185"
        rx="16"
        className="fill-surface-raised stroke-border-emphasis shadow-xl"
        strokeWidth="1.75"
      />

      {/* Sheet Header */}
      <rect x="98" y="65" width="40" height="6" rx="3" className="fill-steel" />
      <rect x="98" y="77" width="80" height="4" rx="2" className="fill-text-muted/40" />
      <line x1="98" y1="92" x2="202" y2="92" stroke="currentColor" strokeWidth="1" className="text-border-subtle" />

      {/* Bubble Row 1 */}
      <g transform="translate(98, 106)">
        <text x="0" y="8" className="text-[9px] fill-text-muted font-bold font-mono">1.</text>
        <circle cx="22" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="38" cy="5" r="4.5" className="fill-steel stroke-steel" strokeWidth="1" />
        <circle cx="54" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="70" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
      </g>

      {/* Bubble Row 2 */}
      <g transform="translate(98, 126)">
        <text x="0" y="8" className="text-[9px] fill-text-muted font-bold font-mono">2.</text>
        <circle cx="22" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="38" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="54" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="70" cy="5" r="4.5" className="fill-sage stroke-sage" strokeWidth="1" />
      </g>

      {/* Bubble Row 3 */}
      <g transform="translate(98, 146)">
        <text x="0" y="8" className="text-[9px] fill-text-muted font-bold font-mono">3.</text>
        <circle cx="22" cy="5" r="4.5" className="fill-tan stroke-tan" strokeWidth="1" />
        <circle cx="38" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="54" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
        <circle cx="70" cy="5" r="4.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1" />
      </g>


      {/* Pencil Element */}
      <g transform="translate(45, 140) rotate(-35)">
        <rect x="0" y="0" width="10" height="50" rx="2" className="fill-tan stroke-text-primary" strokeWidth="1.25" />
        <polygon points="0,50 10,50 5,62" className="fill-cream stroke-text-primary" strokeWidth="1.25" />
        <polygon points="4,59 6,59 5,62" className="fill-text-primary" />
        <rect x="0" y="0" width="10" height="8" rx="1" className="fill-burgundy stroke-text-primary" strokeWidth="1.25" />
      </g>
    </svg>
  );
}

/**
 * Rich, expressive designer-crafted background canvas with hand-drawn bezier waves,
 * glowing starburst sparkles, constellation clusters, orbital arcs, floating sketch badges,
 * and ambient illumination halos. Fills desktop canvas beautifully without cluttering mobile.
 */
export function DoodleBackgroundElements() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden="true">
      {/* ─── Ambient Atmospheric Illumination Halos ───────────────────────────── */}
      <div className="absolute -top-32 left-[10%] h-137.5 w-137.5 rounded-full bg-steel/15 blur-[140px]" />
      <div className="absolute -top-20 right-[12%] h-125 w-125 rounded-full bg-tan/15 blur-[130px]" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-162.5 w-162.5 rounded-full bg-steel/8 blur-[160px]" />
      <div className="absolute -bottom-28 left-[15%] h-125 w-125 rounded-full bg-sage/12 blur-[140px]" />
      <div className="absolute -bottom-24 right-[10%] h-137.5 w-137.5 rounded-full bg-cream/12 blur-[130px]" />

      {/* ─── Fullscreen Scaled SVG Vector Layer ───────────────────────────────── */}
      <svg
        className="absolute inset-0 h-full w-full opacity-85 dark:opacity-70 transition-opacity duration-500"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
      >
        {/* ── Orbit / Center Halos (behind cards) ────────────────────── */}
        <ellipse
          cx="800"
          cy="450"
          rx="380"
          ry="300"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="6 10"
          className="text-text-muted/20"
        />
        <ellipse
          cx="800"
          cy="450"
          rx="520"
          ry="390"
          stroke="currentColor"
          strokeWidth="1"
          strokeDasharray="4 8"
          className="text-steel/20"
        />

        {/* ── 1. Top Wave Ribbons & Flowing Bezier Lines ────────────── */}
        {/* Left top flowing primary wave */}
        <path
          d="M -40 100 C 120 40, 260 190, 440 90 S 680 160, 780 110"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-steel/60"
        />
        {/* Left top secondary dashed companion wave */}
        <path
          d="M -20 140 C 140 75, 290 220, 480 120 S 690 195, 800 145"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className="text-tan/50"
        />
        {/* Left tertiary soft echo wave */}
        <path
          d="M 20 200 C 160 140, 260 250, 400 180 T 600 210"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="3 6"
          strokeLinecap="round"
          className="text-text-muted/35"
        />

        {/* Right top flowing primary wave */}
        <path
          d="M 820 110 C 940 160, 1160 80, 1340 160 S 1520 70, 1640 120"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-tan/60"
        />
        {/* Right top secondary dashed companion wave */}
        <path
          d="M 840 145 C 970 195, 1180 115, 1370 190 S 1540 105, 1660 155"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 8"
          strokeLinecap="round"
          className="text-steel/50"
        />

        {/* ── 2. Bottom Wave Ribbons ─────────────────────────────────── */}
        {/* Bottom-left flowing wave */}
        <path
          d="M -40 760 C 140 680, 300 820, 520 740 S 720 790, 820 750"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="text-sage/50"
        />
        <path
          d="M 20 800 C 180 730, 340 850, 550 780"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="5 7"
          strokeLinecap="round"
          className="text-text-muted/30"
        />

        {/* Bottom-right flowing wave */}
        <path
          d="M 820 750 C 960 790, 1160 710, 1360 800 S 1540 720, 1640 770"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="text-tan/55"
        />
        <path
          d="M 1080 760 C 1220 820, 1390 750, 1620 820"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeDasharray="4 6"
          strokeLinecap="round"
          className="text-steel/45"
        />

        {/* ── 3. Starbursts & Radiant Stars (Abundant & Dynamic) ───── */}

        {/* Starburst A: Far Top-Left Major Starburst */}
        <g transform="translate(130, 70)" className="animate-pulse" style={{ animationDuration: "3.5s" }}>
          <path
            d="M 22 0 Q 22 22 44 22 Q 22 22 22 44 Q 22 22 0 22 Q 22 22 22 0 Z"
            fill="currentColor"
            className="text-tan"
          />
          <circle cx="22" cy="22" r="4" fill="white" className="opacity-80" />
        </g>
        {/* Radiating rays around Starburst A */}
        <line x1="152" y1="62" x2="152" y2="56" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-tan/70" />
        <line x1="152" y1="122" x2="152" y2="128" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-tan/70" />
        <line x1="122" y1="92" x2="116" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-tan/70" />
        <line x1="182" y1="92" x2="188" y2="92" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-tan/70" />

        {/* Starburst B: Top-Left Companion Sparkle */}
        <g transform="translate(280, 50)" className="animate-pulse" style={{ animationDuration: "4.8s" }}>
          <path
            d="M 14 0 Q 14 14 28 14 Q 14 14 14 28 Q 14 14 0 14 Q 14 14 14 0 Z"
            fill="currentColor"
            className="text-steel"
          />
        </g>

        {/* Starburst C: Mid-Left Floating Star (near left illustration) */}
        <g transform="translate(60, 360)">
          <path
            d="M 16 0 Q 16 16 32 16 Q 16 16 16 32 Q 16 16 0 16 Q 16 16 16 0 Z"
            fill="currentColor"
            className="text-sage/80"
          />
          <circle cx="16" cy="16" r="3" fill="currentColor" className="text-white/60" />
        </g>

        {/* Starburst D: Far Top-Right Major Starburst */}
        <g transform="translate(1420, 65)" className="animate-pulse" style={{ animationDuration: "4.2s" }}>
          <path
            d="M 24 0 Q 24 24 48 24 Q 24 24 24 48 Q 24 24 0 24 Q 24 24 24 0 Z"
            fill="currentColor"
            className="text-steel"
          />
          <circle cx="24" cy="24" r="4.5" fill="white" className="opacity-80" />
        </g>
        {/* Radiating rays around Starburst D */}
        <line x1="1444" y1="55" x2="1444" y2="48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-steel/70" />
        <line x1="1444" y1="123" x2="1444" y2="130" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-steel/70" />
        <line x1="1410" y1="89" x2="1403" y2="89" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-steel/70" />
        <line x1="1478" y1="89" x2="1485" y2="89" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-steel/70" />

        {/* Starburst E: Top-Right Companion Sparkle */}
        <g transform="translate(1250, 45)" className="animate-pulse" style={{ animationDuration: "5.5s" }}>
          <path
            d="M 15 0 Q 15 15 30 15 Q 15 15 15 30 Q 15 15 0 15 Q 15 15 15 0 Z"
            fill="currentColor"
            className="text-tan"
          />
        </g>

        {/* Starburst F: Mid-Right Floating Star */}
        <g transform="translate(1500, 380)">
          <path
            d="M 18 0 Q 18 18 36 18 Q 18 18 18 36 Q 18 18 0 18 Q 18 18 18 0 Z"
            fill="currentColor"
            className="text-tan/85"
          />
          <circle cx="18" cy="18" r="3.5" fill="currentColor" className="text-white/60" />
        </g>

        {/* Starburst G: Center-Left Upper Star (above card) */}
        <g transform="translate(540, 110)" className="animate-pulse" style={{ animationDuration: "3.8s" }}>
          <path
            d="M 12 0 Q 12 12 24 12 Q 12 12 12 24 Q 12 12 0 12 Q 12 12 12 0 Z"
            fill="currentColor"
            className="text-cream"
          />
        </g>

        {/* Starburst H: Center-Right Upper Star (above card) */}
        <g transform="translate(1040, 100)" className="animate-pulse" style={{ animationDuration: "4.6s" }}>
          <path
            d="M 13 0 Q 13 13 26 13 Q 13 13 13 26 Q 13 13 0 13 Q 13 13 13 0 Z"
            fill="currentColor"
            className="text-sage"
          />
        </g>

        {/* Starburst I: Bottom-Left Starburst */}
        <g transform="translate(220, 680)" className="animate-pulse" style={{ animationDuration: "5.2s" }}>
          <path
            d="M 20 0 Q 20 20 40 20 Q 20 20 20 40 Q 20 20 0 20 Q 20 20 20 0 Z"
            fill="currentColor"
            className="text-steel"
          />
          <circle cx="20" cy="20" r="4" fill="white" className="opacity-75" />
        </g>

        {/* Starburst J: Bottom-Right Starburst */}
        <g transform="translate(1360, 690)" className="animate-pulse" style={{ animationDuration: "4.0s" }}>
          <path
            d="M 20 0 Q 20 20 40 20 Q 20 20 20 40 Q 20 20 0 20 Q 20 20 20 0 Z"
            fill="currentColor"
            className="text-tan"
          />
          <circle cx="20" cy="20" r="4" fill="white" className="opacity-75" />
        </g>

        {/* Starburst K: Far Bottom-Left Tiny Sparkle */}
        <g transform="translate(90, 780)">
          <path
            d="M 10 0 Q 10 10 20 10 Q 10 10 10 20 Q 10 10 0 10 Q 10 10 10 0 Z"
            fill="currentColor"
            className="text-tan/70"
          />
        </g>

        {/* Starburst L: Far Bottom-Right Tiny Sparkle */}
        <g transform="translate(1510, 790)">
          <path
            d="M 11 0 Q 11 11 22 11 Q 11 11 11 22 Q 11 11 0 11 Q 11 11 11 0 Z"
            fill="currentColor"
            className="text-steel/70"
          />
        </g>

        {/* ── 4. Cross Sparkles & Diamond Stars (✦ / +) ──────────────── */}
        {/* Left side cross sparkles */}
        <g transform="translate(70, 180)">
          <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-tan" />
          <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-tan" />
        </g>
        <g transform="translate(240, 240)">
          <line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
          <line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
        </g>
        <g transform="translate(390, 90)">
          <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-sage" />
          <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-sage" />
        </g>
        <g transform="translate(480, 520)">
          <line x1="0" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
          <line x1="9" y1="0" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
        </g>

        {/* Right side cross sparkles */}
        <g transform="translate(1530, 200)">
          <line x1="0" y1="10" x2="20" y2="10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-steel" />
          <line x1="10" y1="0" x2="10" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-steel" />
        </g>
        <g transform="translate(1330, 260)">
          <line x1="0" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
          <line x1="8" y1="0" x2="8" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
        </g>
        <g transform="translate(1180, 85)">
          <line x1="0" y1="7" x2="14" y2="7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-steel" />
          <line x1="7" y1="0" x2="7" y2="14" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-steel" />
        </g>
        <g transform="translate(1100, 530)">
          <line x1="0" y1="9" x2="18" y2="9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-sage" />
          <line x1="9" y1="0" x2="9" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-sage" />
        </g>

        {/* ── 5. Swirls, Curly Doodles & Arcs ───────────────────────── */}
        {/* Top left swirl loop */}
        <path
          d="M 330 65 C 360 40 385 75 370 105 C 355 125 325 115 330 90 C 335 72 355 78 358 88"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="text-tan/75"
        />
        {/* Top right swirl loop */}
        <path
          d="M 1220 70 C 1190 45 1165 80 1180 110 C 1195 130 1225 120 1220 95 C 1215 77 1195 83 1192 93"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          className="text-steel/75"
        />

        {/* Mid-Left Connecting Arch & Dots */}
        <path
          d="M 50 480 C 130 350 270 370 360 460"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeDasharray="5 7"
          className="text-steel/40"
        />
        {/* Mid-Right Connecting Arch & Dots */}
        <path
          d="M 1240 450 C 1330 335 1470 355 1550 480"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeDasharray="5 7"
          className="text-tan/40"
        />

        {/* Floating concentric ring accents */}
        <g transform="translate(420, 320)">
          <circle cx="0" cy="0" r="16" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" className="text-text-muted/40" />
          <circle cx="0" cy="0" r="8" stroke="currentColor" strokeWidth="1" className="text-steel/50" />
          <circle cx="0" cy="0" r="2.5" fill="currentColor" className="text-tan" />
        </g>
        <g transform="translate(1180, 330)">
          <circle cx="0" cy="0" r="18" stroke="currentColor" strokeWidth="1.25" strokeDasharray="3 4" className="text-text-muted/40" />
          <circle cx="0" cy="0" r="9" stroke="currentColor" strokeWidth="1" className="text-tan/50" />
          <circle cx="0" cy="0" r="2.5" fill="currentColor" className="text-steel" />
        </g>

        {/* ── 6. Floating Abstract Geometric Badges & Sketch Pills ──── */}
        {/* Left: Floating Mini Note Card */}
        <g transform="translate(70, 240)">
          <rect
            x="0"
            y="0"
            width="72"
            height="52"
            rx="10"
            className="fill-surface-raised/90 stroke-border-emphasis shadow-lg"
            strokeWidth="1.5"
          />
          <line x1="14" y1="16" x2="58" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/60" />
          <line x1="14" y1="28" x2="44" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/45" />
          <circle cx="56" cy="38" r="4" fill="currentColor" className="text-sage" />
          <polyline points="54,38 55.5,39.5 58,37" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
        </g>

        {/* Left: Floating Quick Tag [ 100% ] */}
        <g transform="translate(380, 200)">
          <rect
            x="0"
            y="0"
            width="64"
            height="26"
            rx="13"
            className="fill-sage-ghost stroke-sage/50"
            strokeWidth="1.25"
          />
          <text x="32" y="17" textAnchor="middle" className="text-[11px] font-mono font-bold fill-sage">
            ✓ 100%
          </text>
        </g>

        {/* Right: Floating Mini Study Card */}
        <g transform="translate(1440, 230)">
          <rect
            x="0"
            y="0"
            width="76"
            height="54"
            rx="10"
            className="fill-surface-raised/90 stroke-border-emphasis shadow-lg"
            strokeWidth="1.5"
          />
          <line x1="16" y1="18" x2="60" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/60" />
          <line x1="16" y1="30" x2="48" y2="30" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-muted/45" />
          <circle cx="60" cy="40" r="4" fill="currentColor" className="text-tan" />
        </g>

        {/* Right: Floating Quick Tag [ OMR ] */}
        <g transform="translate(1150, 210)">
          <rect
            x="0"
            y="0"
            width="58"
            height="26"
            rx="13"
            className="fill-steel-ghost stroke-steel/50"
            strokeWidth="1.25"
          />
          <text x="29" y="17" textAnchor="middle" className="text-[11px] font-mono font-bold fill-steel">
            ✦ OMR
          </text>
        </g>

        {/* Left-Center: Floating Arrow Badge */}
        <g transform="translate(470, 150)">
          <rect
            x="0"
            y="0"
            width="36"
            height="36"
            rx="8"
            className="fill-steel-ghost stroke-steel/40"
            strokeWidth="1.5"
          />
          <path
            d="M 12 24 L 24 12 M 16 12 L 24 12 L 24 20"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-steel"
          />
        </g>

        {/* Right-Center: Floating Check Badge */}
        <g transform="translate(1080, 170)">
          <circle cx="18" cy="18" r="16" className="fill-tan-ghost stroke-tan/40" strokeWidth="1.5" />
          <path
            d="M 11 18 L 16 23 L 25 13"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tan"
          />
        </g>

        {/* ── 7. Polka Dot Matrices & Constellation Clusters ───────── */}
        {/* Far Left Bottom Dot Grid */}
        <g transform="translate(50, 600)">
          <circle cx="0" cy="0" r="3" className="fill-steel/60" />
          <circle cx="20" cy="0" r="3" className="fill-steel/60" />
          <circle cx="40" cy="0" r="3" className="fill-steel/60" />
          <circle cx="60" cy="0" r="3" className="fill-steel/60" />
          <circle cx="0" cy="20" r="3" className="fill-steel/60" />
          <circle cx="20" cy="20" r="3" className="fill-steel/60" />
          <circle cx="40" cy="20" r="3" className="fill-steel/60" />
          <circle cx="60" cy="20" r="3" className="fill-steel/60" />
          <circle cx="0" cy="40" r="3" className="fill-steel/60" />
          <circle cx="20" cy="40" r="3" className="fill-steel/60" />
          <circle cx="40" cy="40" r="3" className="fill-steel/60" />
          <circle cx="60" cy="40" r="3" className="fill-steel/60" />
        </g>

        {/* Far Right Bottom Dot Grid */}
        <g transform="translate(1470, 600)">
          <circle cx="0" cy="0" r="3" className="fill-tan/60" />
          <circle cx="20" cy="0" r="3" className="fill-tan/60" />
          <circle cx="40" cy="0" r="3" className="fill-tan/60" />
          <circle cx="60" cy="0" r="3" className="fill-tan/60" />
          <circle cx="0" cy="20" r="3" className="fill-tan/60" />
          <circle cx="20" cy="20" r="3" className="fill-tan/60" />
          <circle cx="40" cy="20" r="3" className="fill-tan/60" />
          <circle cx="60" cy="20" r="3" className="fill-tan/60" />
          <circle cx="0" cy="40" r="3" className="fill-tan/60" />
          <circle cx="20" cy="40" r="3" className="fill-tan/60" />
          <circle cx="40" cy="40" r="3" className="fill-tan/60" />
          <circle cx="60" cy="40" r="3" className="fill-tan/60" />
        </g>

        {/* Dense Constellation Star Dots scattered across the sky */}
        <circle cx="100" cy="120" r="3.5" fill="currentColor" className="text-tan" />
        <circle cx="210" cy="150" r="2.5" fill="currentColor" className="text-steel" />
        <circle cx="310" cy="180" r="3" fill="currentColor" className="text-sage" />
        <circle cx="460" cy="90" r="3.5" fill="currentColor" className="text-cream" />
        <circle cx="500" cy="260" r="2" fill="currentColor" className="text-text-muted/60" />
        <circle cx="580" cy="380" r="3" fill="currentColor" className="text-tan/70" />

        <circle cx="1500" cy="140" r="3.5" fill="currentColor" className="text-steel" />
        <circle cx="1380" cy="170" r="2.5" fill="currentColor" className="text-tan" />
        <circle cx="1290" cy="140" r="3" fill="currentColor" className="text-cream" />
        <circle cx="1120" cy="100" r="3.5" fill="currentColor" className="text-sage" />
        <circle cx="1090" cy="270" r="2" fill="currentColor" className="text-text-muted/60" />
        <circle cx="1020" cy="390" r="3" fill="currentColor" className="text-steel/70" />

        {/* Bottom Constellation Star Dots */}
        <circle cx="180" cy="610" r="3" fill="currentColor" className="text-tan/80" />
        <circle cx="340" cy="720" r="3.5" fill="currentColor" className="text-steel/80" />
        <circle cx="460" cy="650" r="2.5" fill="currentColor" className="text-sage/80" />
        <circle cx="600" cy="740" r="3" fill="currentColor" className="text-tan/70" />

        <circle cx="1420" cy="620" r="3" fill="currentColor" className="text-steel/80" />
        <circle cx="1260" cy="730" r="3.5" fill="currentColor" className="text-tan/80" />
        <circle cx="1140" cy="660" r="2.5" fill="currentColor" className="text-sage/80" />
        <circle cx="980" cy="750" r="3" fill="currentColor" className="text-steel/70" />
      </svg>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   ROLE ILLUSTRATIONS — used by the dashboard WelcomeHero.
   Same visual language as the login art: fine line-work, theme-aware fills,
   pastel pedestals, polka dots, sparkles and a single floor line.
   ═════════════════════════════════════════════════════════════════════════ */

/**
 * Admin — classic school building with flag & clock, plus a checklist clipboard.
 */
export function AdminCampusIllustration({ className = "w-64 h-48" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Dashed backdrop arch */}
      <path d="M 20 180 C 20 60, 240 60, 240 180" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" className="text-text-muted/30" />

      {/* Tree */}
      <line x1="22" y1="150" x2="22" y2="180" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
      <circle cx="22" cy="138" r="15" className="fill-sage-ghost stroke-sage/60" strokeWidth="1.5" />
      <circle cx="17" cy="134" r="2" className="fill-sage/70" />
      <circle cx="27" cy="142" r="2" className="fill-sage/70" />

      {/* Steps */}
      <rect x="32" y="172" width="136" height="7" rx="2" className="fill-surface-subtle stroke-border-emphasis" strokeWidth="1.25" />
      <rect x="40" y="165" width="120" height="7" rx="2" className="fill-surface-raised stroke-border-emphasis" strokeWidth="1.25" />

      {/* Building body */}
      <rect x="46" y="102" width="108" height="63" className="fill-surface-raised stroke-text-primary" strokeWidth="1.75" />

      {/* Columns */}
      {[56, 74, 119, 137].map((x) => (
        <rect key={x} x={x} y="108" width="7" height="57" rx="1.5" className="fill-surface-base stroke-border-emphasis" strokeWidth="1.25" />
      ))}

      {/* Door */}
      <path d="M 90 165 V 134 Q 100 122 110 134 V 165" className="fill-steel-ghost stroke-text-primary" strokeWidth="1.5" />
      <line x1="100" y1="128" x2="100" y2="165" stroke="currentColor" strokeWidth="1" className="text-text-primary/50" />

      {/* Pediment roof */}
      <polygon points="38,102 100,64 162,102" className="fill-tan-ghost stroke-text-primary" strokeWidth="1.75" strokeLinejoin="round" />

      {/* Clock */}
      <circle cx="100" cy="88" r="8.5" className="fill-surface-raised stroke-text-primary" strokeWidth="1.5" />
      <line x1="100" y1="88" x2="100" y2="83" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-text-primary" />
      <line x1="100" y1="88" x2="104" y2="90" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="text-text-primary" />

      {/* Flag */}
      <line x1="100" y1="64" x2="100" y2="34" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      <path d="M 100 35 L 122 40 L 100 47 Z" className="fill-burgundy stroke-text-primary" strokeWidth="1" strokeLinejoin="round" />

      {/* Clipboard */}
      <g transform="translate(176, 92) rotate(6)">
        <rect x="0" y="0" width="60" height="82" rx="7" className="fill-tan-ghost stroke-text-primary" strokeWidth="1.75" />
        <rect x="6" y="10" width="48" height="66" rx="3" className="fill-surface-raised stroke-border-emphasis" strokeWidth="1.25" />
        <rect x="19" y="-5" width="22" height="11" rx="3" className="fill-tan stroke-text-primary" strokeWidth="1.25" />
        {[24, 40, 56].map((y, i) => (
          <g key={y}>
            <rect x="12" y={y - 5} width="9" height="9" rx="2" className={i < 2 ? "fill-sage-ghost stroke-sage" : "fill-surface-base stroke-border-emphasis"} strokeWidth="1.2" />
            {i < 2 && (
              <polyline points={`${14},${y} ${16},${y + 2} ${19.5},${y - 2}`} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-sage" />
            )}
            <line x1="26" y1={y} x2={i === 1 ? 42 : 48} y2={y} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="text-text-muted/55" />
          </g>
        ))}
      </g>

      {/* Floating pie-chart badge */}
      <g transform="translate(222, 46)" className="animate-pulse" style={{ animationDuration: "4.5s" }}>
        <circle r="17" className="fill-surface-raised stroke-border-emphasis" strokeWidth="1.5" />
        <circle r="11" className="fill-steel-ghost" />
        <path d="M 0 0 L 0 -11 A 11 11 0 0 1 10.46 3.4 Z" className="fill-steel" />
        <path d="M 0 0 L 10.46 3.4 A 11 11 0 0 1 -3.4 10.46 Z" className="fill-tan" />
      </g>

      {/* Sparkles */}
      <path d="M 180 14 Q 180 22 188 22 Q 180 22 180 30 Q 180 22 172 22 Q 180 22 180 14 Z" className="fill-tan" />
      <g transform="translate(46, 42)">
        <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
        <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
      </g>
      <circle cx="150" cy="40" r="2.5" className="fill-cream" />
      <circle cx="70" cy="70" r="2" className="fill-sage/70" />

      {/* Floor */}
      <line x1="8" y1="180" x2="252" y2="180" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-border-emphasis" />
    </svg>
  );
}

/**
 * Teacher — standing at a chalkboard with bubble rows & a progress chart,
 * beside a desk holding graded papers and the classic apple.
 */
export function TeacherChalkboardIllustration({ className = "w-64 h-48" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Dashed backdrop arch */}
      <path d="M 14 180 C 14 50, 246 50, 246 180" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" className="text-text-muted/30" />

      {/* Easel legs */}
      <line x1="38" y1="124" x2="30" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      <line x1="134" y1="124" x2="142" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />

      {/* Chalkboard frame & surface */}
      <rect x="18" y="28" width="136" height="94" rx="8" className="fill-tan-ghost stroke-text-primary" strokeWidth="1.75" />
      <rect x="26" y="36" width="120" height="78" rx="4" className="fill-steel-ghost stroke-steel/40" strokeWidth="1.25" />

      {/* Bubble rows on board */}
      {[
        { y: 52, filled: 1, cls: "fill-steel stroke-steel" },
        { y: 70, filled: 3, cls: "fill-sage stroke-sage" },
        { y: 88, filled: 0, cls: "fill-tan stroke-tan" },
      ].map((row, i) => (
        <g key={row.y}>
          <text x="32" y={row.y + 3} className="fill-text-muted font-mono text-[8px] font-bold">
            {i + 1}.
          </text>
          {[46, 58, 70, 82].map((cx, j) => (
            <circle
              key={cx}
              cx={cx}
              cy={row.y}
              r="4.2"
              strokeWidth="1"
              className={j === row.filled ? row.cls : "fill-surface-raised stroke-border-emphasis"}
            />
          ))}
        </g>
      ))}

      {/* Mini bar chart */}
      <line x1="98" y1="102" x2="140" y2="102" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-text-muted/60" />
      <rect x="102" y="84" width="8" height="18" rx="2" className="fill-steel/80" />
      <rect x="114" y="74" width="8" height="28" rx="2" className="fill-sage/80" />
      <rect x="126" y="62" width="8" height="40" rx="2" className="fill-tan/80" />
      <path d="M 100 70 Q 116 60 136 48" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" strokeLinecap="round" className="text-burgundy/70" />
      <path d="M 131 47 L 137 47.5 L 135 53" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-burgundy/70" />

      {/* Chalk tray */}
      <rect x="40" y="121" width="92" height="5" rx="2" className="fill-tan stroke-text-primary" strokeWidth="1.1" />
      <rect x="62" y="118" width="10" height="3" rx="1" className="fill-surface-raised" />

      {/* ── Teacher figure ── */}
      {/* Pointer arm */}
      <path d="M 168 102 L 152 94 L 142 86" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      <line x1="142" y1="86" x2="120" y2="66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-tan" />
      {/* Head + hair bun */}
      <circle cx="180" cy="72" r="12" className="fill-text-primary" />
      <circle cx="190" cy="63" r="5.5" className="fill-text-primary" />
      {/* Neck */}
      <line x1="180" y1="84" x2="180" y2="90" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      {/* Blazer */}
      <path d="M 166 92 C 162 110 163 134 167 142 L 193 142 C 197 132 197 110 194 92 Z" className="fill-steel-ghost stroke-text-primary" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M 174 92 L 180 103 L 186 92" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      {/* Arm holding a book */}
      <path d="M 192 100 L 199 118 L 190 124" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      <rect x="184" y="114" width="13" height="17" rx="2" className="fill-burgundy stroke-text-primary" strokeWidth="1.25" />
      {/* Legs & shoes */}
      <path d="M 172 142 L 170 176" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-primary" />
      <path d="M 188 142 L 190 176" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-text-primary" />
      <rect x="162" y="175" width="12" height="6" rx="2" className="fill-text-primary" />
      <rect x="187" y="175" width="12" height="6" rx="2" className="fill-text-primary" />

      {/* ── Desk with apple & graded papers ── */}
      <line x1="212" y1="134" x2="212" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      <line x1="246" y1="134" x2="246" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      <rect x="206" y="128" width="46" height="6" rx="2" className="fill-tan stroke-text-primary" strokeWidth="1.25" />
      {/* Apple */}
      <circle cx="215" cy="121" r="6.5" className="fill-burgundy stroke-text-primary" strokeWidth="1" />
      <line x1="215" y1="115" x2="215.5" y2="111" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-text-primary" />
      <path d="M 216 113 Q 220 108 223 110 Q 220 114 216 113 Z" className="fill-sage" />
      {/* Paper stack with A+ */}
      <rect x="226" y="120" width="24" height="8" rx="1.5" className="fill-surface-raised stroke-border-emphasis" strokeWidth="1.1" />
      <rect x="228" y="112" width="22" height="8" rx="1.5" className="fill-surface-raised stroke-border-emphasis" strokeWidth="1.1" />
      <text x="239" y="118.5" textAnchor="middle" className="fill-sage font-mono text-[6px] font-black">
        A+
      </text>

      {/* Sparkles */}
      <path d="M 168 16 Q 168 25 177 25 Q 168 25 168 34 Q 168 25 159 25 Q 168 25 168 16 Z" className="fill-tan animate-pulse" style={{ animationDuration: "4s" }} />
      <g transform="translate(232, 64)">
        <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
        <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
      </g>
      <circle cx="210" cy="40" r="2.5" className="fill-cream" />
      <circle cx="12" cy="60" r="2" className="fill-sage/70" />

      {/* Floor */}
      <line x1="8" y1="180" x2="252" y2="180" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-border-emphasis" />
    </svg>
  );
}

/**
 * Student — studying at a desk with an open book, pencil cup, a stack of
 * books topped with a graduation cap, a light-bulb idea and an A+ badge.
 */
export function StudentStudyIllustration({ className = "w-64 h-48" }: IllustrationProps) {
  return (
    <svg viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      {/* Dashed backdrop arch */}
      <path d="M 24 180 C 24 50, 236 50, 236 180" stroke="currentColor" strokeWidth="1.25" strokeDasharray="4 4" className="text-text-muted/30" />

      {/* Polka pedestal (left) */}
      <rect x="6" y="128" width="30" height="52" rx="6" className="fill-sage-ghost stroke-sage/40" strokeWidth="1.25" />
      <circle cx="15" cy="140" r="2" className="fill-sage" />
      <circle cx="27" cy="150" r="2" className="fill-sage" />
      <circle cx="15" cy="162" r="2" className="fill-sage" />
      <circle cx="27" cy="172" r="2" className="fill-sage" />

      {/* ── Student ── */}
      {/* Body / sweater */}
      <path d="M 88 132 C 88 110 96 99 112 99 C 128 99 136 110 136 132 Z" className="fill-sage-ghost stroke-text-primary" strokeWidth="1.75" strokeLinejoin="round" />
      <path d="M 104 100 L 112 108 L 120 100" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      {/* Neck */}
      <line x1="112" y1="93" x2="112" y2="99" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      {/* Face */}
      <circle cx="112" cy="80" r="13" className="fill-surface-raised stroke-text-primary" strokeWidth="1.75" />
      {/* Hair */}
      <path d="M 99 79 C 97 62 127 60 125 79 C 120 71 106 70 99 79 Z" className="fill-text-primary" />
      {/* Eyes (focused, looking down) & smile */}
      <path d="M 105 83 Q 107 85 109 83" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-primary" />
      <path d="M 115 83 Q 117 85 119 83" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-primary" />
      <path d="M 108.5 88 Q 112 90.5 115.5 88" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-text-primary" />
      {/* Arms */}
      <path d="M 94 112 Q 88 124 96 128 L 104 128" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      <path d="M 130 112 Q 136 122 140 122" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-primary" />
      {/* Pencil in hand */}
      <line x1="138" y1="124" x2="147" y2="111" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-tan" />
      <circle cx="137.5" cy="124.8" r="1.2" className="fill-text-primary" />

      {/* Open book on desk */}
      <path d="M 112 131 L 82 127 L 84 120 L 112 123 Z" className="fill-surface-raised stroke-text-primary" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M 112 131 L 142 127 L 140 120 L 112 123 Z" className="fill-surface-raised stroke-text-primary" strokeWidth="1.4" strokeLinejoin="round" />
      <line x1="90" y1="124" x2="106" y2="126" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-text-muted/60" />
      <line x1="118" y1="126" x2="134" y2="124" stroke="currentColor" strokeWidth="1" strokeLinecap="round" className="text-text-muted/60" />

      {/* Desk */}
      <rect x="44" y="131" width="150" height="7" rx="3" className="fill-tan-ghost stroke-text-primary" strokeWidth="1.5" />
      <line x1="56" y1="138" x2="56" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />
      <line x1="182" y1="138" x2="182" y2="180" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" className="text-text-primary" />

      {/* Pencil cup */}
      <line x1="58" y1="114" x2="55" y2="100" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-tan" />
      <line x1="64" y1="114" x2="65" y2="98" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-steel" />
      <line x1="69" y1="114" x2="73" y2="102" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-burgundy" />
      <rect x="54" y="112" width="18" height="19" rx="3" className="fill-tan-ghost stroke-text-primary" strokeWidth="1.4" />

      {/* Book stack */}
      <rect x="150" y="119" width="36" height="12" rx="2" className="fill-steel-ghost stroke-text-primary" strokeWidth="1.4" />
      <line x1="156" y1="119" x2="156" y2="131" stroke="currentColor" strokeWidth="1" className="text-steel" />
      <rect x="154" y="108" width="29" height="11" rx="2" className="fill-burgundy-ghost stroke-text-primary" strokeWidth="1.4" />
      <line x1="160" y1="108" x2="160" y2="119" stroke="currentColor" strokeWidth="1" className="text-burgundy" />
      <rect x="148" y="98" width="33" height="10" rx="2" className="fill-sage-ghost stroke-text-primary" strokeWidth="1.4" />
      <line x1="154" y1="98" x2="154" y2="108" stroke="currentColor" strokeWidth="1" className="text-sage" />

      {/* Graduation cap */}
      <rect x="157" y="90" width="16" height="7" rx="1.5" className="fill-text-primary" />
      <polygon points="165,80 186,87.5 165,95 144,87.5" className="fill-text-primary" />
      <path d="M 186 87.5 L 188 99" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" className="text-tan" />
      <circle cx="188" cy="100.5" r="2" className="fill-tan" />

      {/* Light-bulb idea */}
      <g className="animate-pulse" style={{ animationDuration: "3.5s" }}>
        <circle cx="140" cy="48" r="9" className="fill-cream-ghost stroke-cream" strokeWidth="1.5" />
        <rect x="136" y="56" width="8" height="5" rx="1.5" className="fill-surface-raised stroke-cream" strokeWidth="1.2" />
        <path d="M 137 49 Q 140 44 143 49" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" className="text-cream" />
        <line x1="140" y1="33" x2="140" y2="29" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-cream" />
        <line x1="127" y1="40" x2="124" y2="37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-cream" />
        <line x1="153" y1="40" x2="156" y2="37" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-cream" />
      </g>

      {/* A+ badge */}
      <g transform="translate(50, 58)" className="animate-bounce" style={{ animationDuration: "3s" }}>
        <circle r="16" className="fill-sage" />
        <text x="0" y="5" textAnchor="middle" className="fill-white text-[13px] font-black">
          A+
        </text>
      </g>

      {/* Sparkles */}
      <path d="M 212 30 Q 212 39 221 39 Q 212 39 212 48 Q 212 39 203 39 Q 212 39 212 30 Z" className="fill-tan" />
      <g transform="translate(222, 110)">
        <line x1="0" y1="6" x2="12" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
        <line x1="6" y1="0" x2="6" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-steel" />
      </g>
      <circle cx="90" cy="40" r="2.5" className="fill-steel/70" />
      <circle cx="236" cy="72" r="2" className="fill-sage/70" />

      {/* Floor */}
      <line x1="4" y1="180" x2="256" y2="180" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" className="text-border-emphasis" />
    </svg>
  );
}
