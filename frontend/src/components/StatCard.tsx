"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color?: "tan" | "steel" | "sage" | "cream" | "burgundy";
}

export function StatCard({ title, value, subtitle, icon: Icon, color = "steel" }: StatCardProps) {
  const colorMap = {
    tan: {
      bg: "bg-tan-ghost",
      text: "text-tan",
      border: "border-tan-border",
      glow: "hover:shadow-tan/5",
    },
    steel: {
      bg: "bg-steel-ghost",
      text: "text-steel",
      border: "border-steel-border",
      glow: "hover:shadow-steel/5",
    },
    sage: {
      bg: "bg-sage-ghost",
      text: "text-sage",
      border: "border-sage-border",
      glow: "hover:shadow-sage/5",
    },
    cream: {
      bg: "bg-cream-ghost",
      text: "text-cream",
      border: "border-cream-border",
      glow: "hover:shadow-cream/5",
    },
    burgundy: {
      bg: "bg-burgundy-ghost",
      text: "text-burgundy-light",
      border: "border-burgundy-border",
      glow: "hover:shadow-burgundy/5",
    },
  };

  const style = colorMap[color];

  return (
    <div
      className={`glass-card glass-card-hover flex items-center justify-between rounded-2xl p-5 ${style.glow}`}
    >
      <div>
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">{title}</p>
        <h3 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">{value}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-text-faint">{subtitle}</p>}
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${style.bg} ${style.text} ${style.border}`}>
        <Icon className="h-6 w-6" />
      </div>
    </div>
  );
}
