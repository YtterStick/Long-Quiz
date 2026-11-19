"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  StudentAvatarConfig,
  SKIN_TONES,
  HAIR_COLORS,
  OUTFIT_COLORS,
  ACCENT_COLORS,
  BACKDROP_THEMES,
  DEFAULT_AVATAR_CONFIG,
  sanitizeHairForGender,
} from "@/types/avatar";

export interface StudentAvatar3DProps {
  config?: StudentAvatarConfig | null;
  size?: number | string;
  className?: string;
  showBackdrop?: boolean;
  animate?: boolean;
  variant?: "full" | "head";
  /** Allow click/touch drag to rotate 360 degrees */
  interactive?: boolean;
  /** External yaw angle override in radians (0 = front, PI = back) */
  yaw?: number;
  /** Continuously auto-rotate 360 degrees */
  autoRotate?: boolean;
  onYawChange?: (yaw: number) => void;
}

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface Tri3D {
  v0: Vec3;
  v1: Vec3;
  v2: Vec3;
  color: string;
  shininess?: number;
  unlit?: boolean;
}

/* ── Color Utilities ────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16) || 0,
      parseInt(clean[1] + clean[1], 16) || 0,
      parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  const num = parseInt(clean.slice(0, 6), 16);
  if (Number.isNaN(num)) return [155, 180, 192];
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function shadeRgb(
  rgb: [number, number, number],
  lightFactor: number,
  spec: number,
  rim: number,
  rimRgb: [number, number, number]
): string {
  const r = Math.min(
    255,
    Math.max(0, Math.round(rgb[0] * lightFactor + spec * 255 + rim * rimRgb[0] * 0.45))
  );
  const g = Math.min(
    255,
    Math.max(0, Math.round(rgb[1] * lightFactor + spec * 255 + rim * rimRgb[1] * 0.45))
  );
  const b = Math.min(
    255,
    Math.max(0, Math.round(rgb[2] * lightFactor + spec * 255 + rim * rimRgb[2] * 0.45))
  );
  return `rgb(${r},${g},${b})`;
}

/* ── 3D Math Helpers ────────────────────────────────────────────── */

