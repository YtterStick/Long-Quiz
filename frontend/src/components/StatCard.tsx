"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "tan" | "steel" | "sage" | "cream" | "burgundy";
  badge?: string;
}

export function StatCard({ title, value, subtitle, icon: Icon, color = "steel", badge }: StatCardProps) {
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
      className={`relative overflow-hidden glass-card glass-card-hover flex items-center justify-between rounded-[24px] p-5.5 border border-border-default transition-all duration-300 ${style.glow}`}
    >
      {/* Subtle decorative corner accent */}
      <div className={`pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full ${style.bg} blur-xl opacity-60`} />

      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{title}</p>
          {badge && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${style.bg} ${style.text} border ${style.border}`}>
              {badge}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 text-2xl sm:text-3xl font-black tracking-tight text-text-primary">{value}</h3>
        {subtitle && <p className="mt-1 text-xs text-text-muted font-medium">{subtitle}</p>}
      </div>

      <div className={`relative z-10 flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border shadow-sm transition-transform duration-300 group-hover:scale-110 ${style.bg} ${style.text} ${style.border}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}
