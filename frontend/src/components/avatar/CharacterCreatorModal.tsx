"use client";

import React, { useState, useMemo } from "react";
import {
  StudentAvatarConfig,
  GenderId,
  SkinToneId,
  HairStyleId,
  HairColorId,
  ExpressionId,
  GlassesId,
  AccessoryId,
  OutfitId,
  OutfitColorId,
  OutfitAccentId,
  BackdropThemeId,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  ACCENT_COLORS,
  BACKDROP_THEMES,
  AVATAR_PRESETS,
  FEMALE_HAIRSTYLES,
  MALE_HAIRSTYLES,
  STUDENT_OUTFITS,
  TEACHER_OUTFITS,
  generateRandomAvatar,
  DEFAULT_AVATAR_CONFIG,
  DEFAULT_MALE_AVATAR_CONFIG,
  DEFAULT_TEACHER_AVATAR_CONFIG,
  DEFAULT_MALE_TEACHER_AVATAR_CONFIG,
} from "@/types/avatar";
import { StudentAvatar } from "./StudentAvatar";
import { SkeletonAvatarCreator } from "@/components/ui/Skeleton";
import {
  Scissors,
  Shuffle,
  RotateCcw,
  Check,
  X,
  Palette,
  Shirt,
  Glasses,
  Smile,
  Quote,
  Loader2,
  Bookmark,
  GraduationCap,
  ShieldCheck,
  School,
  SlidersHorizontal,
  ChevronDown,
  AlertCircle,
} from "lucide-react";

interface CharacterCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialConfig?: StudentAvatarConfig;
  studentName?: string;
  studentId?: string;
  sectionName?: string;
  role?: "STUDENT" | "TEACHER";
  isFirstTime?: boolean;
  loading?: boolean;
  onSave: (config: StudentAvatarConfig) => Promise<void> | void;
}

type TabKey = "outfit" | "hair" | "face" | "accessories" | "backdrop" | "bio";

/* ── Custom Mini SVG Vector Previews (NO EMOJIS) ─────────────────── */

function HairPreviewSvg({ styleId, colorHex = "#374e63" }: { styleId: HairStyleId; colorHex?: string }) {
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
      {/* Head Silhouette Base */}
      <circle cx="20" cy="22" r="11" fill="#cbd5e1" opacity="0.3" />

      {styleId === "bun" && (
        <g fill={colorHex}>
          <circle cx="20" cy="8" r="5" />
          <path d="M 12 21 C 12 12, 28 12, 28 21 C 25 17, 15 17, 12 21 Z" />
        </g>
      )}

      {styleId === "twintails" && (
        <g fill={colorHex}>
          <circle cx="9" cy="14" r="3.5" />
          <path d="M 9 14 C 4 18, 5 28, 8 32 C 9 28, 10 22, 11 16 Z" />
          <circle cx="31" cy="14" r="3.5" />
          <path d="M 31 14 C 36 18, 35 28, 32 32 C 31 28, 30 22, 29 16 Z" />
          <path d="M 12 21 C 12 13, 28 13, 28 21 C 25 18, 15 18, 12 21 Z" />
        </g>
      )}

      {styleId === "ponytail" && (
        <g fill={colorHex}>
          <path d="M 28 11 C 36 13, 37 25, 33 32 C 30 27, 29 20, 26 14 Z" />
          <path d="M 12 21 C 12 12, 28 12, 28 21 C 25 17, 15 17, 12 21 Z" />
        </g>
      )}

      {styleId === "bob" && (
        <g fill={colorHex}>
          <path d="M 11 21 C 10 11, 30 11, 29 21 C 31 29, 27 30, 25 30 C 25 25, 25 18, 20 18 C 15 18, 15 25, 15 30 C 13 30, 9 29, 11 21 Z" />
        </g>
      )}

      {styleId === "long_straight" && (
        <g fill={colorHex}>
          <rect x="9" y="16" width="4.5" height="20" rx="2" />
          <rect x="26.5" y="16" width="4.5" height="20" rx="2" />
          <path d="M 11 21 C 11 12, 29 12, 29 21 C 25 17, 15 17, 11 21 Z" />
        </g>
      )}

      {styleId === "wavy" && (
        <g fill={colorHex}>
          <path d="M 11 20 C 7 24, 7 31, 10 34 C 12 30, 13 25, 13 22 Z" />
          <path d="M 29 20 C 33 24, 33 31, 30 34 C 28 30, 27 25, 27 22 Z" />
          <path d="M 12 21 C 12 12, 28 12, 28 21 C 25 17, 15 17, 12 21 Z" />
        </g>
      )}

      {styleId === "curls" && (
        <g fill={colorHex}>
          <circle cx="15" cy="14" r="4" />
          <circle cx="20" cy="12" r="4.5" />
          <circle cx="25" cy="14" r="4" />
          <circle cx="12" cy="19" r="3.5" />
          <circle cx="28" cy="19" r="3.5" />
        </g>
      )}

      {styleId === "bangs" && (
        <g fill={colorHex}>
          <path d="M 11 22 C 11 12, 29 12, 29 22 C 26 17, 22 17, 21 21 C 20 17, 14 17, 11 22 Z" />
        </g>
      )}

      {styleId === "crop" && (
        <g fill={colorHex}>
          <path d="M 12 21 C 11 12, 29 11, 28 21 C 26 16, 21 14, 18 15 C 15 16, 13 18, 12 21 Z" />
        </g>
      )}

      {styleId === "fade" && (
        <g fill={colorHex}>
          <path d="M 12 22 C 12 13, 28 13, 28 22 C 27 18, 24 15, 20 15 C 16 15, 13 18, 12 22 Z" />
        </g>
      )}

      {styleId === "pompadour" && (
        <g fill={colorHex}>
          <path d="M 12 21 C 11 10, 20 7, 23 9 C 28 9, 29 13, 28 21 C 26 17, 23 15, 20 15 C 17 15, 14 17, 12 21 Z" />
        </g>
      )}

      {styleId === "textured" && (
        <g fill={colorHex}>
          <path d="M 12 21 C 11 12, 29 12, 28 21 C 26 18, 25 20, 23 17 C 21 20, 19 16, 17 19 C 15 17, 13 19, 12 21 Z" />
        </g>
      )}

      {styleId === "dreads" && (
        <g fill={colorHex}>
          <rect x="9" y="16" width="2.5" height="18" rx="1.2" />
          <rect x="12" y="18" width="2.5" height="16" rx="1.2" />
          <rect x="25.5" y="18" width="2.5" height="16" rx="1.2" />
          <rect x="28.5" y="16" width="2.5" height="18" rx="1.2" />
          <path d="M 12 21 C 12 13, 28 13, 28 21 Z" />
        </g>
      )}

      {styleId === "buzz" && (
        <g fill={colorHex} opacity="0.85">
          <path d="M 13 21 C 13 14, 27 14, 27 21 C 26 17, 23 15, 20 15 C 17 15, 14 17, 13 21 Z" />
        </g>
      )}

      {styleId === "beanie" && (
        <g>
          <path d="M 11 19 C 10 9, 30 9, 29 19 Z" fill="#475569" />
          <rect x="10" y="17" width="20" height="4" rx="1.5" fill="#94a3b8" />
        </g>
      )}

      {styleId === "grad_cap" && (
        <g>
          <polygon points="20,10 32,15 20,20 8,15" fill="#1e293b" />
          <rect x="15" y="18" width="10" height="4" rx="1" fill="#1e293b" />
          <line x1="20" y1="15" x2="29" y2="21" stroke="#f59e0b" strokeWidth="1" />
        </g>
      )}
    </svg>
  );
}

