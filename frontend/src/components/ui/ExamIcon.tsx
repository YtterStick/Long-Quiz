import React from "react";

export function ExamIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="4" y="3" width="16" height="18" rx="3" ry="3" />
      <line x1="8" y1="7" x2="11" y2="7" />
      <line x1="8" y1="11" x2="11" y2="11" />
      <line x1="8" y1="15" x2="11" y2="15" />
      <circle cx="15" cy="7" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="15" r="1" fill="currentColor" />
    </svg>
  );
}
