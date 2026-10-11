"use client";

import React from "react";
import {
  StudentAvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  ACCENT_COLORS,
  BACKDROP_THEMES,
} from "@/types/avatar";

interface StudentAvatarProps {
  config: StudentAvatarConfig;
  size?: number | string;
  className?: string;
  showBackdrop?: boolean;
  animate?: boolean;
}

export function StudentAvatar({
  config,
  size = 120,
  className = "",
  showBackdrop = true,
  animate = false,
}: StudentAvatarProps) {
  const skin = SKIN_TONES[config.skinTone] || SKIN_TONES.peach;
  const hair = HAIR_COLORS[config.hairColor] || HAIR_COLORS.midnight;
  const outfit = OUTFIT_COLORS[config.outfitColor] || OUTFIT_COLORS.steel;
  const accent = ACCENT_COLORS[config.outfitAccent] || ACCENT_COLORS.cream;
  const backdrop = BACKDROP_THEMES[config.backdrop] || BACKDROP_THEMES.study_glow;
  const isFemale = config.gender !== "male";
  const shoulderY = isFemale ? 145 : 138;
  const lapelLeftX = isFemale ? 76 : 68;
  const lapelRightX = isFemale ? 124 : 132;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden rounded-full ${className}`}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`w-full h-full transition-transform duration-300 ${
          animate ? "hover:scale-105 active:scale-95" : ""
        }`}
      >
        <defs>
          {/* Backdrop radial glow */}
          <radialGradient id={`glow-${config.backdrop}`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={backdrop.ringColor} stopOpacity="0.4" />
            <stop offset="70%" stopColor={backdrop.ringColor} stopOpacity="0.1" />
            <stop offset="100%" stopColor={backdrop.ringColor} stopOpacity="0.0" />
          </radialGradient>

          {/* Hair shine gradient */}
          <linearGradient id={`hair-shine-${config.hairColor}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={hair.highlight} stopOpacity="0.9" />
            <stop offset="100%" stopColor={hair.hex} />
          </linearGradient>

          {/* Outfit lighting gradient */}
          <linearGradient id={`outfit-grad-${config.outfitColor}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={outfit.hex} />
            <stop offset="100%" stopColor={outfit.shadow} />
          </linearGradient>
        </defs>

        {/* ── 1. Backdrop Canvas ──────────────────────────────────── */}
        {showBackdrop && (
          <g>
            <circle cx="100" cy="100" r="98" className="fill-surface-base" />
            <circle cx="100" cy="100" r="98" fill={`url(#glow-${config.backdrop})`} />

            {config.backdrop === "chalkboard" && (
              <g opacity="0.35">
                <path d="M 30 50 Q 50 35 70 50" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" className="text-steel" />
                <path d="M 140 45 L 148 45 M 144 41 L 144 49" stroke="currentColor" strokeWidth="1.2" className="text-tan" />
                <circle cx="165" cy="70" r="1.5" fill="currentColor" className="text-white" />
                <circle cx="40" cy="120" r="1.5" fill="currentColor" className="text-tan" />
                <path d="M 150 140 Q 170 150 160 165" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" className="text-sage" />
              </g>
            )}

            {config.backdrop === "geometric" && (
              <g opacity="0.45">
                <path d="M 40 170 C 40 100, 160 100, 160 170" stroke="currentColor" strokeWidth="1" strokeDasharray="3 4" className="text-tan" />
                <circle cx="50" cy="55" r="3" fill="currentColor" className="text-tan" />
                <circle cx="155" cy="50" r="2.5" fill="currentColor" className="text-steel" />
              </g>
            )}

            {config.backdrop === "sage_leaf" && (
              <g opacity="0.45">
                <circle cx="100" cy="100" r="88" stroke={accent.hex} strokeWidth="1" strokeDasharray="4 6" opacity="0.6" />
                <circle cx="45" cy="65" r="2.5" fill="#75a383" />
                <circle cx="160" cy="75" r="2" fill="#75a383" />
              </g>
            )}

            <circle cx="100" cy="100" r="96" stroke={backdrop.ringColor} strokeWidth="2" opacity="0.3" />
          </g>
        )}

        {/* ── 2. Background Hair (Behind Shoulders & Head) ────────── */}
        {config.hairStyle === "bun" && (
          <g>
            {/* Top Bun with scrunchie */}
            <circle cx="100" cy="36" r="22" fill={hair.hex} />
            <circle cx="95" cy="32" r="8" fill={hair.highlight} opacity="0.35" />
            <path d="M 82 52 C 86 46, 114 46, 118 52 C 114 56, 86 56, 82 52 Z" fill={accent.hex} />
          </g>
        )}

        {config.hairStyle === "twintails" && (
          <g>
            {/* Left Twin Tail */}
            <circle cx="52" cy="62" r="9" fill={accent.hex} />
            <path
              d="M 52 64 C 30 75, 26 120, 38 152 C 48 150, 54 110, 56 74 Z"
              fill={hair.hex}
            />
            {/* Right Twin Tail */}
            <circle cx="148" cy="62" r="9" fill={accent.hex} />
            <path
              d="M 148 64 C 170 75, 174 120, 162 152 C 152 150, 146 110, 144 74 Z"
              fill={hair.hex}
            />
          </g>
        )}

        {config.hairStyle === "ponytail" && (
          <g>
            {/* High pony hair tie */}
            <ellipse cx="140" cy="50" rx="8" ry="6" fill={accent.hex} />
            {/* Swung ponytail plume falling over right shoulder */}
            <path
              d="M 140 50 C 168 56, 176 100, 164 146 C 152 140, 148 95, 136 60 Z"
              fill={hair.hex}
            />
          </g>
        )}

        {config.hairStyle === "long_straight" && (
          <g>
            {/* Long straight hair falls down behind both shoulders */}
            <rect x="48" y="70" width="22" height="110" rx="10" fill={hair.hex} />
            <rect x="130" y="70" width="22" height="110" rx="10" fill={hair.hex} />
          </g>
        )}

        {config.hairStyle === "wavy" && (
          <g>
            <path
              d="M 60 75 C 40 100, 42 145, 54 165 C 64 165, 72 135, 68 105 Z"
              fill={hair.hex}
            />
            <path
              d="M 140 75 C 160 100, 158 145, 146 165 C 136 165, 128 135, 132 105 Z"
              fill={hair.hex}
            />
          </g>
        )}

        {config.hairStyle === "curls" && (
          <g>
            <circle cx="62" cy="72" r="18" fill={hair.hex} />
            <circle cx="138" cy="72" r="18" fill={hair.hex} />
            <circle cx="72" cy="52" r="16" fill={hair.hex} />
            <circle cx="128" cy="52" r="16" fill={hair.hex} />
            <circle cx="100" cy="46" r="18" fill={hair.hex} />
          </g>
        )}

        {config.hairStyle === "dreads" && (
          <g>
            <rect x="48" y="70" width="8" height="85" rx="4" fill={hair.hex} />
            <rect x="58" y="80" width="8" height="80" rx="4" fill={hair.hex} />
            <rect x="134" y="80" width="8" height="80" rx="4" fill={hair.hex} />
            <rect x="144" y="70" width="8" height="85" rx="4" fill={hair.hex} />
          </g>
        )}

        {/* ── 3. Torso & Outfits (The Closet) ────────────────────── */}
        <g id="outfit">
          {/* Base Shoulders (Gender-differentiated silhouette) */}
          {isFemale ? (
            /* Feminine Silhouette: Graceful, slender shoulders with gentle slope */
            <path
              d="M 48 198 C 50 166, 68 145, 100 145 C 132 145, 150 166, 152 198 Z"
              fill={`url(#outfit-grad-${config.outfitColor})`}
            />
          ) : (
            /* Masculine Silhouette: Broad, athletic collegiate shoulders with defined frame */
            <path
              d="M 34 198 C 36 156, 58 138, 100 138 C 142 138, 164 156, 166 198 Z"
              fill={`url(#outfit-grad-${config.outfitColor})`}
            />
          )}

          {/* OUTFIT SPECIFIC STYLING */}
          {config.outfit === "blazer" && (
            <g>
              <polygon points={`100,${shoulderY} 85,${shoulderY} 92,175 100,185 108,175 115,${shoulderY}`} fill="#ffffff" />
              <polygon points="98,154 102,154 104,188 100,196 96,188" fill={accent.hex} />
              <polygon points="97,150 103,150 102,156 98,156" fill={outfit.hex} />
              <path d={`M ${lapelLeftX} ${shoulderY} L 90 178 L ${isFemale ? 74 : 68} 198`} stroke={outfit.shadow} strokeWidth="2.5" fill="none" />
              <path d={`M ${lapelRightX} ${shoulderY} L 110 178 L ${isFemale ? 126 : 132} 198`} stroke={outfit.shadow} strokeWidth="2.5" fill="none" />
              <circle cx={lapelLeftX} cy="172" r="3.5" fill={accent.hex} />
            </g>
          )}

          {config.outfit === "teacher_blazer" && (
            <g>
              {/* Crisp inner dress shirt */}
              <polygon points={`100,${shoulderY - 4} 82,${shoulderY} 90,172 100,180 110,172 118,${shoulderY}`} fill="#ffffff" />
              {/* Notched Formal Lapels */}
              <path d={`M ${isFemale ? 76 : 68} ${shoulderY} L 88 174 L ${isFemale ? 72 : 64} 198`} stroke={outfit.shadow} strokeWidth="3" fill="none" />
              <path d={`M ${isFemale ? 124 : 132} ${shoulderY} L 112 174 L ${isFemale ? 128 : 136} 198`} stroke={outfit.shadow} strokeWidth="3" fill="none" />
              {/* Pocket Square in breast pocket */}
              <rect x={isFemale ? 72 : 64} y="166" width="16" height="5" rx="1.5" fill={outfit.shadow} />
              <polygon points={`${isFemale ? 77 : 69},166 ${isFemale ? 80 : 72},160 ${isFemale ? 84 : 76},166`} fill={accent.hex} />
              <polygon points={`${isFemale ? 81 : 73},166 ${isFemale ? 85 : 77},162 ${isFemale ? 88 : 80},166`} fill="#ffffff" />
              {/* Brass/Gold Faculty Button */}
              <circle cx="100" cy="184" r="3" fill={accent.hex} />
            </g>
          )}

          {config.outfit === "cardigan" && (
            <g>
              {/* Collared shirt underneath */}
              <polygon points={`100,${shoulderY - 4} 84,${shoulderY} 92,168 100,174 108,168 116,${shoulderY}`} fill="#ffffff" />
              {/* Deep Cardigan V-Neck */}
              <polygon points={`100,178 82,${shoulderY} 90,${shoulderY} 100,168 110,${shoulderY} 118,${shoulderY}`} fill={accent.hex} />
              {/* Cardigan buttons */}
              <circle cx="100" cy="176" r="2.2" fill={accent.hex} />
              <circle cx="100" cy="186" r="2.2" fill={accent.hex} />
              <circle cx="100" cy="195" r="2.2" fill={accent.hex} />
              {/* Soft cable knit ridges */}
              <line x1={isFemale ? 84 : 80} y1="168" x2={isFemale ? 84 : 80} y2="198" stroke={outfit.shadow} strokeWidth="1.5" opacity="0.6" />
              <line x1={isFemale ? 116 : 120} y1="168" x2={isFemale ? 116 : 120} y2="198" stroke={outfit.shadow} strokeWidth="1.5" opacity="0.6" />
            </g>
          )}

          {config.outfit === "academic_gown" && (
            <g>
              {/* Velvet Academic Stole / Master Hood */}
              <path
                d={`M ${isFemale ? 80 : 74} ${shoulderY} L 90 186 L 100 198 L 110 186 L ${isFemale ? 120 : 126} ${shoulderY} L 108 ${shoulderY} L 100 170 L 92 ${shoulderY} Z`}
                fill={accent.hex}
              />
              <path
                d={`M ${isFemale ? 82 : 76} ${shoulderY} L 91 184 L 100 195 L 109 184 L ${isFemale ? 118 : 124} ${shoulderY}`}
                stroke="#f59e0b"
                strokeWidth="1.5"
                fill="none"
              />
              <line x1="100" y1={shoulderY} x2="100" y2="198" stroke={outfit.shadow} strokeWidth="2.5" />
            </g>
          )}

          {config.outfit === "formal_suit" && (
            <g>
              <polygon points={`100,${shoulderY - 4} 84,${shoulderY} 92,176 100,184 108,176 116,${shoulderY}`} fill="#ffffff" />
              <polygon points="98,150 102,150 105,188 100,196 95,188" fill={accent.hex} />
              <polygon points="97,146 103,146 102,152 98,152" fill={outfit.shadow} />
              <path d={`M ${isFemale ? 76 : 68} ${shoulderY} L 86 178 L ${isFemale ? 74 : 66} 198`} stroke={outfit.shadow} strokeWidth="3" fill="none" />
              <path d={`M ${isFemale ? 124 : 132} ${shoulderY} L 114 178 L ${isFemale ? 126 : 134} 198`} stroke={outfit.shadow} strokeWidth="3" fill="none" />
              <line x1="97" y1="168" x2="104" y2="168" stroke="#f59e0b" strokeWidth="1.8" />
            </g>
          )}

          {config.outfit === "hoodie" && (
            <g>
              <path d={`M ${isFemale ? 80 : 72} ${shoulderY} Q 100 162 ${isFemale ? 120 : 128} ${shoulderY}`} stroke={accent.hex} strokeWidth="4" fill="none" strokeLinecap="round" />
              <line x1="93" y1="156" x2="93" y2="182" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="93" cy="183" r="1.8" fill={accent.hex} />
              <line x1="107" y1="156" x2="107" y2="178" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
              <circle cx="107" cy="179" r="1.8" fill={accent.hex} />
              <path d={`M ${isFemale ? 70 : 64} 190 Q 100 182 ${isFemale ? 130 : 136} 190`} stroke={outfit.shadow} strokeWidth="2" fill="none" />
            </g>
          )}

          {config.outfit === "varsity" && (
            <g>
              <path d={`M ${isFemale ? 76 : 68} ${shoulderY} Q 100 160 ${isFemale ? 124 : 132} ${shoulderY}`} stroke={accent.hex} strokeWidth="6" fill="none" strokeLinecap="round" />
              <path d={`M ${isFemale ? 76 : 68} ${shoulderY} Q 100 160 ${isFemale ? 124 : 132} ${shoulderY}`} stroke="#ffffff" strokeWidth="1.5" fill="none" />
              <line x1="100" y1="158" x2="100" y2="198" stroke="#ffffff" strokeWidth="3" />
              <circle cx="100" cy="168" r="2" fill={accent.hex} />
              <circle cx="100" cy="182" r="2" fill={accent.hex} />
              <rect x={isFemale ? 72 : 66} y="160" width="12" height="12" rx="3" fill="#ffffff" />
              <text x={isFemale ? 78 : 72} y="170" textAnchor="middle" fill={outfit.hex} fontSize="9" fontWeight="900" fontFamily="sans-serif">
                E
              </text>
            </g>
          )}

          {config.outfit === "vest" && (
            <g>
              <polygon points={`100,${shoulderY - 6} 78,${shoulderY} 86,168 100,174 114,168 122,${shoulderY}`} fill="#ffffff" />
              <polygon points={`100,166 84,${shoulderY} 90,${shoulderY} 100,158 110,${shoulderY} 116,${shoulderY}`} fill={accent.hex} />
              <path d="M 92 180 L 100 188 L 108 180" stroke={accent.hex} strokeWidth="1.5" fill="none" />
              <path d="M 92 192 L 100 200 L 108 192" stroke={accent.hex} strokeWidth="1.5" fill="none" />
            </g>
          )}

          {config.outfit === "polo" && (
            <g>
              <polygon points={`100,${shoulderY - 2} 82,${shoulderY} 88,162 100,154 112,162 118,${shoulderY}`} fill={accent.hex} />
              <line x1="100" y1="154" x2="100" y2="185" stroke={outfit.shadow} strokeWidth="2" />
              <circle cx="100" cy="162" r="1.5" fill="#ffffff" />
              <circle cx="100" cy="172" r="1.5" fill="#ffffff" />
            </g>
          )}

          {config.outfit === "labcoat" && (
            <g>
              <polygon points={`100,${shoulderY - 2} 82,${shoulderY} 92,198 108,198 118,${shoulderY}`} fill="#ffffff" />
              <polygon points="100,144 94,175 100,180 106,175" fill={outfit.hex} />
              <path d={`M ${isFemale ? 80 : 72} ${shoulderY} L 92 178 L ${isFemale ? 78 : 70} 198`} stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
              <path d={`M ${isFemale ? 120 : 128} ${shoulderY} L 108 178 L ${isFemale ? 122 : 130} 198`} stroke="#cbd5e1" strokeWidth="2.5" fill="none" />
              <rect x={isFemale ? 72 : 66} y="164" width="8" height="10" rx="1" fill="#94a3b8" />
              <line x1={isFemale ? 74 : 68} y1="162" x2={isFemale ? 74 : 68} y2="167" stroke="#0284c7" strokeWidth="1.5" />
            </g>
          )}

          {config.outfit === "tee" && (
            <g>
              <path d={`M ${isFemale ? 82 : 74} ${shoulderY} Q 100 156 ${isFemale ? 118 : 126} ${shoulderY}`} stroke={accent.hex} strokeWidth="3" fill="none" strokeLinecap="round" />
              <circle cx="100" cy="172" r="10" fill={accent.hex} opacity="0.3" />
              <path
                d="M 100 165 Q 100 172 105 172 Q 100 172 100 179 Q 100 172 95 172 Q 100 172 100 165 Z"
                fill={accent.hex}
              />
            </g>
          )}

          {/* Star Pin Accessory on Lapel/Chest */}
          {config.accessory === "star_pin" && (
            <g>
              <polygon points="76,162 78,167 83,167 79,170 81,175 76,172 71,175 73,170 69,167 74,167" fill="#f59e0b" />
            </g>
          )}
        </g>

        {/* ── 4. Neck & Chin Shadow ───────────────────────────────── */}
        <g id="neck">
          {isFemale ? (
            /* Feminine Slender Neck & Delicate Collarbone Lines */
            <>
              <rect x="91" y="122" width="18" height="26" rx="4" fill={skin.hex} />
              <path d="M 91 123 C 95 131, 105 131, 109 123 Z" fill={skin.shadow} opacity="0.5" />
              <path d="M 87 148 Q 94 151 98 149 M 102 149 Q 106 151 113 148" stroke={skin.shadow} strokeWidth="1.2" strokeLinecap="round" opacity="0.55" fill="none" />
            </>
          ) : (
            /* Masculine Sturdy Neck with Throat / Adam's Apple Definition */
            <>
              <rect x="85" y="120" width="30" height="26" rx="3" fill={skin.hex} />
              <path d="M 85 122 C 92 134, 108 134, 115 122 Z" fill={skin.shadow} opacity="0.65" />
              <path d="M 98 133 L 100 136 L 102 133" stroke={skin.shadow} strokeWidth="1.5" strokeLinecap="round" opacity="0.65" fill="none" />
            </>
          )}
        </g>

        {/* ── 5. Ears ────────────────────────────────────────────── */}
        <g id="ears">
          <ellipse cx="64" cy="98" rx="8" ry="12" fill={skin.hex} />
          <ellipse cx="64" cy="98" rx="4" ry="7" fill={skin.shadow} opacity="0.5" />
          <ellipse cx="136" cy="98" rx="8" ry="12" fill={skin.hex} />
          <ellipse cx="136" cy="98" rx="4" ry="7" fill={skin.shadow} opacity="0.5" />

          {/* Earrings Accessory */}
          {config.accessory === "earrings" && (
            <g>
              <circle cx="64" cy="106" r="3.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
              <circle cx="136" cy="106" r="3.5" stroke="#f59e0b" strokeWidth="1.5" fill="none" />
            </g>
          )}
        </g>

        {/* ── 6. Head & Face Base ─────────────────────────────────── */}
        <g id="face-base">
          {isFemale ? (
            /* Feminine Head: Soft oval with graceful chin taper */
            <path
              d="M 70 84 C 70 56, 130 56, 130 84 C 130 110, 118 126, 100 126 C 82 126, 70 110, 70 84 Z"
              fill={skin.hex}
            />
          ) : (
            /* Masculine Head: Defined jawline, slightly wider lower facial contour */
            <path
              d="M 66 84 C 66 56, 134 56, 134 84 C 134 114, 122 130, 100 130 C 78 130, 66 114, 66 84 Z"
              fill={skin.hex}
            />
          )}
        </g>

        {/* ── 7. Blush & Freckles Accessories ─────────────────────── */}
        {config.accessory === "blush" && (
          <g opacity="0.55">
            <ellipse cx="78" cy="104" rx="7" ry="4" fill="#f43f5e" />
            <ellipse cx="122" cy="104" rx="7" ry="4" fill="#f43f5e" />
          </g>
        )}

        {config.accessory === "freckles" && (
          <g fill={skin.shadow} opacity="0.75">
            <circle cx="80" cy="102" r="1" />
            <circle cx="84" cy="104" r="1.1" />
            <circle cx="82" cy="106" r="0.9" />
            <circle cx="118" cy="102" r="1" />
            <circle cx="116" cy="104" r="1.1" />
            <circle cx="120" cy="106" r="0.9" />
            <circle cx="96" cy="103" r="1" />
            <circle cx="104" cy="103" r="1" />
          </g>
        )}

        {/* ── 8. Eyes & Expression ────────────────────────────────── */}
        <g id="expression">
          {/* Eyebrows */}
          {(config.expression === "focused" || config.expression === "determined") && (
            <g stroke={hair.hex} strokeWidth="2.6" strokeLinecap="round">
              <path d="M 76 82 Q 86 78 93 83" />
              <path d="M 124 82 Q 114 78 107 83" />
            </g>
          )}

          {config.expression === "sparkle" && (
            <g stroke={hair.hex} strokeWidth="2.5" strokeLinecap="round">
              <path d="M 76 80 Q 86 76 92 81" />
              <path d="M 124 80 Q 114 76 108 81" />
            </g>
          )}

          {config.expression === "confident" && (
            <g stroke={hair.hex} strokeWidth="2.5" strokeLinecap="round">
              <path d="M 76 82 Q 86 78 92 81" />
              <path d="M 124 78 Q 114 74 108 80" />
            </g>
          )}

          {(config.expression === "chill" || config.expression === "smile") && (
            <g stroke={hair.hex} strokeWidth="2.2" strokeLinecap="round">
              <path d="M 76 82 Q 86 79 92 83" />
              <path d="M 124 82 Q 114 79 108 83" />
            </g>
          )}

          {config.expression === "curious" && (
            <g stroke={hair.hex} strokeWidth="2.5" strokeLinecap="round">
              <path d="M 76 78 Q 86 76 92 82" />
              <path d="M 124 82 Q 114 80 108 84" />
            </g>
          )}

          {/* EYES */}
          {config.expression === "sparkle" && (
            <g>
              <ellipse cx="83" cy="94" rx="7" ry="8.5" fill="#1c242c" />
              <circle cx="85.5" cy="91.5" r="3" fill="#ffffff" />
              <circle cx="81.5" cy="97" r="1.5" fill="#ffffff" />
              <path d="M 83 91 Q 83 93 85 93 Q 83 93 83 95 Q 83 93 81 93 Q 83 93 83 91 Z" fill="#ffd166" />

              <ellipse cx="117" cy="94" rx="7" ry="8.5" fill="#1c242c" />
              <circle cx="119.5" cy="91.5" r="3" fill="#ffffff" />
              <circle cx="115.5" cy="97" r="1.5" fill="#ffffff" />
              <path d="M 117 91 Q 117 93 119 93 Q 117 93 117 95 Q 117 93 115 93 Q 117 93 117 91 Z" fill="#ffd166" />
            </g>
          )}

          {config.expression === "focused" && (
            <g>
              <ellipse cx="83" cy="94" rx="6" ry="6.5" fill="#1c242c" />
              <circle cx="85" cy="92.5" r="2.2" fill="#ffffff" />
              <ellipse cx="117" cy="94" rx="6" ry="6.5" fill="#1c242c" />
              <circle cx="119" cy="92.5" r="2.2" fill="#ffffff" />
            </g>
          )}

          {config.expression === "determined" && (
            <g>
              {/* Determined almond scholar eyes with keen shine */}
              <ellipse cx="83" cy="93" rx="6.5" ry="5.8" fill="#1c242c" />
              <circle cx="85" cy="91.5" r="2" fill="#ffffff" />
              <ellipse cx="117" cy="93" rx="6.5" ry="5.8" fill="#1c242c" />
              <circle cx="119" cy="91.5" r="2" fill="#ffffff" />
            </g>
          )}

          {config.expression === "smile" && (
            <g>
              {/* Friendly warm open eyes */}
              <circle cx="83" cy="94" r="6" fill="#1c242c" />
              <circle cx="85" cy="92" r="2.2" fill="#ffffff" />
              <circle cx="117" cy="94" r="6" fill="#1c242c" />
              <circle cx="119" cy="92" r="2.2" fill="#ffffff" />
            </g>
          )}

          {config.expression === "confident" && (
            <g>
              <ellipse cx="83" cy="94" rx="6" ry="6.5" fill="#1c242c" />
              <circle cx="85" cy="92.5" r="2.2" fill="#ffffff" />
              <path d="M 110 94 Q 117 88 124 94" stroke="#1c242c" strokeWidth="2.8" strokeLinecap="round" fill="none" />
            </g>
          )}

          {config.expression === "chill" && (
            <g stroke="#1c242c" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M 76 95 Q 83 88 90 95" />
              <path d="M 110 95 Q 117 88 124 95" />
            </g>
          )}

          {config.expression === "curious" && (
            <g>
              <circle cx="83" cy="93" r="6.5" fill="#1c242c" />
              <circle cx="85" cy="91" r="2.8" fill="#ffffff" />
              <circle cx="117" cy="93" r="6.5" fill="#1c242c" />
              <circle cx="119" cy="91" r="2.8" fill="#ffffff" />
            </g>
          )}

          {/* Feminine Fluttery Eyelashes */}
          {isFemale && (
            <g stroke={hair.hex} strokeWidth="1.5" strokeLinecap="round" opacity="0.9">
              <path d="M 76 89 Q 73 86 71 87" />
              <path d="M 124 89 Q 127 86 129 87" />
            </g>
          )}

          {/* Feminine Soft Rosy Cheek Tint (subtle blush) */}
          {isFemale && config.accessory !== "blush" && (
            <g opacity="0.25">
              <ellipse cx="78" cy="103" rx="6" ry="3.5" fill="#f43f5e" />
              <ellipse cx="122" cy="103" rx="6" ry="3.5" fill="#f43f5e" />
            </g>
          )}

          {/* Minimal nose */}
          <path d="M 98 99 Q 100 102 102 101" stroke={skin.shadow} strokeWidth="1.8" strokeLinecap="round" fill="none" />

          {/* MOUTH */}
          {config.expression === "sparkle" && (
            <path d="M 92 110 Q 100 120 108 110 Z" fill="#e11d48" stroke="#1c242c" strokeWidth="1.5" />
          )}

          {config.expression === "smile" && (
            <path d="M 92 110 Q 100 119 108 110 Z" fill="#e11d48" stroke="#1c242c" strokeWidth="1.5" />
          )}

          {config.expression === "focused" && (
            <path d="M 94 112 Q 100 115 106 112" stroke="#1c242c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}

          {config.expression === "determined" && (
            <path d="M 94 111 Q 101 115 107 110" stroke="#1c242c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          )}

          {config.expression === "confident" && (
            <path d="M 93 113 Q 101 116 109 111" stroke="#1c242c" strokeWidth="2.4" strokeLinecap="round" fill="none" />
          )}

          {config.expression === "chill" && (
            <path d="M 92 110 Q 100 118 108 110" stroke="#1c242c" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          )}

          {config.expression === "curious" && (
            <ellipse cx="100" cy="112" rx="3.5" ry="4" fill="#e11d48" stroke="#1c242c" strokeWidth="1.5" />
          )}
        </g>

        {/* ── 9. Glasses Accessories ──────────────────────────────── */}
        {config.glasses === "round" && (
          <g stroke="#1c242c" strokeWidth="2.2" fill="none">
            <circle cx="83" cy="94" r="12" />
            <circle cx="117" cy="94" r="12" />
            <path d="M 95 93 Q 100 90 105 93" />
            <path d="M 71 93 L 64 92" />
            <path d="M 129 93 L 136 92" />
            <line x1="88" y1="86" x2="84" y2="92" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
            <line x1="122" y1="86" x2="118" y2="92" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
          </g>
        )}

        {config.glasses === "square" && (
          <g stroke="#1c242c" strokeWidth="2.5" fill="none">
            <rect x="71" y="83" width="24" height="20" rx="4" />
            <rect x="105" y="83" width="24" height="20" rx="4" />
            <line x1="95" y1="91" x2="105" y2="91" />
            <line x1="71" y1="91" x2="64" y2="90" />
            <line x1="129" y1="91" x2="136" y2="90" />
            <line x1="90" y1="87" x2="84" y2="95" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
            <line x1="124" y1="87" x2="118" y2="95" stroke="#ffffff" strokeWidth="1.5" opacity="0.75" />
          </g>
        )}

        {config.glasses === "wireframe" && (
          <g stroke="#d97706" strokeWidth="1.8" fill="none">
            {/* Elegant Golden Wireframes */}
            <circle cx="83" cy="94" r="11" />
            <circle cx="117" cy="94" r="11" />
            <path d="M 94 92 Q 100 89 106 92" />
            <path d="M 72 93 L 64 92" />
            <path d="M 128 93 L 136 92" />
            <line x1="88" y1="86" x2="84" y2="92" stroke="#ffffff" strokeWidth="1.2" opacity="0.85" />
            <line x1="122" y1="86" x2="118" y2="92" stroke="#ffffff" strokeWidth="1.2" opacity="0.85" />
          </g>
        )}

        {config.glasses === "cateye" && (
          <g stroke="#7c3aed" strokeWidth="2.4" fill="none">
            {/* Chic Upward Angled Cat-Eye Frames */}
            <path d="M 70 85 Q 84 81 95 87 Q 92 102 82 102 Q 68 100 70 85 Z" />
            <path d="M 130 85 Q 116 81 105 87 Q 108 102 118 102 Q 132 100 130 85 Z" />
            <line x1="95" y1="89" x2="105" y2="89" />
            <line x1="70" y1="85" x2="64" y2="88" />
            <line x1="130" y1="85" x2="136" y2="88" />
          </g>
        )}

        {/* ── 10. Front Hair Styles ───────────────────────────────── */}
        <g id="front-hair">
          {config.hairStyle === "bun" && (
            <g>
              <path
                d="M 66 84 C 66 52, 134 52, 134 84 C 124 70, 108 64, 100 68 C 92 64, 76 70, 66 84 Z"
                fill={hair.hex}
              />
              <path
                d="M 68 80 C 74 70, 88 66, 100 68 C 90 74, 82 82, 78 88 Z"
                fill={`url(#hair-shine-${config.hairColor})`}
                opacity="0.3"
              />
            </g>
          )}

          {config.hairStyle === "twintails" && (
            <g>
              {/* Cute front parted bangs */}
              <path
                d="M 66 84 C 64 52, 136 52, 134 84 C 126 68, 112 62, 100 68 C 88 62, 74 68, 66 84 Z"
                fill={hair.hex}
              />
              <path d="M 85 64 Q 100 75 115 64" stroke={hair.highlight} strokeWidth="2.5" fill="none" opacity="0.35" />
            </g>
          )}

          {config.hairStyle === "ponytail" && (
            <g>
              {/* Sleek swept back front hair */}
              <path
                d="M 66 84 C 64 48, 136 48, 134 84 C 126 68, 114 62, 100 64 C 86 62, 74 68, 66 84 Z"
                fill={hair.hex}
              />
              <path d="M 80 58 Q 110 52 130 56" stroke={hair.highlight} strokeWidth="3" fill="none" opacity="0.4" />
            </g>
          )}

          {config.hairStyle === "bob" && (
            <g>
              {/* Chic sleek curved bob framing jawline */}
              <path
                d="M 62 84 C 60 48, 140 48, 138 84 C 142 112, 134 122, 126 122 C 124 100, 122 74, 100 74 C 78 74, 76 100, 74 122 C 66 122, 58 112, 62 84 Z"
                fill={hair.hex}
              />
              <path d="M 72 64 Q 100 56 128 64" stroke={hair.highlight} strokeWidth="3" fill="none" opacity="0.4" />
            </g>
          )}

          {config.hairStyle === "long_straight" && (
            <g>
              {/* Sleek long hair framing face and shoulders */}
              <path
                d="M 64 84 C 62 48, 138 48, 136 84 C 132 104, 130 145, 126 150 C 122 135, 124 95, 100 80 C 76 95, 78 135, 74 150 C 70 145, 68 104, 64 84 Z"
                fill={hair.hex}
              />
              <path d="M 80 62 Q 100 56 120 62" stroke={hair.highlight} strokeWidth="3" fill="none" opacity="0.4" />
            </g>
          )}

          {config.hairStyle === "crop" && (
            <g>
              <path
                d="M 64 84 C 62 50, 138 48, 136 84 C 130 68, 110 60, 94 64 C 80 66, 70 74, 64 84 Z"
                fill={hair.hex}
              />
              <path d="M 72 64 Q 96 54 124 64" stroke={hair.highlight} strokeWidth="3" strokeLinecap="round" opacity="0.4" fill="none" />
            </g>
          )}

          {config.hairStyle === "fade" && (
            <g>
              <path
                d="M 66 86 C 66 48, 134 48, 134 86 C 132 72, 120 62, 100 62 C 80 62, 68 72, 66 86 Z"
                fill={hair.hex}
              />
              <line x1="68" y1="78" x2="74" y2="84" stroke={hair.highlight} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
            </g>
          )}

          {config.hairStyle === "pompadour" && (
            <g>
              {/* High modern voluminous pompadour */}
              <path
                d="M 64 84 C 60 40, 100 32, 110 38 C 130 38, 140 50, 136 84 C 132 70, 120 62, 100 62 C 80 62, 70 70, 64 84 Z"
                fill={hair.hex}
              />
              <path d="M 76 50 Q 100 38 120 48" stroke={hair.highlight} strokeWidth="3.5" strokeLinecap="round" opacity="0.45" fill="none" />
            </g>
          )}

          {config.hairStyle === "textured" && (
            <g>
              {/* Spiky textured fringe */}
              <path
                d="M 64 84 C 62 48, 138 48, 136 84 C 130 68, 122 76, 116 68 C 110 74, 102 65, 96 72 C 90 66, 82 74, 76 68 C 70 74, 66 78, 64 84 Z"
                fill={hair.hex}
              />
            </g>
          )}

          {config.hairStyle === "buzz" && (
            <g>
              {/* Clean buzz cut outline */}
              <path
                d="M 68 84 C 68 56, 132 56, 132 84 C 130 74, 118 68, 100 68 C 82 68, 70 74, 68 84 Z"
                fill={hair.hex}
                opacity="0.85"
              />
            </g>
          )}

          {config.hairStyle === "wavy" && (
            <g>
              <path
                d="M 66 86 C 64 50, 136 50, 134 86 C 124 66, 110 60, 100 65 C 90 60, 76 66, 66 86 Z"
                fill={hair.hex}
              />
              <path d="M 70 70 Q 82 82 72 96" stroke={hair.hex} strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 130 70 Q 118 82 128 96" stroke={hair.hex} strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          )}

          {config.hairStyle === "curls" && (
            <g>
              <circle cx="80" cy="58" r="14" fill={hair.hex} />
              <circle cx="100" cy="54" r="15" fill={hair.hex} />
              <circle cx="120" cy="58" r="14" fill={hair.hex} />
              <circle cx="70" cy="68" r="12" fill={hair.hex} />
              <circle cx="130" cy="68" r="12" fill={hair.hex} />
            </g>
          )}

          {config.hairStyle === "bangs" && (
            <g>
              <path
                d="M 64 88 C 64 48, 136 48, 136 88 C 124 72, 108 68, 104 80 C 100 70, 80 72, 64 88 Z"
                fill={hair.hex}
              />
              <path d="M 104 80 Q 114 74 126 84" stroke={hair.highlight} strokeWidth="2.5" fill="none" opacity="0.4" />
            </g>
          )}

          {config.hairStyle === "dreads" && (
            <g>
              <path
                d="M 66 82 C 66 50, 134 50, 134 82 C 126 66, 114 62, 100 62 C 86 62, 74 66, 66 82 Z"
                fill={hair.hex}
              />
              <path d="M 64 74 Q 100 66 136 74" stroke={accent.hex} strokeWidth="6" fill="none" />
            </g>
          )}

          {config.hairStyle === "beanie" && (
            <g>
              <path d="M 60 76 C 58 38, 142 38, 140 76 Z" fill={outfit.hex} />
              <rect x="58" y="66" width="84" height="12" rx="4" fill={accent.hex} />
              <line x1="72" y1="67" x2="72" y2="77" stroke={outfit.shadow} strokeWidth="1.2" />
              <line x1="86" y1="67" x2="86" y2="77" stroke={outfit.shadow} strokeWidth="1.2" />
              <line x1="100" y1="67" x2="100" y2="77" stroke={outfit.shadow} strokeWidth="1.2" />
              <line x1="114" y1="67" x2="114" y2="77" stroke={outfit.shadow} strokeWidth="1.2" />
              <line x1="128" y1="67" x2="128" y2="77" stroke={outfit.shadow} strokeWidth="1.2" />
              <path d="M 68 78 Q 72 88 68 94" stroke={hair.hex} strokeWidth="4" strokeLinecap="round" fill="none" />
              <path d="M 132 78 Q 128 88 132 94" stroke={hair.hex} strokeWidth="4" strokeLinecap="round" fill="none" />
            </g>
          )}

          {config.hairStyle === "grad_cap" && (
            <g>
              <path
                d="M 68 84 C 68 62, 132 62, 132 84 C 122 72, 110 68, 100 70 C 90 68, 78 72, 68 84 Z"
                fill={hair.hex}
              />
              <rect x="80" y="58" width="40" height="14" rx="3" fill="#1c242c" />
              <polygon points="100,38 148,52 100,66 52,52" fill="#1c242c" stroke="#374e63" strokeWidth="1" />
              <circle cx="100" cy="52" r="3" fill={accent.hex} />
              <path d="M 100 52 Q 130 52 136 74" stroke={accent.hex} strokeWidth="2" fill="none" strokeLinecap="round" />
              <circle cx="136" cy="76" r="2.5" fill={accent.hex} />
            </g>
          )}
        </g>

        {/* ── 11. Over-Ear Headphones Accessory ───────────────────── */}
        {config.accessory === "headphones" && (
          <g>
            <path d="M 60 92 C 54 44, 146 44, 140 92" stroke="#1c242c" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M 60 92 C 54 44, 146 44, 140 92" stroke={accent.hex} strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <rect x="52" y="86" width="12" height="24" rx="6" fill={outfit.hex} stroke="#1c242c" strokeWidth="2" />
            <rect x="56" y="92" width="4" height="12" rx="2" fill={accent.hex} />
            <rect x="136" y="86" width="12" height="24" rx="6" fill={outfit.hex} stroke="#1c242c" strokeWidth="2" />
            <rect x="140" y="92" width="4" height="12" rx="2" fill={accent.hex} />
          </g>
        )}
      </svg>
    </div>
  );
}