function OutfitPreviewSvg({ outfitId, gender = "female" }: { outfitId: OutfitId; gender?: GenderId }) {
  const isFemale = gender !== "male";
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
      {/* Base Garment Shoulder Silhouette */}
      {isFemale ? (
        <path d="M 10 36 C 11 27, 14.5 21, 20 21 C 25.5 21, 29 27, 30 36 Z" fill="#475569" />
      ) : (
        <path d="M 7 36 C 8 25, 13 19, 20 19 C 27 19, 32 25, 33 36 Z" fill="#475569" />
      )}

      {outfitId === "blazer" && (
        <g>
          <polygon points="20,20 16,20 18,28 20,31 22,28 24,20" fill="#ffffff" />
          <polygon points="19,23 21,23 21.5,33 20,35 18.5,33" fill="#b91c1c" />
          <path d="M 14 20 L 17 28 L 13 36" stroke="#1e293b" strokeWidth="1.2" fill="none" />
          <path d="M 26 20 L 23 28 L 27 36" stroke="#1e293b" strokeWidth="1.2" fill="none" />
          <circle cx="14" cy="27" r="1" fill="#f59e0b" />
        </g>
      )}

      {outfitId === "teacher_blazer" && (
        <g>
          <polygon points="20,19 16,20 18,27 20,29 22,27 24,20" fill="#ffffff" />
          <path d="M 13 20 L 17 28 L 13 36" stroke="#1e293b" strokeWidth="1.4" fill="none" />
          <path d="M 27 20 L 23 28 L 27 36" stroke="#1e293b" strokeWidth="1.4" fill="none" />
          {/* Pocket square */}
          <rect x="12" y="26" width="4" height="1.5" rx="0.5" fill="#1e293b" />
          <polygon points="13,26 14,24 15.5,26" fill="#f59e0b" />
          <circle cx="20" cy="30" r="0.9" fill="#f59e0b" />
        </g>
      )}

      {outfitId === "cardigan" && (
        <g>
          <polygon points="20,19 17,20 18.5,26 20,27 21.5,26 23,20" fill="#ffffff" />
          <polygon points="20,28 16,20 18,20 20,26 22,20 24,20" fill="#a1a1aa" />
          <circle cx="20" cy="28" r="0.8" fill="#e4e4e7" />
          <circle cx="20" cy="31" r="0.8" fill="#e4e4e7" />
          <circle cx="20" cy="34" r="0.8" fill="#e4e4e7" />
        </g>
      )}

      {outfitId === "academic_gown" && (
        <g>
          <path d="M 15 20 L 18 31 L 20 36 L 22 31 L 25 20 L 22 20 L 20 27 L 18 20 Z" fill="#f59e0b" />
          <line x1="20" y1="20" x2="20" y2="36" stroke="#0f172a" strokeWidth="1.2" />
        </g>
      )}

      {outfitId === "formal_suit" && (
        <g>
          <polygon points="20,19 16,20 18,27 20,29 22,27 24,20" fill="#ffffff" />
          <polygon points="19.5,22 20.5,22 21,33 20,35 19,33" fill="#0284c7" />
          <path d="M 13 20 L 16.5 28 L 13 36" stroke="#0f172a" strokeWidth="1.4" fill="none" />
          <path d="M 27 20 L 23.5 28 L 27 36" stroke="#0f172a" strokeWidth="1.4" fill="none" />
        </g>
      )}

      {outfitId === "hoodie" && (
        <g>
          <path d="M 15 20 Q 20 25 25 20" stroke="#f1f5f9" strokeWidth="1.5" fill="none" />
          <line x1="18" y1="23" x2="18" y2="30" stroke="#ffffff" strokeWidth="1" />
          <line x1="22" y1="23" x2="22" y2="29" stroke="#ffffff" strokeWidth="1" />
        </g>
      )}

      {outfitId === "varsity" && (
        <g>
          <path d="M 14 20 Q 20 25 26 20" stroke="#f59e0b" strokeWidth="2.5" fill="none" />
          <line x1="20" y1="24" x2="20" y2="36" stroke="#ffffff" strokeWidth="1.5" />
          <rect x="13" y="24" width="3" height="3" rx="0.5" fill="#ffffff" />
        </g>
      )}

      {outfitId === "vest" && (
        <g>
          <polygon points="20,18 15,20 17,26 20,28 23,26 25,20" fill="#ffffff" />
          <polygon points="20,26 16,20 18,20 20,24 22,20 24,20" fill="#cbd5e1" />
        </g>
      )}

      {outfitId === "polo" && (
        <g>
          <polygon points="20,20 16,20 17,25 20,23 23,25 24,20" fill="#e2e8f0" />
          <line x1="20" y1="23" x2="20" y2="31" stroke="#334155" strokeWidth="1" />
        </g>
      )}

      {outfitId === "labcoat" && (
        <g>
          <polygon points="20,20 16,20 18,36 22,36 24,20" fill="#ffffff" />
          <path d="M 15 20 L 18 28 L 14 36" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
          <path d="M 25 20 L 22 28 L 26 36" stroke="#94a3b8" strokeWidth="1.2" fill="none" />
          <rect x="13" y="25" width="2" height="3" fill="#0284c7" />
        </g>
      )}

      {outfitId === "tee" && (
        <g>
          <path d="M 15 20 Q 20 24 25 20" stroke="#f8fafc" strokeWidth="1.2" fill="none" />
          <circle cx="20" cy="28" r="3" fill="#f59e0b" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}

function ExpressionPreviewSvg({ expressionId }: { expressionId: ExpressionId }) {
  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
      <circle cx="20" cy="20" r="16" fill="#fde68a" />

      {expressionId === "sparkle" && (
        <g>
          <ellipse cx="14" cy="18" rx="2.5" ry="3.5" fill="#1e293b" />
          <circle cx="15" cy="17" r="1" fill="#ffffff" />
          <ellipse cx="26" cy="18" rx="2.5" ry="3.5" fill="#1e293b" />
          <circle cx="27" cy="17" r="1" fill="#ffffff" />
          <path d="M 16 26 Q 20 31 24 26 Z" fill="#e11d48" />
        </g>
      )}

      {expressionId === "focused" && (
        <g>
          <path d="M 12 15 Q 15 13 17 15" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M 28 15 Q 25 13 23 15" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="15" cy="18" r="2.2" fill="#1e293b" />
          <circle cx="25" cy="18" r="2.2" fill="#1e293b" />
          <path d="M 17 26 Q 20 28 23 26" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
        </g>
      )}

      {expressionId === "smile" && (
        <g>
          <circle cx="14" cy="18" r="2.2" fill="#1e293b" />
          <circle cx="26" cy="18" r="2.2" fill="#1e293b" />
          <path d="M 16 25 Q 20 30 24 25 Z" fill="#e11d48" />
        </g>
      )}

      {expressionId === "determined" && (
        <g>
          <path d="M 12 15 Q 16 13 18 16" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 28 15 Q 24 13 22 16" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="15" cy="18" r="2.2" fill="#1e293b" />
          <circle cx="25" cy="18" r="2.2" fill="#1e293b" />
          <path d="M 17 26 Q 21 28 24 25" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      )}

      {expressionId === "confident" && (
        <g>
          <circle cx="14" cy="18" r="2.2" fill="#1e293b" />
          <path d="M 23 18 Q 26 15 28 18" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 17 26 Q 21 29 24 26" stroke="#1e293b" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}

      {expressionId === "chill" && (
        <g>
          <path d="M 12 18 Q 15 15 17 18" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 23 18 Q 25 15 28 18" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 16 25 Q 20 28 24 25" stroke="#1e293b" strokeWidth="1.4" strokeLinecap="round" />
        </g>
      )}

      {expressionId === "curious" && (
        <g>
          <circle cx="14" cy="18" r="3" fill="#1e293b" />
          <circle cx="26" cy="18" r="3" fill="#1e293b" />
          <circle cx="15" cy="17" r="1" fill="#ffffff" />
          <circle cx="27" cy="17" r="1" fill="#ffffff" />
          <ellipse cx="20" cy="27" rx="2" ry="2.5" fill="#e11d48" />
        </g>
      )}
    </svg>
  );
}

function GlassesPreviewSvg({ glassesId }: { glassesId: GlassesId }) {
  if (glassesId === "none") {
    return (
      <svg viewBox="0 0 40 40" className="w-6 h-6 shrink-0 opacity-40" fill="none">
        <line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
      {glassesId === "round" && (
        <g stroke="#1e293b" strokeWidth="1.8">
          <circle cx="14" cy="20" r="6" />
          <circle cx="26" cy="20" r="6" />
          <path d="M 20 19 L 20 20" />
          <line x1="8" y1="19" x2="5" y2="19" />
          <line x1="32" y1="19" x2="35" y2="19" />
        </g>
      )}

      {glassesId === "square" && (
        <g stroke="#1e293b" strokeWidth="1.8">
          <rect x="8" y="15" width="10" height="9" rx="2" />
          <rect x="22" y="15" width="10" height="9" rx="2" />
          <line x1="18" y1="19" x2="22" y2="19" />
          <line x1="8" y1="19" x2="5" y2="19" />
          <line x1="32" y1="19" x2="35" y2="19" />
        </g>
      )}

      {glassesId === "wireframe" && (
        <g stroke="#d97706" strokeWidth="1.4">
          <circle cx="14" cy="20" r="5.5" />
          <circle cx="26" cy="20" r="5.5" />
          <path d="M 19.5 19 Q 20 18 20.5 19" />
          <line x1="8.5" y1="19" x2="5" y2="19" />
          <line x1="31.5" y1="19" x2="35" y2="19" />
        </g>
      )}

      {glassesId === "cateye" && (
        <g stroke="#7c3aed" strokeWidth="1.8">
          <path d="M 8 16 Q 14 14 18 17 Q 17 24 13 24 Q 7 23 8 16 Z" />
          <path d="M 32 16 Q 26 14 22 17 Q 23 24 27 24 Q 33 23 32 16 Z" />
          <line x1="18" y1="18" x2="22" y2="18" />
        </g>
      )}
    </svg>
  );
}

function AccessoryPreviewSvg({ accessoryId }: { accessoryId: AccessoryId }) {
  if (accessoryId === "none") {
    return (
      <svg viewBox="0 0 40 40" className="w-6 h-6 shrink-0 opacity-40" fill="none">
        <line x1="8" y1="8" x2="32" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 40 40" className="w-7 h-7 shrink-0" fill="none">
      {accessoryId === "headphones" && (
        <g stroke="#1e293b" strokeWidth="2" strokeLinecap="round">
          <path d="M 10 22 C 8 12, 32 12, 30 22" fill="none" />
          <rect x="7" y="20" width="5" height="10" rx="2.5" fill="#3b82f6" />
          <rect x="28" y="20" width="5" height="10" rx="2.5" fill="#3b82f6" />
        </g>
      )}

      {accessoryId === "blush" && (
        <g fill="#f43f5e" opacity="0.7">
          <ellipse cx="12" cy="20" rx="5" ry="3" />
          <ellipse cx="28" cy="20" rx="5" ry="3" />
        </g>
      )}

      {accessoryId === "freckles" && (
        <g fill="#92400e" opacity="0.8">
          <circle cx="13" cy="18" r="1" />
          <circle cx="16" cy="20" r="1.1" />
          <circle cx="14" cy="22" r="0.9" />
          <circle cx="27" cy="18" r="1" />
          <circle cx="24" cy="20" r="1.1" />
          <circle cx="26" cy="22" r="0.9" />
        </g>
      )}

      {accessoryId === "earrings" && (
        <g stroke="#f59e0b" strokeWidth="2" fill="none">
          <circle cx="12" cy="20" r="4" />
          <circle cx="28" cy="20" r="4" />
        </g>
      )}

      {accessoryId === "star_pin" && (
        <polygon
          points="20,10 23,17 31,17 25,22 27,30 20,25 13,30 15,22 9,17 17,17"
          fill="#f59e0b"
          stroke="#d97706"
          strokeWidth="1"
        />
      )}
    </svg>
  );
}

/* ── Content Options (Clean Descriptions, No Unicode Emojis) ─────── */

const OUTFIT_OPTIONS: { id: OutfitId; label: string; desc: string; forRoles: ("STUDENT" | "TEACHER")[] }[] = [
  { id: "blazer", label: "Academy Blazer", desc: "Formal school jacket with tie & pin", forRoles: ["STUDENT", "TEACHER"] },
  { id: "teacher_blazer", label: "Professor Blazer", desc: "Faculty blazer with pocket square & brass button", forRoles: ["TEACHER", "STUDENT"] },
  { id: "cardigan", label: "Faculty Cardigan", desc: "Cozy knit V-neck with inner dress shirt", forRoles: ["TEACHER", "STUDENT"] },
  { id: "academic_gown", label: "Master Academic Gown", desc: "Regalia gown with gold academic stole", forRoles: ["TEACHER", "STUDENT"] },
  { id: "formal_suit", label: "Executive Suit", desc: "Tailored suit jacket with silk tie", forRoles: ["TEACHER", "STUDENT"] },
  { id: "hoodie", label: "Campus Hoodie", desc: "Oversized cozy study hoodie with drawstrings", forRoles: ["STUDENT"] },
  { id: "varsity", label: "Varsity Jacket", desc: "Classic collegiate snap jacket with letter patch", forRoles: ["STUDENT"] },
  { id: "vest", label: "Sweater Vest", desc: "Knitted academic vest over dress shirt", forRoles: ["STUDENT"] },
  { id: "polo", label: "Classic Polo", desc: "Neat button-up preppy polo collar", forRoles: ["STUDENT"] },
  { id: "labcoat", label: "Science Lab Coat", desc: "Crisp white lab coat with student badge & pen", forRoles: ["STUDENT", "TEACHER"] },
  { id: "tee", label: "Graphic Tee", desc: "Minimalist tee with Evalo star quill emblem", forRoles: ["STUDENT"] },
];

const HAIR_OPTIONS: { id: HairStyleId; label: string; genderCategory: "female" | "male" | "both" }[] = [
  // Feminine
  { id: "bun", label: "Top Bun / Knot", genderCategory: "female" },
  { id: "twintails", label: "Twin Pigtails", genderCategory: "female" },
  { id: "ponytail", label: "High Ponytail", genderCategory: "female" },
  { id: "bob", label: "Chic Bob Cut", genderCategory: "female" },
  { id: "bangs", label: "Curtain Bangs", genderCategory: "female" },
  { id: "long_straight", label: "Long Sleek Straight", genderCategory: "female" },
  { id: "wavy", label: "Flowing Waves", genderCategory: "both" },
  { id: "curls", label: "Fluffy Curls", genderCategory: "both" },
  // Masculine
  { id: "crop", label: "Side-Part Crop", genderCategory: "male" },
  { id: "fade", label: "Sharp Clean Fade", genderCategory: "male" },
  { id: "pompadour", label: "Modern Pompadour", genderCategory: "male" },
  { id: "textured", label: "Textured Fringe", genderCategory: "male" },
  { id: "buzz", label: "Clean Buzz Cut", genderCategory: "male" },
  { id: "dreads", label: "Twists & Locs", genderCategory: "male" },
  // Academic / Headwear
  { id: "beanie", label: "Campus Beanie", genderCategory: "both" },
  { id: "grad_cap", label: "Graduation Cap", genderCategory: "both" },
];

const EXPRESSION_OPTIONS: { id: ExpressionId; label: string; desc: string }[] = [
  { id: "sparkle", label: "Sparkling Joy", desc: "Big joyful glimmer & open smile" },
  { id: "smile", label: "Warm Friendly Smile", desc: "Gentle eyes & welcoming smile" },
  { id: "focused", label: "Calm Focus", desc: "Sharp studious eyes & soft smile" },
  { id: "determined", label: "Sharp Determination", desc: "Keen scholar focus & slight smirk" },
  { id: "confident", label: "Playful Wink", desc: "Winking confident charm" },
  { id: "chill", label: "Relaxed Chill", desc: "Happy curved eyes & ease" },
  { id: "curious", label: "Curious Scholar", desc: "Wide inquisitive open eyes" },
];

const GLASSES_OPTIONS: { id: GlassesId; label: string; desc: string }[] = [
  { id: "none", label: "No Eyewear", desc: "Natural eyes without frames" },
  { id: "round", label: "Round Frames", desc: "Classic academic scholar frames" },
  { id: "square", label: "Modern Rectangles", desc: "Clean contemporary sharp frames" },
  { id: "wireframe", label: "Gold Wireframes", desc: "Delicate luxury thin wireframe lenses" },
  { id: "cateye", label: "Chic Cat-Eye", desc: "Upward angled fashionable frames" },
];

const ACCESSORY_OPTIONS: { id: AccessoryId; label: string; desc: string }[] = [
  { id: "none", label: "No Extra Flair", desc: "Clean look without add-ons" },
  { id: "headphones", label: "Study Headphones", desc: "Over-ear cushioned focus headset" },
  { id: "earrings", label: "Gold Hoops", desc: "Polished gold hoop earrings on both ears" },
  { id: "star_pin", label: "Honor Star Pin", desc: "Gleaming golden star insignia on lapel" },
  { id: "blush", label: "Cheek Blush", desc: "Soft rosy anime cheek tones" },
  { id: "freckles", label: "Cute Freckles", desc: "Natural freckles across cheeks & nose" },
];

const STUDENT_QUICK_MOTTOS = [
  "Ready to ace every quiz! 🚀",
  "Coffee, study notes & good vibes ☕",
  "Aiming for 100% on every bubble sheet! 🎯",
  "Curious mind at work 💡",
  "In my student era 📚",
  "Practice makes progress! ✨",
  "Future graduate in training 🎓",
];

const TEACHER_QUICK_MOTTOS = [
  "Inspiring curiosity and academic excellence 💡",
  "Every student has a story to tell and a mind to grow 🌱",
  "Excellence is not an act, but a habit 🏆",
  "Guiding tomorrow's leaders, one lesson at a time 📚",
  "Dedicated to fair grading and supportive mentorship ✨",
];

export function CharacterCreatorModal({
  isOpen,
  onClose,
  initialConfig = DEFAULT_AVATAR_CONFIG,
  studentName = "User",
  studentId,
  sectionName,
  role = "STUDENT",
  isFirstTime = false,
  loading = false,
  onSave,
}: CharacterCreatorModalProps) {
  const initGender: GenderId = initialConfig.gender === "male" ? "male" : "female";
  const defMale = role === "TEACHER" ? DEFAULT_MALE_TEACHER_AVATAR_CONFIG : DEFAULT_MALE_AVATAR_CONFIG;
  const defFemale = role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;

  const [femaleDraft, setFemaleDraft] = useState<StudentAvatarConfig>(() =>
    initGender === "female" ? initialConfig : { ...defFemale, bio: initialConfig.bio || defFemale.bio }
  );
  const [maleDraft, setMaleDraft] = useState<StudentAvatarConfig>(() =>
    initGender === "male" ? initialConfig : { ...defMale, bio: initialConfig.bio || defMale.bio }
  );
  const [selectedGender, setSelectedGender] = useState<GenderId>(initGender);
  const [config, setConfig] = useState<StudentAvatarConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<TabKey>("outfit");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showAllHair, setShowAllHair] = useState(false);
  const [showAllOutfits, setShowAllOutfits] = useState(false);
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      const g: GenderId = initialConfig.gender === "male" ? "male" : "female";
      const dm = role === "TEACHER" ? DEFAULT_MALE_TEACHER_AVATAR_CONFIG : DEFAULT_MALE_AVATAR_CONFIG;
      const df = role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;

      const fDraft = g === "female" ? initialConfig : { ...df, bio: initialConfig.bio || df.bio };
      const mDraft = g === "male" ? initialConfig : { ...dm, bio: initialConfig.bio || dm.bio };

      setFemaleDraft(fDraft);
      setMaleDraft(mDraft);
      setSelectedGender(g);
      setConfig(initialConfig);
      setShowAllHair(false);
      setShowAllOutfits(false);
      setShowAllPresets(false);
      setShowDiscardConfirm(false);
    }
  }, [isOpen, initialConfig, role]);

  const updateCurrentConfig = (next: StudentAvatarConfig) => {
    const updated = { ...next, gender: selectedGender };
    setConfig(updated);
    if (selectedGender === "female") {
      setFemaleDraft(updated);
    } else {
      setMaleDraft(updated);
    }
  };

  const handleGenderSwitch = (nextGender: GenderId) => {
    if (nextGender === selectedGender) return;

    // 1. Save current active configuration into the current gender's draft
    if (selectedGender === "female") {
      setFemaleDraft(config);
    } else {
      setMaleDraft(config);
    }

    // 2. Switch gender and restore the target gender's draft
    setSelectedGender(nextGender);
    if (nextGender === "female") {
      setConfig(femaleDraft);
    } else {
      setConfig(maleDraft);
    }
  };

  const handleRandomize = () => {
    const randomized = generateRandomAvatar(selectedGender, role);
    updateCurrentConfig(randomized);
  };

  const handleReset = () => {
    if (role === "TEACHER") {
      const def = selectedGender === "male" ? DEFAULT_MALE_TEACHER_AVATAR_CONFIG : DEFAULT_TEACHER_AVATAR_CONFIG;
      updateCurrentConfig(def);
    } else {
      const def = selectedGender === "male" ? DEFAULT_MALE_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;
      updateCurrentConfig(def);
    }
  };

  const handleSelectPreset = (presetConfig: StudentAvatarConfig) => {
    const targetGender: GenderId = presetConfig.gender || selectedGender;
    const updated = { ...presetConfig, gender: targetGender };

    if (targetGender !== selectedGender) {
      if (selectedGender === "female") setFemaleDraft(config);
      else setMaleDraft(config);

      setSelectedGender(targetGender);
      setConfig(updated);
      if (targetGender === "female") setFemaleDraft(updated);
      else setMaleDraft(updated);
    } else {
      updateCurrentConfig(updated);
    }
  };

  const isDirty = useMemo(() => {
    const initGender: GenderId = initialConfig.gender === "male" ? "male" : "female";
    if (selectedGender !== initGender) return true;
    if (JSON.stringify(config) !== JSON.stringify(initialConfig)) return true;

    const dm = role === "TEACHER" ? DEFAULT_MALE_TEACHER_AVATAR_CONFIG : DEFAULT_MALE_AVATAR_CONFIG;
    const df = role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;
    const originalOtherDraft = initGender === "female"
      ? { ...dm, bio: initialConfig.bio || dm.bio }
      : { ...df, bio: initialConfig.bio || df.bio };
    const currentOtherDraft = initGender === "female" ? maleDraft : femaleDraft;

    if (JSON.stringify(currentOtherDraft) !== JSON.stringify(originalOtherDraft)) {
      return true;
    }

    return false;
  }, [config, selectedGender, initialConfig, femaleDraft, maleDraft, role]);

  const handleRequestClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardAndExit = () => {
    setShowDiscardConfirm(false);
    setConfig(initialConfig);
    setSelectedGender(initialConfig.gender || "female");
    onClose();
  };

  const handleDiscardChangesOnly = () => {
    const g: GenderId = initialConfig.gender === "male" ? "male" : "female";
    const dm = role === "TEACHER" ? DEFAULT_MALE_TEACHER_AVATAR_CONFIG : DEFAULT_MALE_AVATAR_CONFIG;
    const df = role === "TEACHER" ? DEFAULT_TEACHER_AVATAR_CONFIG : DEFAULT_AVATAR_CONFIG;

    const fDraft = g === "female" ? initialConfig : { ...df, bio: initialConfig.bio || df.bio };
    const mDraft = g === "male" ? initialConfig : { ...dm, bio: initialConfig.bio || dm.bio };

    setFemaleDraft(fDraft);
    setMaleDraft(mDraft);
    setSelectedGender(g);
    setConfig(initialConfig);
    setShowDiscardConfirm(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ ...config, gender: selectedGender });
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 700);
    } catch (err) {
      console.error("Failed to save avatar character:", err);
    } finally {
      setSaving(false);
    }
  };

  // Filter hair options by selected gender
  const visibleHairOptions = HAIR_OPTIONS.filter((h) => {
    if (h.genderCategory === "both") return true;
    return h.genderCategory === selectedGender;
  });

  // Filter presets
  const visiblePresets = AVATAR_PRESETS.filter((p) => {
    const matchesRole = !p.role || p.role === "all" || (role === "TEACHER" ? p.role === "teacher" : p.role === "student");
    const matchesGender = p.gender === "all" || p.gender === selectedGender;
    return matchesRole && matchesGender;
  });

  const availableOutfits = OUTFIT_OPTIONS.filter((o) => o.forRoles.includes(role));
  const quickMottos = role === "TEACHER" ? TEACHER_QUICK_MOTTOS : STUDENT_QUICK_MOTTOS;

  // Determine if active selections are in the expanded zone so they aren't hidden
  const isSelectedHairBeyond = visibleHairOptions.findIndex((h) => h.id === config.hairStyle) >= 6;
  const isSelectedOutfitBeyond = availableOutfits.findIndex((o) => o.id === config.outfit) >= 6;
  const displayedHairOptions = (showAllHair || isSelectedHairBeyond) ? visibleHairOptions : visibleHairOptions.slice(0, 6);
  const displayedOutfits = (showAllOutfits || isSelectedOutfitBeyond) ? availableOutfits : availableOutfits.slice(0, 6);
  const displayedPresets = showAllPresets ? visiblePresets : visiblePresets.slice(0, 3);

  if (!isOpen) return null;

  if (loading) {
    return (
      <div
        role="dialog"
        aria-modal="true"
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      >
        <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] h-[85vh] rounded-[28px] sm:rounded-4xl border border-border-emphasis/80 bg-surface-raised shadow-2xl overflow-hidden">
          <SkeletonAvatarCreator />
        </div>
      </div>
    );
  }

  const isRawUuid = (val?: string) => {
    if (!val) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val.trim());
  };
  const cleanSectionName = sectionName && !isRawUuid(sectionName) ? sectionName : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-sm:rounded-t-3xl max-sm:h-[94dvh] sm:max-w-4xl sm:h-[88vh] sm:rounded-4xl border border-border-emphasis/80 bg-surface-raised shadow-2xl overflow-hidden">
        {/* Mobile Drag Indicator */}
        <div className="w-10 h-1 rounded-full bg-slate-400/50 dark:bg-slate-600 mx-auto mt-2 sm:hidden shrink-0" />

        {/* Top Header */}
        <div className="relative px-4 sm:px-7 py-3 sm:py-4 border-b border-border-default/70 bg-surface-base/60 backdrop-blur-sm flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl border shadow-inner ${
              role === "TEACHER"
                ? "bg-steel-ghost text-steel border-steel-border"
                : "bg-sage-ghost text-sage border-sage-border"
            }`}>
              {role === "TEACHER" ? <School className="h-4 w-4 sm:h-5 sm:w-5" /> : <Shirt className="h-4 w-4 sm:h-5 sm:w-5" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h2 className="text-sm sm:text-lg font-black tracking-tight text-text-primary truncate">
                  {role === "TEACHER"
                    ? "Faculty Character Studio & Closet"
                    : isFirstTime
                    ? "Create Your Student Avatar"
                    : "Student Character & Closet"}
                </h2>
                <span className={`hidden sm:inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold border uppercase ${
                  role === "TEACHER"
                    ? "bg-steel-ghost text-steel border-steel-border"
                    : "bg-sage-ghost text-sage border-sage-border"
                }`}>
                  {role === "TEACHER" ? "Faculty Studio" : "Character Studio"}
                </span>
                {isDirty && (
                  <span className="rounded-full px-2 py-0.5 text-[9px] sm:text-[10px] font-black border uppercase bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 flex items-center gap-1 shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Unsaved
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-text-muted truncate">
                {role === "TEACHER"
                  ? "Customize faculty attire and character look"
                  : isFirstTime
                  ? "Customize your character look, outfit, and study motto"
                  : "Customize your avatar style, outfit, and study motto"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestClose}
            className="rounded-xl p-1.5 sm:p-2 text-text-muted hover:text-text-primary hover:bg-surface-subtle transition-colors focus:outline-none cursor-pointer shrink-0 min-h-9 min-w-9 flex items-center justify-center"
            aria-label="Close closet modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* First-time Welcome Banner */}
        {isFirstTime && (
          <div className="px-4 sm:px-7 py-2 bg-sage/10 border-b border-sage-border/50 flex items-center gap-2 text-xs text-sage font-medium shrink-0">
            <GraduationCap className="h-4 w-4 shrink-0 text-sage" />
            <span className="truncate">
              <strong>Starting Profile Setup:</strong> Welcome to Evalo! Customize your avatar look and equip outfits.
            </span>
          </div>
        )}

        {/* ── MOBILE INTERACTIVE PREVIEW & QUICK ACTIONS (lg:hidden) ── */}
        <div className="block lg:hidden px-4 py-2.5 bg-surface-base/50 border-b border-border-default/70 shrink-0 space-y-2">
          <div className="flex items-center gap-3">
            {/* Live Compact Avatar Preview */}
            <div className="relative shrink-0">
              <div className="p-1 rounded-full bg-surface-raised border border-border-emphasis/70 shadow-md">
                <StudentAvatar config={{ ...config, gender: selectedGender }} size={64} animate={true} />
              </div>
              <div
                className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-white shadow-xs border border-surface-raised ${
                  role === "TEACHER" ? "bg-steel" : "bg-sage"
                }`}
              >
                {role === "TEACHER" ? <School className="h-2.5 w-2.5" /> : <GraduationCap className="h-2.5 w-2.5" />}
              </div>
            </div>

            {/* Student Name & Badges */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-text-primary truncate">{studentName}</h3>
                {studentId && (
                  <span className="text-[10px] font-mono font-bold text-steel bg-steel-ghost px-1.5 py-0.2 rounded-full border border-steel-border">
                    ID: {studentId}
                  </span>
                )}
                {cleanSectionName && (
                  <span className="text-[10px] font-bold text-sage bg-sage-ghost px-1.5 py-0.2 rounded-full border border-sage-border">
                    {cleanSectionName}
                  </span>
                )}
              </div>

              {/* Presentation Switcher (Female / Male) */}
              <div className="flex items-center gap-1 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleGenderSwitch("female")}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    selectedGender === "female"
                      ? "bg-sage text-white shadow-xs"
                      : "bg-surface-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  Female (♀)
                </button>
                <button
                  type="button"
                  onClick={() => handleGenderSwitch("male")}
                  className={`py-1 px-2.5 rounded-lg text-[11px] font-black transition-all cursor-pointer ${
                    selectedGender === "male"
                      ? "bg-steel text-white shadow-xs"
                      : "bg-surface-subtle text-text-muted hover:text-text-primary"
                  }`}
                >
                  Male (♂)
                </button>
              </div>
            </div>

            {/* Quick Surprise / Reset buttons */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleRandomize}
                title="Surprise Me!"
                className="flex items-center justify-center h-8 w-8 rounded-xl bg-steel-ghost text-steel hover:bg-steel hover:text-white border border-steel-border transition shadow-xs cursor-pointer active:scale-95"
              >
                <Shuffle className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={handleReset}
                title="Reset default look"
                className="flex items-center justify-center h-8 w-8 rounded-xl bg-surface-subtle text-text-muted hover:text-text-primary border border-border-default transition cursor-pointer active:scale-95"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Starter Presets Bar (Horizontal Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pt-0.5 -mx-1 px-1">
            <span className="text-[10px] font-bold text-text-muted shrink-0 uppercase tracking-wider">Presets:</span>
            {visiblePresets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPreset(p.config)}
                className="shrink-0 px-2.5 py-1 rounded-full border border-border-default bg-surface-raised hover:border-steel text-[11px] font-bold text-text-secondary hover:text-text-primary transition cursor-pointer active:scale-95"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Main Content Area (Two Columns on Desktop, Single Column on Mobile) */}
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border-default">
          {/* ── LEFT COLUMN: Avatar Stage & Quick Actions (DESKTOP ONLY) ──────────── */}
          <div className="hidden lg:flex p-6 flex-col items-center justify-between gap-5 bg-surface-base/30 overflow-y-auto">
            {/* Avatar Spotlight Stage */}
            <div className="flex flex-col items-center text-center w-full">
              <div className="relative group my-2">
                <div className="absolute -inset-2 rounded-full bg-linear-to-r from-steel/20 via-cream/20 to-sage/20 blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />

                <div className="relative p-2 rounded-full bg-surface-raised border border-border-emphasis/60 shadow-xl">
                  <StudentAvatar config={{ ...config, gender: selectedGender }} size={165} animate={true} />
                </div>

                <div className={`absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full text-white shadow-md border-2 border-surface-raised ${
                  role === "TEACHER" ? "bg-steel" : "bg-sage"
                }`}>
                  {role === "TEACHER" ? <School className="h-4 w-4" /> : <GraduationCap className="h-4 w-4" />}
                </div>
              </div>

              {/* User Name & Official School Record */}
              <div className="mt-2 text-center w-full">
                <h3 className="text-base font-black text-text-primary flex items-center justify-center gap-1.5">
                  {studentName}
                </h3>
                <div className="flex items-center justify-center gap-1.5 mt-1 flex-wrap">
                  {studentId && (
                    <span className="text-[11px] font-mono font-bold text-steel bg-steel-ghost px-2.5 py-0.5 rounded-full border border-steel-border">
                      ID: {studentId}
                    </span>
                  )}
                  {cleanSectionName && (
                    <span className="text-[11px] font-bold text-sage bg-sage-ghost px-2 py-0.5 rounded-full border border-sage-border">
                      Sec: {cleanSectionName}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-1 text-[10px] text-text-muted mt-1.5">
                  <ShieldCheck className="h-3 w-3 text-sage" />
                  <span>{role === "TEACHER" ? "Official Faculty Account" : "Official Student Account"}</span>
                </div>
              </div>

              {/* Motto Speech Bubble */}
              {config.bio && (
                <div className="mt-3 relative w-full px-3 py-2 rounded-xl bg-surface-raised border border-border-default text-xs text-text-secondary italic shadow-xs">
                  <Quote className="h-3 w-3 text-text-muted inline mr-1 opacity-70" />
                  &ldquo;{config.bio}&rdquo;
                </div>
              )}
            </div>

            {/* Quick Actions (Randomize / Reset / Presets) */}
            <div className="w-full space-y-3 pt-3 border-t border-border-default/60">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-steel-ghost hover:bg-steel text-steel hover:text-white border border-steel-border text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Surprise Me!
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset to default outfit"
                  className="flex items-center justify-center p-2.5 rounded-xl bg-surface-subtle hover:bg-surface-muted text-text-muted hover:text-text-primary border border-border-default text-xs transition-colors cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Starter Personas Carousel */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1.5">
                  Starter Personas ({selectedGender === "female" ? "Female" : "Male"})
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {displayedPresets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p.config)}
                      className="p-2 rounded-xl border border-border-default hover:border-steel hover:bg-surface-subtle text-left transition-all group cursor-pointer"
                    >
                      <span className="text-xs font-bold text-text-primary block truncate group-hover:text-steel transition-colors">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
                {visiblePresets.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllPresets(!showAllPresets)}
                    className="w-full mt-2 py-1 px-2 rounded-xl border border-border-default bg-surface-subtle hover:bg-surface-muted text-[10px] font-bold text-text-secondary hover:text-text-primary flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <span>
                      {showAllPresets
                        ? "Show Fewer Personas"
                        : `View More Personas (+${visiblePresets.length - 3})`}
                    </span>
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        showAllPresets ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Customization Tabs & Wardrobe Studio ── */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6">
            <div className="space-y-3 sm:space-y-4 flex-1">
              {/* Gender Selector: Female / Male Toggle (DESKTOP ONLY, since mobile has it in top bar) */}
              <div className="hidden lg:flex items-center justify-between p-1.5 rounded-2xl bg-surface-base border border-border-default shadow-xs">
                <span className="text-xs font-black uppercase tracking-wider text-text-secondary pl-2 flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-steel" />
                  Presentation:
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleGenderSwitch("female")}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedGender === "female"
                        ? "bg-sage text-white shadow-sm shadow-sage/30 scale-100"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                    }`}
                  >
                    <span>Female (♀)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleGenderSwitch("male")}
                    className={`flex items-center gap-1.5 py-1.5 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      selectedGender === "male"
                        ? "bg-steel text-white shadow-sm shadow-steel/30 scale-100"
                        : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                    }`}
                  >
                    <span>Male (♂)</span>
                  </button>
                </div>
              </div>

              {/* Modern Wardrobe Segmented Tab Bar */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 p-1 bg-surface-base rounded-2xl border border-border-default">
                {[
                  { key: "outfit" as TabKey, label: "Outfit", icon: Shirt },
                  { key: "hair" as TabKey, label: "Hair", icon: Scissors },
                  { key: "face" as TabKey, label: "Face", icon: Smile },
                  { key: "accessories" as TabKey, label: "Flair", icon: Glasses },
                  { key: "backdrop" as TabKey, label: "Aura", icon: Palette },
                  { key: "bio" as TabKey, label: "Motto", icon: Quote },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = activeTab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setActiveTab(t.key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-steel text-white shadow-md shadow-steel/25"
                          : "text-text-muted hover:text-text-primary hover:bg-surface-subtle"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* ── TAB CONTENT PANELS ─────────────────────────────── */}

              {/* TAB 1: OUTFIT & WARDROBE */}
              {activeTab === "outfit" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Outfit Options */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      {role === "TEACHER" ? "Faculty Attire & Outfits" : "Campus Attire & Uniforms"}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {displayedOutfits.map((item) => {
                        const isSelected = config.outfit === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, outfit: item.id })}
                            className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                                : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                            }`}
                          >
                            <OutfitPreviewSvg outfitId={item.id} gender={selectedGender} />
                            <span className="flex-1 min-w-0 text-xs font-black text-text-primary truncate">
                              {item.label}
                            </span>
                            {isSelected && <Check className="h-4 w-4 text-steel shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {availableOutfits.length > 6 && (
                      <div className="pt-2.5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllOutfits(!showAllOutfits)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border border-border-default bg-surface-subtle hover:bg-surface-muted text-xs font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>
                            {showAllOutfits
                              ? "Show Fewer Outfits"
                              : `View More Outfits (+${availableOutfits.length - 6} more)`}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              showAllOutfits ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Outfit Main Color */}
                  <div className="pt-4 border-t border-border-default/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Primary Fabric Color
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(OUTFIT_COLORS) as OutfitColorId[]).map((cKey) => {
                        const c = OUTFIT_COLORS[cKey];
                        const isSelected = config.outfitColor === cKey;
                        return (
                          <button
                            key={cKey}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, outfitColor: cKey })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-xs ring-2 ring-steel/20 text-text-primary"
                                : "border-border-default hover:border-border-emphasis text-text-secondary bg-surface-base/40"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                              style={{ backgroundColor: c.hex }}
                            />
                            <span>{c.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Outfit Accent / Tie Color */}
                  <div className="pt-4 border-t border-border-default/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Accent / Lapel / Tie Trim
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(ACCENT_COLORS) as OutfitAccentId[]).map((aKey) => {
                        const a = ACCENT_COLORS[aKey];
                        const isSelected = config.outfitAccent === aKey;
                        return (
                          <button
                            key={aKey}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, outfitAccent: aKey })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-xs ring-2 ring-steel/20 text-text-primary"
                                : "border-border-default hover:border-border-emphasis text-text-secondary bg-surface-base/40"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                              style={{ backgroundColor: a.hex }}
                            />
                            <span>{a.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: HAIR STYLES & COLORS */}
              {activeTab === "hair" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Hair Cut Options */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
                        Hairstyle ({selectedGender === "female" ? "Feminine & Unisex" : "Masculine & Unisex"})
                      </h4>
                      <span className="text-[10px] text-text-muted font-medium">
                        {visibleHairOptions.length} styles available
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {displayedHairOptions.map((item) => {
                        const isSelected = config.hairStyle === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, hairStyle: item.id })}
                            className={`flex items-center gap-2.5 p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                                : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                            }`}
                          >
                            <HairPreviewSvg
                              styleId={item.id}
                              colorHex={HAIR_COLORS[config.hairColor]?.hex || "#1c242c"}
                            />
                            <span className="text-xs font-black text-text-primary truncate">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {visibleHairOptions.length > 6 && (
                      <div className="pt-2.5 flex justify-center">
                        <button
                          type="button"
                          onClick={() => setShowAllHair(!showAllHair)}
                          className="inline-flex items-center gap-1.5 py-1.5 px-3.5 rounded-full border border-border-default bg-surface-subtle hover:bg-surface-muted text-xs font-bold text-text-secondary hover:text-text-primary transition-all cursor-pointer shadow-xs active:scale-95"
                        >
                          <span>
                            {showAllHair
                              ? "Show Fewer Styles"
                              : `View More Styles (+${visibleHairOptions.length - 6} more)`}
                          </span>
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform duration-200 ${
                              showAllHair ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Hair Color Palette */}
                  <div className="pt-4 border-t border-border-default/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Hair Color
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      {(Object.keys(HAIR_COLORS) as HairColorId[]).map((hKey) => {
                        const h = HAIR_COLORS[hKey];
                        const isSelected = config.hairColor === hKey;
                        return (
                          <button
                            key={hKey}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, hairColor: hKey })}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-xs ring-2 ring-steel/20 text-text-primary"
                                : "border-border-default hover:border-border-emphasis text-text-secondary bg-surface-base/40"
                            }`}
                          >
                            <span
                              className="h-3.5 w-3.5 rounded-full border border-black/10 shrink-0 shadow-xs"
                              style={{ backgroundColor: h.hex }}
                            />
                            <span>{h.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: FACE, SKIN & EXPRESSION */}
              {activeTab === "face" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Skin Tone */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Skin Complexion
                    </h4>
                    <div className="flex flex-wrap items-center gap-3">
                      {(Object.keys(SKIN_TONES) as SkinToneId[]).map((sKey) => {
                        const s = SKIN_TONES[sKey];
                        const isSelected = config.skinTone === sKey;
                        return (
                          <button
                            key={sKey}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, skinTone: sKey })}
                            className={`flex flex-col items-center gap-1.5 p-1.5 rounded-2xl border transition-all cursor-pointer ${
                              isSelected ? "border-steel bg-steel-ghost/20 ring-2 ring-steel/20" : "border-transparent"
                            }`}
                          >
                            <span
                              className="h-9 w-9 rounded-full shadow-inner border border-black/10 flex items-center justify-center"
                              style={{ backgroundColor: s.hex }}
                            >
                              {isSelected && <Check className="h-4 w-4 text-slate-800 drop-shadow-sm" />}
                            </span>
                            <span className="text-[10px] font-bold text-text-muted">{s.label.split(" ")[0]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expressions */}
                  <div className="pt-4 border-t border-border-default/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Expression & Mood
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {EXPRESSION_OPTIONS.map((item) => {
                        const isSelected = config.expression === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, expression: item.id })}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                                : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                            }`}
                          >
                            <ExpressionPreviewSvg expressionId={item.id} />
                            <span className="text-xs font-black text-text-primary text-center truncate w-full">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: ACCESSORIES & EYEWEAR */}
              {activeTab === "accessories" && (
                <div className="space-y-5 animate-in fade-in duration-150">
                  {/* Glasses */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Eyewear & Scholar Frames
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {GLASSES_OPTIONS.map((item) => {
                        const isSelected = config.glasses === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, glasses: item.id })}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                                : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                            }`}
                          >
                            <GlassesPreviewSvg glassesId={item.id} />
                            <span className="text-xs font-bold text-text-primary text-center truncate w-full">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Extra Flair */}
                  <div className="pt-4 border-t border-border-default/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2.5">
                      Academic Flair & Accessories
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      {ACCESSORY_OPTIONS.map((item) => {
                        const isSelected = config.accessory === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => updateCurrentConfig({ ...config, accessory: item.id })}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                              isSelected
                                ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                                : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                            }`}
                          >
                            <AccessoryPreviewSvg accessoryId={item.id} />
                            <span className="text-xs font-bold text-text-primary text-center truncate w-full">
                              {item.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BACKDROP & AURA */}
              {activeTab === "backdrop" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-1">
                    Canvas Backdrop & Aura Theme
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(Object.keys(BACKDROP_THEMES) as BackdropThemeId[]).map((bKey) => {
                      const b = BACKDROP_THEMES[bKey];
                      const isSelected = config.backdrop === bKey;
                      return (
                        <button
                          key={bKey}
                          type="button"
                          onClick={() => updateCurrentConfig({ ...config, backdrop: bKey })}
                          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                            isSelected
                              ? "border-steel bg-steel-ghost/30 shadow-sm ring-2 ring-steel/20"
                              : "border-border-default hover:border-border-emphasis bg-surface-base/50 hover:bg-surface-base"
                          }`}
                        >
                          <span
                            className="h-4 w-4 rounded-full border border-black/10 shrink-0 shadow-xs"
                            style={{ backgroundColor: b.ringColor }}
                          />
                          <span className="flex-1 min-w-0 text-xs font-black text-text-primary truncate">
                            {b.label}
                          </span>
                          {isSelected && <Check className="h-4 w-4 text-steel shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 6: STUDY MOTTO & BIO */}
              {activeTab === "bio" && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-text-muted mb-1.5">
                      <Quote className="h-3.5 w-3.5 text-sage" />
                      {role === "TEACHER" ? "Teaching Philosophy / Motto" : "Custom Study Motto / Student Status"}
                    </label>
                    <input
                      type="text"
                      maxLength={140}
                      value={config.bio || ""}
                      onChange={(e) => updateCurrentConfig({ ...config, bio: e.target.value })}
                      placeholder={role === "TEACHER" ? "e.g. Inspiring curiosity and academic excellence 💡" : "e.g. Aiming for 100% on every quiz! 🚀"}
                      className="w-full rounded-2xl border border-border-default bg-surface-base px-4 py-3 text-sm text-text-primary placeholder-text-faint focus:border-steel focus:outline-none focus:ring-4 focus:ring-steel/10 transition-all font-medium"
                    />
                    <div className="flex items-center justify-between text-[10px] text-text-faint mt-1">
                      <span>Displays on your avatar profile speech bubble and hero</span>
                      <span>{(config.bio || "").length} / 140 characters</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-xs font-bold text-text-secondary block mb-2">
                      {role === "TEACHER" ? "Or pick an educator motto:" : "Or pick a favorite student motto:"}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {quickMottos.map((motto) => (
                        <button
                          key={motto}
                          type="button"
                          onClick={() => updateCurrentConfig({ ...config, bio: motto })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                            config.bio === motto
                              ? "bg-steel text-white border-steel shadow-xs"
                              : "bg-surface-base hover:bg-surface-subtle text-text-secondary border-border-default"
                          }`}
                        >
                          {motto}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer (Pinned, elevated, safe-area-bottom for mobile) */}
        <div className="px-4 sm:px-7 py-3 sm:py-3.5 border-t border-border-default/80 bg-surface-raised/95 backdrop-blur-md flex items-center justify-between shrink-0 safe-area-bottom z-10">
          <div className="text-[11px] text-text-muted hidden sm:block">
            <span>Your character avatar and motto are saved to your account and shown across campus.</span>
          </div>

          <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleRequestClose}
              disabled={saving}
              className="flex items-center justify-center min-h-11 sm:min-h-10 px-4 py-2.5 rounded-xl sm:rounded-2xl border border-border-default hover:bg-surface-subtle text-xs font-bold text-text-secondary transition-colors cursor-pointer active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className={`flex items-center justify-center min-h-11 sm:min-h-10 gap-2 px-4 sm:px-6 py-2.5 rounded-xl sm:rounded-2xl text-white text-xs font-black shadow-lg transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                role === "TEACHER"
                  ? "bg-steel hover:bg-steel-light shadow-steel/25 hover:shadow-steel/35"
                  : "bg-sage hover:bg-sage-light shadow-sage/25 hover:shadow-sage/35"
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Equipping...</span>
                </>
              ) : savedSuccess ? (
                <>
                  <Check className="h-4 w-4 text-white" />
                  <span>Equipped!</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save &amp; Equip Look</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Discard Confirmation Dialog Modal */}
        {showDiscardConfirm && (
          <div className="absolute inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
            <div className="relative w-full max-w-md rounded-3xl border border-rose-500/30 bg-surface-raised p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-text-primary">
                    Discard Unsaved Changes?
                  </h3>
                  <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
                    You have unsaved customizations in your wardrobe. If you discard now, your edits in both presentation styles will be reverted back to your original look.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowDiscardConfirm(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border-default hover:bg-surface-subtle text-xs font-bold text-text-primary transition-colors cursor-pointer"
                >
                  Keep Customizing
                </button>
                <button
                  type="button"
                  onClick={handleDiscardAndExit}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-lg shadow-rose-600/25 transition-all cursor-pointer"
                >
                  Discard & Exit
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
