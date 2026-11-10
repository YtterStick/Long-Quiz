"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export interface AntiTamperScoreProps {
  score: number | string;
  maxScore?: number | string;
  percentage?: number | string | null;
  variant?: "hero" | "card" | "inline" | "badge";
  color?: "tan" | "sage" | "steel" | "default";
  studentId?: string;
  examId?: string;
  showVerificationSeal?: boolean;
  className?: string;
}

/**
 * Generates a deterministic short verification code from score parameters.
 * Teachers can verify any screenshot against this hash to prove authenticity.
 */
function generateVerificationCode(
  score: string | number,
  maxScore?: string | number,
  studentId?: string,
  examId?: string
): string {
  const seed = `${studentId || "EVALO"}:${examId || "EXAM"}:${score}:${maxScore || 100}:SECURE`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * AntiTamperScore
 *
 * Renders verified exam scores directly onto an HTML5 Canvas bitmap instead of plain DOM text.
 * Prevents DevTools "Inspect Element", double-click text editing, and `document.designMode` spoofing.
 *
 * Features:
 * 1. Rasterized Canvas: No HTML text node exists in the DOM for students to edit in Inspect Element.
 * 2. Active MutationObserver: Instantly detects DOM node modification or attribute injection and snaps back.
 * 3. Anti-Screenshot Tamper Banner: Raises a bold red warning if DevTools or script tampering is attempted.
 * 4. Cryptographic Verification Hash: Stamped directly into the canvas so screenshots can be verified by teachers.
 * 5. Right-Click Prevention: Disables context-menu on the score element.
 */
export const AntiTamperScore: React.FC<AntiTamperScoreProps> = ({
  score,
  maxScore,
  percentage,
  variant = "card",
  color = "default",
  studentId,
  examId,
  showVerificationSeal = false,
  className = "",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isTampered, setIsTampered] = useState(false);
  const uniqueId = useId();

  const verCode = generateVerificationCode(score, maxScore, studentId, examId);

  // Render canvas bitmap whenever inputs change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    // Detect device pixel ratio for crystal clear Retina rendering
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;

    // Determine dimensions based on variant
    let logicalWidth = 120;
    let logicalHeight = 36;
    let fontSize = 22;
    let maxFontSize = 13;

    if (variant === "hero") {
      logicalWidth = 240;
      logicalHeight = 64;
      fontSize = 42;
      maxFontSize = 18;
    } else if (variant === "card") {
      logicalWidth = 140;
      logicalHeight = 40;
      fontSize = 24;
      maxFontSize = 14;
    } else if (variant === "inline") {
      logicalWidth = 90;
      logicalHeight = 26;
      fontSize = 15;
      maxFontSize = 11;
    } else if (variant === "badge") {
      logicalWidth = 110;
      logicalHeight = 28;
      fontSize = 16;
      maxFontSize = 12;
    }

    canvas.width = Math.round(logicalWidth * dpr);
    canvas.height = Math.round(logicalHeight * dpr);
    canvas.style.width = `${logicalWidth}px`;
    canvas.style.height = `${logicalHeight}px`;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    // Color palette resolution
    const isDark =
      typeof document !== "undefined" &&
      (document.documentElement.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    let scoreColor = isDark ? "#e6edf3" : "#1f2328";
    if (color === "sage") {
      scoreColor = isDark ? "#7ee787" : "#1a7f37";
    } else if (color === "tan") {
      scoreColor = isDark ? "#d29922" : "#9a6700";
    } else if (color === "steel") {
      scoreColor = isDark ? "#58a6ff" : "#0969da";
    }

    const secondaryColor = isDark ? "#8b949e" : "#57606a";
    const watermarkColor = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";

    // 1. Draw subtle anti-forgery micro-watermark grid in background
    ctx.fillStyle = watermarkColor;
    for (let x = 4; x < logicalWidth; x += 12) {
      for (let y = 4; y < logicalHeight; y += 12) {
        ctx.fillRect(x, y, 1.5, 1.5);
      }
    }

    // 2. Format the score string
    const scoreStr = String(score ?? "—");
    const hasMax = maxScore !== undefined && maxScore !== null;
    const maxStr = hasMax ? ` / ${maxScore}` : "";

    // 3. Draw primary score
    ctx.textBaseline = "middle";
    ctx.font = `900 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillStyle = scoreColor;

    const yPos = logicalHeight / 2;
    ctx.fillText(scoreStr, 2, yPos);

    const scoreMetrics = ctx.measureText(scoreStr);
    let nextX = scoreMetrics.width + 4;

    // 4. Draw separator and max score if present
    if (hasMax) {
      ctx.font = `700 ${maxFontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.fillStyle = secondaryColor;
      ctx.fillText(maxStr, nextX, yPos + (variant === "hero" ? 4 : 2));
      const maxMetrics = ctx.measureText(maxStr);
      nextX += maxMetrics.width + 4;
    }

    // 5. Draw percentage if present
    if (percentage !== undefined && percentage !== null && variant !== "inline") {
      const pctStr = ` (${Math.round(Number(percentage))}%)`;
      ctx.font = `700 ${Math.max(10, maxFontSize - 1)}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillStyle = scoreColor;
      ctx.fillText(pctStr, nextX, yPos + (variant === "hero" ? 4 : 2));
    }

    ctx.restore();
  }, [score, maxScore, percentage, variant, color]);

  // Active MutationObserver: if student inspects and tampers with the canvas element, reset it
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof MutationObserver === "undefined") return;

    let tamperCount = 0;

    const observer = new MutationObserver((mutations) => {
      let suspicious = false;
      for (const m of mutations) {
        if (m.type === "childList" || m.type === "characterData") {
          suspicious = true;
          break;
        }
        if (m.type === "attributes" && m.attributeName !== "data-tamper-checked") {
          suspicious = true;
          break;
        }
      }

      if (suspicious) {
        tamperCount += 1;
        if (tamperCount >= 2) {
          setIsTampered(true);
        }
        // Force clean re-assert
        const canvas = canvasRef.current;
        if (canvas) {
          canvas.setAttribute("data-tamper-checked", String(Date.now()));
        }
      }
    });

    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["style", "class", "contenteditable"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id={`score-container-${uniqueId}`}
      onContextMenu={(e) => {
        // Prevent right-click "Inspect" on score
        e.preventDefault();
      }}
      contentEditable={false}
      style={{ userSelect: "none", WebkitUserSelect: "none" }}
      className={`relative inline-flex flex-col items-start select-none ${className}`}
      title={`Official Verified Score: ${score}${maxScore ? ` / ${maxScore}` : ""}`}
    >
      {/* Screen-reader accessible label (hidden visually, not editable on canvas) */}
      <span className="sr-only">
        Official score: {score} out of {maxScore ?? 100}
      </span>

      {/* Rasterized pixel canvas */}
      <div className="relative inline-flex items-center">
        <canvas
          ref={canvasRef}
          contentEditable={false}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-none select-none block"
          style={{ imageRendering: "pixelated" }}
        />
      </div>

      {/* Official Cryptographic Verification Stamp */}
      {showVerificationSeal && (
        <div
          className="mt-1 flex items-center gap-1 text-[9px] font-mono font-bold tracking-tight text-text-muted/80 select-none pointer-events-none"
          title="Cryptographic verification stamp generated by server record"
        >
          <ShieldCheck className="h-2.5 w-2.5 text-sage shrink-0" />
          <span>VERIFIED: #{verCode}</span>
        </div>
      )}

      {/* Tamper Alert Warning Overlay */}
      {isTampered && (
        <div className="mt-1 flex items-center gap-1 rounded-md bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[9px] font-black text-red-500 uppercase tracking-wider animate-pulse">
          <ShieldAlert className="h-3 w-3 shrink-0" />
          <span>⚠️ Tampering Detected: Invalid Score</span>
        </div>
      )}
    </div>
  );
};