function sub3(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross3(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function norm3(v: Vec3): Vec3 {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function dot3(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function rotY(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x * c + v.z * s,
    y: v.y,
    z: -v.x * s + v.z * c,
  };
}

function rotX(v: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return {
    x: v.x,
    y: v.y * c - v.z * s,
    z: v.y * s + v.z * c,
  };
}

/* ── Mesh Builders ──────────────────────────────────────────────── */

function addEllipsoid(
  tris: Tri3D[],
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  color: string,
  latSegs = 10,
  lonSegs = 16,
  options?: {
    shininess?: number;
    thetaStart?: number;
    thetaEnd?: number;
    phiStart?: number;
    phiEnd?: number;
  }
) {
  const t0 = options?.thetaStart ?? 0;
  const t1 = options?.thetaEnd ?? Math.PI;
  const p0 = options?.phiStart ?? 0;
  const p1 = options?.phiEnd ?? Math.PI * 2;
  const shininess = options?.shininess ?? 0.12;

  for (let i = 0; i < latSegs; i++) {
    const thetaA = t0 + ((t1 - t0) * i) / latSegs;
    const thetaB = t0 + ((t1 - t0) * (i + 1)) / latSegs;
    const sinA = Math.sin(thetaA);
    const cosA = Math.cos(thetaA);
    const sinB = Math.sin(thetaB);
    const cosB = Math.cos(thetaB);

    for (let j = 0; j < lonSegs; j++) {
      const phiA = p0 + ((p1 - p0) * j) / lonSegs;
      const phiB = p0 + ((p1 - p0) * (j + 1)) / lonSegs;

      const p00: Vec3 = {
        x: cx + rx * sinA * Math.sin(phiA),
        y: cy + ry * cosA,
        z: cz + rz * sinA * Math.cos(phiA),
      };
      const p10: Vec3 = {
        x: cx + rx * sinB * Math.sin(phiA),
        y: cy + ry * cosB,
        z: cz + rz * sinB * Math.cos(phiA),
      };
      const p11: Vec3 = {
        x: cx + rx * sinB * Math.sin(phiB),
        y: cy + ry * cosB,
        z: cz + rz * sinB * Math.cos(phiB),
      };
      const p01: Vec3 = {
        x: cx + rx * sinA * Math.sin(phiB),
        y: cy + ry * cosA,
        z: cz + rz * sinA * Math.cos(phiB),
      };

      if (i > 0 || t0 > 0) {
        tris.push({ v0: p00, v1: p10, v2: p11, color, shininess });
      }
      if (i < latSegs - 1 || t1 < Math.PI) {
        tris.push({ v0: p00, v1: p11, v2: p01, color, shininess });
      }
    }
  }
}

function addTaperedCylinder(
  tris: Tri3D[],
  pTop: Vec3,
  pBot: Vec3,
  rTopX: number,
  rTopZ: number,
  rBotX: number,
  rBotZ: number,
  color: string,
  segs = 14,
  rows = 3,
  shininess = 0.1,
  capBottom = false,
  capTop = false
) {
  for (let r = 0; r < rows; r++) {
    const fA = r / rows;
    const fB = (r + 1) / rows;

    const cA: Vec3 = {
      x: pTop.x + (pBot.x - pTop.x) * fA,
      y: pTop.y + (pBot.y - pTop.y) * fA,
      z: pTop.z + (pBot.z - pTop.z) * fA,
    };
    const cB: Vec3 = {
      x: pTop.x + (pBot.x - pTop.x) * fB,
      y: pTop.y + (pBot.y - pTop.y) * fB,
      z: pTop.z + (pBot.z - pTop.z) * fB,
    };

    const rxA = rTopX + (rBotX - rTopX) * fA;
    const rzA = rTopZ + (rBotZ - rTopZ) * fA;
    const rxB = rTopX + (rBotX - rTopX) * fB;
    const rzB = rTopZ + (rBotZ - rTopZ) * fB;

    for (let j = 0; j < segs; j++) {
      const a0 = (j * Math.PI * 2) / segs;
      const a1 = ((j + 1) * Math.PI * 2) / segs;

      const v00: Vec3 = { x: cA.x + rxA * Math.sin(a0), y: cA.y, z: cA.z + rzA * Math.cos(a0) };
      const v10: Vec3 = { x: cB.x + rxB * Math.sin(a0), y: cB.y, z: cB.z + rzB * Math.cos(a0) };
      const v11: Vec3 = { x: cB.x + rxB * Math.sin(a1), y: cB.y, z: cB.z + rzB * Math.cos(a1) };
      const v01: Vec3 = { x: cA.x + rxA * Math.sin(a1), y: cA.y, z: cA.z + rzA * Math.cos(a1) };

      tris.push({ v0: v00, v1: v10, v2: v11, color, shininess });
      tris.push({ v0: v00, v1: v11, v2: v01, color, shininess });

      if (capTop && r === 0) {
        tris.push({ v0: cA, v1: v00, v2: v01, color, shininess });
      }
      if (capBottom && r === rows - 1) {
        tris.push({ v0: cB, v1: v11, v2: v10, color, shininess });
      }
    }
  }
}

function addQuad(
  tris: Tri3D[],
  v0: Vec3,
  v1: Vec3,
  v2: Vec3,
  v3: Vec3,
  color: string,
  doubleSided = false,
  shininess = 0.08
) {
  tris.push({ v0, v1, v2, color, shininess });
  tris.push({ v0, v1: v2, v2: v3, color, shininess });
  if (doubleSided) {
    tris.push({ v0, v1: v2, v2: v1, color, shininess });
    tris.push({ v0, v1: v3, v2, color, shininess });
  }
}

/* ── Full 3D Character Mesh Generator (Head to Foot!) ───────────── */

function buildCharacterMesh(rawConfig: StudentAvatarConfig): Tri3D[] {
  const config: StudentAvatarConfig = {
    ...rawConfig,
    hairStyle: sanitizeHairForGender(rawConfig.hairStyle, rawConfig.gender),
  };
  const skin = SKIN_TONES[config.skinTone] || SKIN_TONES.peach;
  const hair = HAIR_COLORS[config.hairColor] || HAIR_COLORS.midnight;
  const outfit = OUTFIT_COLORS[config.outfitColor] || OUTFIT_COLORS.steel;
  const accent = ACCENT_COLORS[config.outfitAccent] || ACCENT_COLORS.cream;
  const isFemale = config.gender !== "male";

  const tris: Tri3D[] = [];

  // ── 1. FEET & SHOES (y = -0.94 to -0.77) ──
  const isFormalShoe =
    config.outfit === "blazer" ||
    config.outfit === "teacher_blazer" ||
    config.outfit === "formal_suit" ||
    config.outfit === "academic_gown" ||
    config.outfit === "cardigan";
  const shoeMainColor = isFormalShoe ? "#1b2430" : outfit.shadow;
  const shoeSoleColor = isFormalShoe ? "#0f141b" : "#f1f5f9";

  for (const side of [-1, 1]) {
    const fx = side * 0.145;
    // Shoe sole (ground level y = -0.94)
    addTaperedCylinder(
      tris,
      { x: fx, y: -0.89, z: 0.045 },
      { x: fx, y: -0.94, z: 0.045 },
      0.072,
      0.135,
      0.076,
      0.142,
      shoeSoleColor,
      12,
      1,
      0.15,
      true,
      false
    );
    // Shoe upper (covers heel z=-0.08 to toe z=+0.17)
    addEllipsoid(tris, fx, -0.865, 0.045, 0.07, 0.055, 0.132, shoeMainColor, 8, 14, {
      shininess: 0.3,
    });
    // Accent sneaker stripe / tongue detail
    if (!isFormalShoe) {
      addEllipsoid(tris, fx, -0.84, 0.09, 0.045, 0.03, 0.055, accent.hex, 5, 8);
    }
  }

  // ── 2. LEGS, TROUSERS, SKIRT OR ACADEMIC GOWN (y = -0.78 to -0.16) ──
  const wearsSkirt =
    isFemale &&
    (config.outfit === "blazer" || config.outfit === "vest" || config.outfit === "cardigan");
  const isGown = config.outfit === "academic_gown";
  const pantsColor =
    config.outfit === "formal_suit" || config.outfit === "teacher_blazer"
      ? outfit.shadow
      : "#1e293b";

  for (const side of [-1, 1]) {
    const lx = side * 0.14;
    if (wearsSkirt) {
      // Upper thigh under skirt + bare knee (skin) + knee-high sock
      addTaperedCylinder(
        tris,
        { x: lx, y: -0.35, z: 0 },
        { x: lx, y: -0.56, z: 0 },
        0.075,
        0.075,
        0.064,
        0.064,
        skin.hex,
        12,
        2,
        0.08
      );
      // Knee-high academic socks
      addTaperedCylinder(
        tris,
        { x: lx, y: -0.56, z: 0 },
        { x: lx, y: -0.81, z: 0 },
        0.065,
        0.065,
        0.055,
        0.055,
        "#f8fafc",
        12,
        2,
        0.08
      );
    } else {
      // Full tailored trousers from hip (-0.18) down to shoe ankle (-0.81)
      addTaperedCylinder(
        tris,
        { x: lx, y: -0.18, z: 0 },
        { x: lx, y: -0.5, z: 0.01 },
        0.095,
        0.095,
        0.078,
        0.078,
        pantsColor,
        12,
        2,
        0.1
      );
      addTaperedCylinder(
        tris,
        { x: lx, y: -0.5, z: 0.01 },
        { x: lx, y: -0.81, z: 0 },
        0.078,
        0.078,
        0.064,
        0.064,
        pantsColor,
        12,
        2,
        0.1
      );
    }
  }

  // Pleated Skirt or Academic Gown Lower Robe or Pelvis/Hip
  if (isGown) {
    addTaperedCylinder(
      tris,
      { x: 0, y: -0.12, z: 0 },
      { x: 0, y: -0.68, z: 0 },
      0.23,
      0.17,
      0.31,
      0.23,
      outfit.hex,
      18,
      3,
      0.14,
      true
    );
  } else if (wearsSkirt) {
    addTaperedCylinder(
      tris,
      { x: 0, y: -0.14, z: 0 },
      { x: 0, y: -0.43, z: 0 },
      0.21,
      0.155,
      0.28,
      0.205,
      outfit.shadow,
      18,
      2,
      0.12,
      true
    );
    // Skirt accent hem stripe
    addTaperedCylinder(
      tris,
      { x: 0, y: -0.405, z: 0 },
      { x: 0, y: -0.432, z: 0 },
      0.276,
      0.202,
      0.283,
      0.208,
      accent.hex,
      18,
      1
    );
  } else {
    // Hip / Pelvis bridge
    addEllipsoid(tris, 0, -0.18, 0, 0.225, 0.09, 0.155, pantsColor, 6, 14);
  }

  // ── 3. TORSO & OUTFIT (y = -0.16 to +0.29) — Front & Back ──
  const shoulderHalfW = isFemale ? 0.235 : 0.265;
  const waistHalfW = isFemale ? 0.195 : 0.225;

  const isLabcoat = config.outfit === "labcoat";
  const torsoBaseColor = isLabcoat ? "#ffffff" : outfit.hex;

  // Main 3D Torso cylinder
  addTaperedCylinder(
    tris,
    { x: 0, y: 0.27, z: 0 },
    { x: 0, y: -0.16, z: 0 },
    shoulderHalfW,
    0.16,
    waistHalfW,
    0.145,
    torsoBaseColor,
    18,
    4,
    0.15,
    true,
    true
  );

  // Rounded Shoulder Cap Dome
  addEllipsoid(
    tris,
    0,
    0.25,
    0,
    shoulderHalfW + 0.01,
    0.075,
    0.16,
    torsoBaseColor,
    6,
    16
  );

  // Labcoat longer coat skirt (covers hips down to y = -0.42, front & back!)
  if (isLabcoat) {
    addTaperedCylinder(
      tris,
      { x: 0, y: -0.14, z: 0 },
      { x: 0, y: -0.42, z: 0 },
      waistHalfW + 0.01,
      0.152,
      waistHalfW + 0.045,
      0.175,
      "#ffffff",
      16,
      2,
      0.12
    );
    // Inner colored shirt visible on chest
    addQuad(
      tris,
      { x: -0.075, y: 0.27, z: 0.162 },
      { x: 0.075, y: 0.27, z: 0.162 },
      { x: 0.055, y: -0.16, z: 0.152 },
      { x: -0.055, y: -0.16, z: 0.152 },
      outfit.hex,
      true
    );
  }

  // Outfit-specific 3D front & back details
  if (
    config.outfit === "blazer" ||
    config.outfit === "teacher_blazer" ||
    config.outfit === "formal_suit"
  ) {
    // Crisp inner shirt V-insert on chest
    addQuad(
      tris,
      { x: -0.085, y: 0.275, z: 0.158 },
      { x: 0.085, y: 0.275, z: 0.158 },
      { x: 0.02, y: 0.02, z: 0.162 },
      { x: -0.02, y: 0.02, z: 0.162 },
      "#f8fafc",
      true
    );
    // 3D Necktie in accent color
    addQuad(
      tris,
      { x: -0.024, y: 0.24, z: 0.166 },
      { x: 0.024, y: 0.24, z: 0.166 },
      { x: 0.032, y: 0.01, z: 0.166 },
      { x: -0.032, y: 0.01, z: 0.166 },
      accent.hex,
      true
    );
    // Left & Right Lapels
    addQuad(
      tris,
      { x: -0.11, y: 0.27, z: 0.162 },
      { x: -0.06, y: 0.27, z: 0.165 },
      { x: -0.02, y: 0.0, z: 0.164 },
      { x: -0.075, y: 0.04, z: 0.162 },
      outfit.shadow,
      true
    );
    addQuad(
      tris,
      { x: 0.06, y: 0.27, z: 0.165 },
      { x: 0.11, y: 0.27, z: 0.162 },
      { x: 0.075, y: 0.04, z: 0.162 },
      { x: 0.02, y: 0.0, z: 0.164 },
      outfit.shadow,
      true
    );
    // Back tailored center vent line
    addQuad(
      tris,
      { x: -0.008, y: 0.24, z: -0.162 },
      { x: 0.008, y: 0.24, z: -0.162 },
      { x: 0.008, y: -0.15, z: -0.15 },
      { x: -0.008, y: -0.15, z: -0.15 },
      outfit.shadow,
      true
    );
  } else if (config.outfit === "hoodie") {
    // 3D Folded Hood on the BACK of the neck/shoulders (visible when rotated!)
    addEllipsoid(tris, 0, 0.255, -0.135, 0.175, 0.085, 0.095, outfit.shadow, 7, 12);
    addEllipsoid(tris, 0, 0.265, -0.125, 0.15, 0.065, 0.075, outfit.hex, 6, 10);
    // Front kangaroo pocket
    addQuad(
      tris,
      { x: -0.12, y: 0.01, z: 0.156 },
      { x: 0.12, y: 0.01, z: 0.156 },
      { x: 0.14, y: -0.12, z: 0.151 },
      { x: -0.14, y: -0.12, z: 0.151 },
      outfit.shadow,
      true
    );
    // Left & right hoodie drawstrings
    addQuad(
      tris,
      { x: -0.048, y: 0.25, z: 0.165 },
      { x: -0.034, y: 0.25, z: 0.165 },
      { x: -0.034, y: 0.09, z: 0.165 },
      { x: -0.048, y: 0.09, z: 0.165 },
      accent.hex,
      true
    );
    addQuad(
      tris,
      { x: 0.034, y: 0.25, z: 0.165 },
      { x: 0.048, y: 0.25, z: 0.165 },
      { x: 0.048, y: 0.09, z: 0.165 },
      { x: 0.034, y: 0.09, z: 0.165 },
      accent.hex,
      true
    );
  } else if (config.outfit === "academic_gown") {
    // Front & Back Academic Stole (drapes over shoulders down both chest and back!)
    for (const side of [-1, 1]) {
      const sx = side * 0.085;
      // Front stole ribbon
      addQuad(
        tris,
        { x: sx - 0.025, y: 0.27, z: 0.163 },
        { x: sx + 0.025, y: 0.27, z: 0.163 },
        { x: sx + 0.03, y: -0.36, z: 0.195 },
        { x: sx - 0.03, y: -0.36, z: 0.195 },
        accent.hex,
        true
      );
    }
    // Academic Hood Cape on the BACK
    addEllipsoid(tris, 0, 0.18, -0.155, 0.17, 0.14, 0.055, accent.hex, 7, 12);
    addEllipsoid(tris, 0, 0.19, -0.162, 0.13, 0.11, 0.05, outfit.shadow, 6, 10);
  } else if (config.outfit === "varsity" || config.outfit === "vest" || config.outfit === "cardigan") {
    // Center placket / V-trim in accent color
    addQuad(
      tris,
      { x: -0.025, y: 0.26, z: 0.163 },
      { x: 0.025, y: 0.26, z: 0.163 },
      { x: 0.025, y: -0.15, z: 0.15 },
      { x: -0.025, y: -0.15, z: 0.15 },
      accent.hex,
      true
    );
  } else {
    // Polo / Tee collar ring in accent color
    addTaperedCylinder(
      tris,
      { x: 0, y: 0.285, z: 0 },
      { x: 0, y: 0.255, z: 0 },
      0.115,
      0.11,
      0.13,
      0.125,
      accent.hex,
      14,
      1
    );
  }

  // Star Pin accessory on chest
  if (config.accessory === "star_pin") {
    addEllipsoid(tris, 0.095, 0.14, 0.165, 0.03, 0.03, 0.018, "#f59e0b", 6, 8, {
      shininess: 0.4,
    });
  }

  // ── 4. ARMS & HANDS (y = +0.24 down to -0.20) ──
  const sleeveColor =
    config.outfit === "varsity"
      ? accent.hex
      : config.outfit === "vest"
      ? "#f8fafc"
      : isLabcoat
      ? "#ffffff"
      : outfit.hex;
  const isShortSleeve = config.outfit === "tee" || config.outfit === "polo";

  for (const side of [-1, 1]) {
    const shX = side * (shoulderHalfW + 0.02);
    const elbX = side * (shoulderHalfW + 0.075);
    const handX = side * (shoulderHalfW + 0.105);

    // Shoulder joint sphere
    addEllipsoid(tris, shX, 0.22, 0, 0.068, 0.068, 0.068, sleeveColor, 6, 10);

    // Upper Arm (y = 0.22 to 0.03)
    addTaperedCylinder(
      tris,
      { x: shX, y: 0.22, z: 0 },
      { x: elbX, y: 0.03, z: 0.01 },
      0.064,
      0.064,
      0.056,
      0.056,
      sleeveColor,
      10,
      2
    );

    // Forearm (y = 0.03 to -0.15)
    addTaperedCylinder(
      tris,
      { x: elbX, y: 0.03, z: 0.01 },
      { x: handX, y: -0.15, z: 0.03 },
      0.055,
      0.055,
      0.046,
      0.046,
      isShortSleeve ? skin.hex : sleeveColor,
      10,
      2
    );

    // 3D Hand & Thumb at the end of the arm (y = -0.18)
    addEllipsoid(tris, handX, -0.185, 0.035, 0.048, 0.055, 0.048, skin.hex, 7, 10);
  }

  // ── 5. NECK, HEAD & EARS (y = +0.26 to +0.80) ──
  addTaperedCylinder(
    tris,
    { x: 0, y: 0.37, z: 0 },
    { x: 0, y: 0.26, z: 0 },
    0.075,
    0.075,
    0.085,
    0.085,
    skin.shadow,
    12,
    1
  );

  // Main 3D Head Ellipsoid
  const headCY = 0.56;
  const headRX = 0.235;
  const headRY = 0.245;
  const headRZ = 0.225;
  addEllipsoid(tris, 0, headCY, 0, headRX, headRY, headRZ, skin.hex, 14, 22, {
    shininess: 0.14,
  });

  // Left & Right 3D Ears + Earrings
  for (const side of [-1, 1]) {
    addEllipsoid(tris, side * (headRX + 0.015), headCY - 0.01, -0.01, 0.038, 0.052, 0.032, skin.hex, 6, 8);
    if (config.accessory === "earrings") {
      addEllipsoid(
        tris,
        side * (headRX + 0.022),
        headCY - 0.068,
        -0.005,
        0.018,
        0.018,
        0.018,
        "#f59e0b",
        6,
        8,
        { shininess: 0.5 }
      );
    }
  }

  // ── 6. 3D HAIRSTYLES (Front, Sides, Crown & Full Back!) ──
  const hs = config.hairStyle;
  const hairShininess = 0.26;

  if (hs === "beanie") {
    // 3D Knit Beanie Cap + Ribbed Cuff
    addEllipsoid(tris, 0, headCY + 0.05, -0.01, headRX + 0.022, headRY + 0.02, headRZ + 0.022, outfit.hex, 10, 18, {
      thetaStart: 0,
      thetaEnd: Math.PI * 0.58,
      shininess: 0.1,
    });
    // Folded beanie cuff ring
    addTaperedCylinder(
      tris,
      { x: 0, y: headCY + 0.12, z: -0.005 },
      { x: 0, y: headCY + 0.04, z: -0.005 },
      headRX + 0.028,
      headRZ + 0.026,
      headRX + 0.03,
      headRZ + 0.028,
      accent.hex,
      18,
      1
    );
    // Beanie pom-pom on top
    addEllipsoid(tris, 0, headCY + headRY + 0.06, -0.02, 0.055, 0.055, 0.055, accent.hex, 7, 10);
  } else if (hs === "grad_cap") {
    // Base hair under cap
    addEllipsoid(tris, 0, headCY + 0.01, -0.01, headRX + 0.014, headRY + 0.01, headRZ + 0.015, hair.hex, 9, 16, {
      thetaStart: 0,
      thetaEnd: Math.PI * 0.6,
      phiStart: Math.PI * 0.22,
      phiEnd: Math.PI * 1.78,
      shininess: hairShininess,
    });
    // Skull cap
    addEllipsoid(tris, 0, headCY + 0.08, 0, headRX + 0.018, headRY * 0.85, headRZ + 0.018, outfit.shadow, 8, 16, {
      thetaStart: 0,
      thetaEnd: Math.PI * 0.45,
    });
    // 3D Flat Diamond Mortarboard on top (y = headCY + 0.25)
    const capY = headCY + 0.255;
    const capR = 0.34;
    addQuad(
      tris,
      { x: 0, y: capY, z: capR },
      { x: capR, y: capY, z: 0 },
      { x: 0, y: capY, z: -capR },
      { x: -capR, y: capY, z: 0 },
      outfit.shadow,
      true,
      0.2
    );
    // Golden tassel hanging from right brim
    addTaperedCylinder(
      tris,
      { x: 0.22, y: capY - 0.01, z: 0.1 },
      { x: 0.24, y: capY - 0.16, z: 0.11 },
      0.012,
      0.012,
      0.022,
      0.022,
      "#f59e0b",
      8,
      1
    );
  } else {
    // Full 3D Cranium Hair Cap (covers top, sides & FULL back of head!)
    const isShortFade = hs === "buzz" || hs === "fade" || hs === "crop";
    const backExtent = isShortFade ? Math.PI * 0.62 : Math.PI * 0.75;

    // Back & Sides Hair Dome (phi from 0.20*PI around back PI to 1.80*PI)
    addEllipsoid(
      tris,
      0,
      headCY + 0.015,
      -0.012,
      headRX + (isShortFade ? 0.008 : 0.022),
      headRY + (isShortFade ? 0.008 : 0.022),
      headRZ + (isShortFade ? 0.01 : 0.025),
      hair.hex,
      11,
      18,
      {
        thetaStart: 0,
        thetaEnd: backExtent,
        phiStart: Math.PI * 0.18,
        phiEnd: Math.PI * 1.82,
        shininess: hairShininess,
      }
    );

    // Top Crown Cap (covers 360 around top of head above forehead)
    addEllipsoid(
      tris,
      0,
      headCY + 0.02,
      0,
      headRX + (isShortFade ? 0.01 : 0.022),
      headRY + (isShortFade ? 0.012 : 0.025),
      headRZ + (isShortFade ? 0.01 : 0.022),
      hair.hex,
      7,
      16,
      {
        thetaStart: 0,
        thetaEnd: isShortFade ? Math.PI * 0.34 : Math.PI * 0.4,
        shininess: hairShininess,
      }
    );

    // Style-specific 3D Volumes (Front Bangs, Quiffs, Buns, Ponytails, Long Back Locks, Curls, Dreads)
    if (hs === "pompadour" || hs === "textured") {
      // Swept-up 3D front quiff volume
      addEllipsoid(tris, 0, headCY + 0.23, 0.12, 0.17, 0.085, 0.13, hair.hex, 7, 12, {
        shininess: hairShininess,
      });
    } else if (hs === "bangs" || hs === "bob" || hs === "long_straight" || hs === "wavy" || hs === "twintails") {
      // Soft 3D front bangs framing the upper forehead & temples
      addEllipsoid(tris, 0, headCY + 0.15, 0.165, 0.195, 0.075, 0.09, hair.hex, 7, 12, {
        shininess: hairShininess,
      });
    }

    if (hs === "bun") {
      // High 3D Top-Back Bun + Accent Scrunchie Ring
      addTaperedCylinder(
        tris,
        { x: 0, y: headCY + 0.26, z: -0.1 },
        { x: 0, y: headCY + 0.22, z: -0.09 },
        0.09,
        0.09,
        0.095,
        0.095,
        accent.hex,
        12,
        1
      );
      addEllipsoid(tris, 0, headCY + 0.31, -0.12, 0.115, 0.11, 0.115, hair.hex, 8, 14, {
        shininess: hairShininess,
      });
    } else if (hs === "ponytail") {
      // Back Hair Tie + 3D Cascading Ponytail Plume behind the head!
      addEllipsoid(tris, 0, headCY + 0.06, -0.24, 0.055, 0.055, 0.04, accent.hex, 6, 10);
      addTaperedCylinder(
        tris,
        { x: 0, y: headCY + 0.06, z: -0.27 },
        { x: 0, y: headCY - 0.34, z: -0.31 },
        0.085,
        0.075,
        0.04,
        0.035,
        hair.hex,
        12,
        4,
        hairShininess,
        true,
        true
      );
    } else if (hs === "twintails") {
      // Left & Right 3D Twin Tails with Scrunchies
      for (const side of [-1, 1]) {
        addEllipsoid(tris, side * 0.25, headCY + 0.05, -0.06, 0.048, 0.048, 0.048, accent.hex, 6, 8);
        addTaperedCylinder(
          tris,
          { x: side * 0.28, y: headCY + 0.04, z: -0.07 },
          { x: side * 0.31, y: headCY - 0.42, z: -0.05 },
          0.075,
          0.07,
          0.038,
          0.038,
          hair.hex,
          10,
          4,
          hairShininess,
          true,
          true
        );
      }
    } else if (hs === "long_straight" || hs === "wavy") {
      // Full 3D Back Hair Curtain draping down behind the shoulders & back (`y = +0.58 down to +0.02`)
      addTaperedCylinder(
        tris,
        { x: 0, y: headCY - 0.02, z: -0.17 },
        { x: 0, y: 0.02, z: -0.21 },
        0.23,
        0.08,
        hs === "wavy" ? 0.27 : 0.245,
        0.085,
        hair.hex,
        14,
        4,
        hairShininess,
        true
      );
      // Left & Right side locks framing shoulders
      for (const side of [-1, 1]) {
        addTaperedCylinder(
          tris,
          { x: side * 0.22, y: headCY - 0.02, z: 0.03 },
          { x: side * 0.21, y: 0.14, z: 0.07 },
          0.055,
          0.055,
          0.035,
          0.035,
          hair.hex,
          8,
          3,
          hairShininess,
          true
        );
      }
    } else if (hs === "bob") {
      // Sleek 3D Chin-Length Bob wrapping sides & back of neck
      for (const side of [-1, 1]) {
        addEllipsoid(tris, side * 0.22, headCY - 0.05, 0.01, 0.06, 0.15, 0.15, hair.hex, 7, 10, {
          shininess: hairShininess,
        });
      }
    } else if (hs === "curls") {
      // Volumetric 3D Curl Clusters around crown, sides & back
      const curlOffsets: Vec3[] = [
        { x: 0, y: 0.24, z: 0.08 },
        { x: -0.14, y: 0.21, z: 0.07 },
        { x: 0.14, y: 0.21, z: 0.07 },
        { x: -0.22, y: 0.12, z: -0.02 },
        { x: 0.22, y: 0.12, z: -0.02 },
        { x: 0, y: 0.23, z: -0.12 },
        { x: -0.15, y: 0.16, z: -0.16 },
        { x: 0.15, y: 0.16, z: -0.16 },
        { x: 0, y: 0.06, z: -0.22 },
      ];
      for (const co of curlOffsets) {
        addEllipsoid(tris, co.x, headCY + co.y, co.z, 0.095, 0.09, 0.095, hair.hex, 6, 10, {
          shininess: hairShininess,
        });
      }
    } else if (hs === "dreads") {
      // 3D Cylindrical Dreadlocks around sides and back
      const angles = [0.28, 0.45, 0.65, 0.85, 1.0, 1.15, 1.35, 1.55, 1.72];
      for (const aFrac of angles) {
        const phi = aFrac * Math.PI;
        const dx = Math.sin(phi) * (headRX + 0.015);
        const dz = Math.cos(phi) * (headRZ + 0.015);
        addTaperedCylinder(
          tris,
          { x: dx, y: headCY + 0.08, z: dz },
          { x: dx * 1.12, y: headCY - 0.26, z: dz * 1.12 },
          0.036,
          0.036,
          0.028,
          0.028,
          hair.hex,
          7,
          3,
          hairShininess,
          true
        );
      }
    }
  }

  // ── 7. 3D HEADPHONES ACCESSORY (Full 3D Arch + Earcups!) ──
  if (config.accessory === "headphones") {
    for (const side of [-1, 1]) {
      addEllipsoid(tris, side * (headRX + 0.045), headCY - 0.01, 0, 0.045, 0.078, 0.068, accent.hex, 7, 12, {
        shininess: 0.35,
      });
      addEllipsoid(tris, side * (headRX + 0.03), headCY - 0.01, 0, 0.035, 0.065, 0.055, "#1e293b", 6, 10);
    }
    // Overhead headband arch
    addEllipsoid(
      tris,
      0,
      headCY + 0.03,
      0,
      headRX + 0.048,
      headRY + 0.048,
      0.038,
      accent.hex,
      6,
      16,
      { thetaStart: 0, thetaEnd: Math.PI * 0.52, shininess: 0.3 }
    );
  }

  return tris;
}

/* ── 2D Overlay for Crisp 3D-Projected Facial Expressions & Glasses ─ */

function drawFaceAndGlasses3D(
  ctx: CanvasRenderingContext2D,
  config: StudentAvatarConfig,
  project: (v: Vec3) => { x: number; y: number; z: number; scale: number },
  yaw: number,
  pitch: number
) {
  const headCY = 0.56;
  const frontNormal = rotX(rotY({ x: 0, y: 0, z: 1 }, yaw), pitch);
  if (frontNormal.z <= -0.05) return; // Looking at the back of the head!

  const alpha = Math.min(1, Math.max(0, (frontNormal.z + 0.05) / 0.35));
  ctx.save();
  ctx.globalAlpha = alpha;

  const skin = SKIN_TONES[config.skinTone] || SKIN_TONES.peach;
  const hair = HAIR_COLORS[config.hairColor] || HAIR_COLORS.midnight;

  const pLeftEye = project(rotX(rotY({ x: -0.082, y: headCY + 0.015, z: 0.218 }, yaw), pitch));
  const pRightEye = project(rotX(rotY({ x: 0.082, y: headCY + 0.015, z: 0.218 }, yaw), pitch));
  const pNose = project(rotX(rotY({ x: 0, y: headCY - 0.025, z: 0.232 }, yaw), pitch));
  const pMouth = project(rotX(rotY({ x: 0, y: headCY - 0.075, z: 0.218 }, yaw), pitch));
  const s = pNose.scale;

  // Blush or Freckles
  if (config.accessory === "blush" || config.expression === "sparkle" || config.expression === "smile") {
    for (const side of [-1, 1]) {
      const pCheek = project(rotX(rotY({ x: side * 0.125, y: headCY - 0.035, z: 0.205 }, yaw), pitch));
      ctx.fillStyle = "rgba(244, 114, 182, 0.28)";
      ctx.beginPath();
      ctx.ellipse(pCheek.x, pCheek.y, 0.036 * s, 0.022 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (config.accessory === "freckles") {
    ctx.fillStyle = skin.shadow;
    for (const side of [-1, 1]) {
      for (const dx of [-0.02, 0, 0.02]) {
        const pF = project(
          rotX(rotY({ x: side * 0.11 + dx, y: headCY - 0.025 + Math.abs(dx) * 0.3, z: 0.212 }, yaw), pitch)
        );
        ctx.beginPath();
        ctx.arc(pF.x, pF.y, Math.max(1, 0.006 * s), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // Eyebrows
  ctx.strokeStyle = hair.hex;
  ctx.lineWidth = Math.max(1.5, 0.016 * s);
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    const pB1 = project(rotX(rotY({ x: side * 0.05, y: headCY + 0.068, z: 0.212 }, yaw), pitch));
    const pB2 = project(rotX(rotY({ x: side * 0.115, y: headCY + 0.064, z: 0.204 }, yaw), pitch));
    ctx.beginPath();
    ctx.moveTo(pB1.x, pB1.y);
    ctx.lineTo(pB2.x, pB2.y);
    ctx.stroke();
  }

  // Eyes
  const eyeR = Math.max(2, 0.024 * s);
  for (const [idx, pEye] of [pLeftEye, pRightEye].entries()) {
    if (config.expression === "chill") {
      ctx.strokeStyle = "#15222e";
      ctx.lineWidth = Math.max(1.5, 0.016 * s);
      ctx.beginPath();
      ctx.arc(pEye.x, pEye.y, eyeR, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else if (config.expression === "confident" && idx === 1) {
      // Wink on right eye
      ctx.strokeStyle = "#15222e";
      ctx.lineWidth = Math.max(1.5, 0.016 * s);
      ctx.beginPath();
      ctx.arc(pEye.x, pEye.y, eyeR, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    } else {
      ctx.fillStyle = "#15222e";
      ctx.beginPath();
      ctx.arc(pEye.x, pEye.y, eyeR, 0, Math.PI * 2);
      ctx.fill();
      // Catchlight sparkle
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(pEye.x - eyeR * 0.3, pEye.y - eyeR * 0.3, eyeR * 0.36, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Subtle 3D Nose shadow
  ctx.fillStyle = skin.shadow;
  ctx.beginPath();
  ctx.arc(pNose.x, pNose.y, Math.max(1.2, 0.011 * s), 0, Math.PI * 2);
  ctx.fill();

  // Mouth
  ctx.strokeStyle = "#542828";
  ctx.lineWidth = Math.max(1.5, 0.016 * s);
  ctx.beginPath();
  if (config.expression === "curious") {
    ctx.arc(pMouth.x, pMouth.y, Math.max(2, 0.018 * s), 0, Math.PI * 2);
    ctx.stroke();
  } else {
    ctx.arc(pMouth.x, pMouth.y - 0.01 * s, Math.max(2.5, 0.036 * s), 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // 3D Glasses
  if (config.glasses && config.glasses !== "none") {
    ctx.strokeStyle = config.glasses === "wireframe" ? "#d1a355" : "#1e293b";
    ctx.lineWidth = Math.max(1.4, (config.glasses === "wireframe" ? 0.011 : 0.017) * s);
    const gR = 0.048 * s;

    for (const pEye of [pLeftEye, pRightEye]) {
      ctx.beginPath();
      if (config.glasses === "square") {
        ctx.roundRect(pEye.x - gR, pEye.y - gR * 0.8, gR * 2, gR * 1.6, 3);
      } else {
        ctx.arc(pEye.x, pEye.y, gR, 0, Math.PI * 2);
      }
      ctx.stroke();
    }
    // Bridge
    ctx.beginPath();
    ctx.moveTo(pLeftEye.x + gR, pLeftEye.y);
    ctx.lineTo(pRightEye.x - gR, pRightEye.y);
    ctx.stroke();
  }

  ctx.restore();
}

/* ── Main 3D Component ──────────────────────────────────────────── */

export function StudentAvatar3D({
  config: rawConfig,
  size = 120,
  className = "",
  showBackdrop = true,
  animate = false,
  variant = "full",
  interactive = false,
  yaw: externalYaw,
  autoRotate = false,
  onYawChange,
}: StudentAvatar3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalYaw, setInternalYaw] = useState(0);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef(0);

  const safeConfig = rawConfig || DEFAULT_AVATAR_CONFIG;
  const activeYaw = externalYaw !== undefined ? externalYaw : internalYaw;

  const updateYaw = useCallback(
    (next: number) => {
      if (onYawChange) onYawChange(next);
      else setInternalYaw(next);
    },
    [onYawChange]
  );

  // Build 3D triangle mesh whenever avatar config changes
  const meshRef = useRef<Tri3D[]>([]);
  useEffect(() => {
    meshRef.current = buildCharacterMesh(safeConfig);
  }, [safeConfig]);

  // Render loop
  useEffect(() => {
    let mounted = true;

    const renderFrame = () => {
      if (!mounted) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const rect = canvas.getBoundingClientRect();
      const w = Math.max(24, rect.width || (typeof size === "number" ? size : 120));
      const h = Math.max(24, rect.height || (typeof size === "number" ? size : 120));
      const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const backdrop = BACKDROP_THEMES[safeConfig.backdrop] || BACKDROP_THEMES.study_glow;
      const ringHex = backdrop.ringColor.startsWith("#") ? backdrop.ringColor : "#9bb4c0";
      const rimRgb = hexToRgb(ringHex);
      const isHead = variant === "head";

      // 1. Draw Aura Backdrop & 3D Floor Pedestal
      if (showBackdrop && !isHead) {
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) / 2;

        // Deep surface fill
        const isDark =
          typeof document !== "undefined" && document.documentElement.classList.contains("dark");
        ctx.fillStyle = isDark ? "#0d141b" : "#f0f4f8";
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // Radial Aura Glow
        const grad = ctx.createRadialGradient(cx, cy * 0.82, r * 0.05, cx, cy, r);
        grad.addColorStop(0, `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.52)`);
        grad.addColorStop(0.6, `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.22)`);
        grad.addColorStop(1, `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.04)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();

        // 3D Floor Turntable Platform under the feet!
        const floorY = h * 0.895;
        const floorRX = w * 0.28;
        const floorRY = h * 0.048;

        ctx.fillStyle = `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.22)`;
        ctx.beginPath();
        ctx.ellipse(cx, floorY, floorRX, floorRY, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(${rimRgb[0]}, ${rimRgb[1]}, ${rimRgb[2]}, 0.55)`;
        ctx.lineWidth = Math.max(1, w * 0.01);
        ctx.stroke();

        // Contact shadow under left & right shoes
        ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
        ctx.beginPath();
        ctx.ellipse(cx, floorY - 1, floorRX * 0.62, floorRY * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 2. Camera & Projection setup (Full Body head-to-foot vs Head closeup)
      const bobY = animate || autoRotate ? Math.sin(phaseRef.current) * 0.015 : 0;
      const pitch = 0.08;
      const fovScale = isHead ? Math.min(w, h) * 1.35 : Math.min(w, h) * 0.435;
      const centerYOffset = isHead ? h * 1.28 : h * 0.485;
      const camDist = 3.2;

      const project = (v: Vec3) => {
        const vy = v.y + bobY;
        const persp = camDist / Math.max(0.8, camDist - v.z);
        return {
          x: w / 2 + v.x * fovScale * persp,
          y: centerYOffset - vy * fovScale * persp,
          z: v.z,
          scale: fovScale * persp,
        };
      };

      // 3. Transform, Cull, Shade & Depth-Sort 3D Triangles
      const keyLight = norm3({ x: 0.42, y: 0.72, z: 0.55 });
      const fillLight = norm3({ x: -0.5, y: 0.2, z: 0.65 });
      const viewDir: Vec3 = { x: 0, y: 0, z: 1 };

      const drawList: Array<{
        p0: { x: number; y: number };
        p1: { x: number; y: number };
        p2: { x: number; y: number };
        depth: number;
        fill: string;
      }> = [];

      const tris = meshRef.current;
      for (let i = 0; i < tris.length; i++) {
        const t = tris[i];
        if (isHead && t.v0.y < 0.22 && t.v1.y < 0.22 && t.v2.y < 0.22) continue;

        const rv0 = rotX(rotY(t.v0, activeYaw), pitch);
        const rv1 = rotX(rotY(t.v1, activeYaw), pitch);
        const rv2 = rotX(rotY(t.v2, activeYaw), pitch);

        const n = norm3(cross3(sub3(rv1, rv0), sub3(rv2, rv0)));
        // Cull back-facing triangles
        if (n.z < -0.15) continue;

        const p0 = project(rv0);
        const p1 = project(rv1);
        const p2 = project(rv2);

        const ndotl = Math.max(0, dot3(n, keyLight));
        const ndotf = Math.max(0, dot3(n, fillLight));
        // Smooth studio toon/Gouraud lighting
        const lightFactor = 0.44 + ndotl * 0.48 + ndotf * 0.16;

        // Half-vector specular highlight
        const halfV = norm3({ x: keyLight.x, y: keyLight.y, z: keyLight.z + viewDir.z });
        const specRaw = Math.max(0, dot3(n, halfV));
        const spec = Math.pow(specRaw, 18) * (t.shininess ?? 0.12);

        // Rim light on silhouette edges
        const rim = Math.pow(1 - Math.max(0, n.z), 2.4) * 0.42;

        const baseRgb = hexToRgb(t.color);
        const fill = shadeRgb(baseRgb, lightFactor, spec, rim, rimRgb);
        const depth = (rv0.z + rv1.z + rv2.z) / 3;

        drawList.push({ p0, p1, p2, depth, fill });
      }

      drawList.sort((a, b) => a.depth - b.depth);

      // 4. Rasterize sorted 3D mesh
      for (let i = 0; i < drawList.length; i++) {
        const d = drawList[i];
        ctx.fillStyle = d.fill;
        ctx.strokeStyle = d.fill;
        ctx.lineWidth = 0.65;
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(d.p0.x, d.p0.y);
        ctx.lineTo(d.p1.x, d.p1.y);
        ctx.lineTo(d.p2.x, d.p2.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 5. Project 3D Face & Glasses onto the front hemisphere of the head
      drawFaceAndGlasses3D(ctx, safeConfig, project, activeYaw, pitch);

      ctx.restore();

      if (autoRotate && !draggingRef.current) {
        phaseRef.current += 0.04;
        updateYaw((activeYaw + 0.018) % (Math.PI * 2));
        animFrameRef.current = requestAnimationFrame(renderFrame);
      } else if (animate) {
        phaseRef.current += 0.045;
        animFrameRef.current = requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      mounted = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [safeConfig, size, showBackdrop, animate, variant, activeYaw, autoRotate, updateYaw]);

  return (
    <div
      style={{ width: size, height: size }}
      onPointerDown={(e) => {
        if (!interactive) return;
        draggingRef.current = true;
        lastXRef.current = e.clientX;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!interactive || !draggingRef.current) return;
        const dx = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        updateYaw(activeYaw + dx * 0.016);
      }}
      onPointerUp={() => {
        draggingRef.current = false;
      }}
      onPointerCancel={() => {
        draggingRef.current = false;
      }}
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        variant === "head" ? "" : "overflow-hidden rounded-full"
      } ${interactive ? "cursor-grab active:cursor-grabbing touch-none" : ""} ${className}`}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
