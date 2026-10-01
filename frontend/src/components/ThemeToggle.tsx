"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/lib/theme-context";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`h-9 w-9 rounded-xl border border-border-default bg-surface-subtle/50 ${className}`}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex items-center justify-center gap-2 rounded-xl border border-border-default bg-surface-overlay p-2 text-xs font-medium text-text-secondary shadow-sm hover:border-border-emphasis hover:bg-surface-subtle hover:text-text-primary transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-steel/30 ${className}`}
    >
      <div className="relative flex h-5 w-5 items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-cream transition-transform duration-300 rotate-0 scale-100" />
        ) : (
          <Moon className="h-4 w-4 text-steel transition-transform duration-300 rotate-0 scale-100" />
        )}
      </div>
      {showLabel && (
        <span className="text-xs font-semibold">
          {isDark ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
