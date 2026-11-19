"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "tan" | "steel" | "sage" | "cream" | "burgundy";
  compact?: boolean;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = "steel", compact = false }: StatCardProps) {
  const colorMap = {
    tan: {
      bg: "bg-tan-ghost",
      text: "text-tan",
      border: "border-tan-border",
      glow: "hover:shadow-tan/10",
      accent: "bg-tan",
    },
    steel: {
      bg: "bg-steel-ghost",
      text: "text-steel",
      border: "border-steel-border",
      glow: "hover:shadow-steel/10",
      accent: "bg-steel",
    },
    sage: {
      bg: "bg-sage-ghost",
      text: "text-sage",
      border: "border-sage-border",
      glow: "hover:shadow-sage/10",
      accent: "bg-sage",
    },
    cream: {
      bg: "bg-cream-ghost",
      text: "text-cream",
      border: "border-cream-border",
      glow: "hover:shadow-cream/10",
      accent: "bg-cream",
    },
    burgundy: {
      bg: "bg-burgundy-ghost",
      text: "text-burgundy-light",
      border: "border-burgundy-border",
      glow: "hover:shadow-burgundy/10",
      accent: "bg-burgundy",
    },
  };

  const style = colorMap[color];

  return (
    <div
      className={`relative overflow-hidden glass-card glass-card-hover flex items-center justify-between border border-border-default transition-all duration-300 ${style.glow} ${
        compact ? "rounded-2xl p-3.5 sm:p-4" : "rounded-3xl p-5.5"
      }`}
    >
      {/* Subtle decorative corner accent */}
      <div className={`pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full ${style.bg} blur-xl opacity-60`} />

      <div className="relative z-10 min-w-0">
        <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider truncate">{title}</p>
        <h3 className={`font-black tracking-tight text-text-primary ${compact ? "mt-0.5 text-xl sm:text-2xl" : "mt-1.5 text-2xl sm:text-3xl"}`}>
          {value}
        </h3>
        {subtitle && (
          <p className={`text-text-muted font-medium truncate ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-xs"}`}>
            {subtitle}
          </p>
        )}
      </div>

      <div
        className={`relative z-10 flex shrink-0 items-center justify-center border shadow-sm transition-transform duration-300 group-hover:scale-110 ${style.bg} ${style.text} ${style.border} ${
          compact ? "h-10 w-10 rounded-xl" : "h-13 w-13 rounded-2xl"
        }`}
      >
        <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
    </div>
  );
}
