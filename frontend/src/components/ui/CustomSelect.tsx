"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export interface CustomSelectOption {
  value: string;
  label: string;
  badge?: string;
  sublabel?: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CustomSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  id?: string;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuClassName = "",
  id,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation & Escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
        if (options[nextIndex]) onChange(options[nextIndex].value);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        const currentIndex = options.findIndex((opt) => opt.value === value);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
        if (options[prevIndex]) onChange(options[prevIndex].value);
      } else if (event.key === "Enter") {
        event.preventDefault();
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, options, value, onChange]);

  // Calculate opening direction based on available screen space
  const handleToggle = () => {
    if (disabled) return;
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      // If less than 240px below and more room above, open upward
      if (spaceBelow < 240 && spaceAbove > spaceBelow) {
        setOpenUpward(true);
      } else {
        setOpenUpward(false);
      }
    }
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full text-left ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        id={id}
        onClick={handleToggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-2 rounded-xl border border-border-emphasis bg-surface-subtle px-3.5 py-2.5 text-xs text-text-primary transition-all duration-150 cursor-pointer focus:outline-none focus:border-steel focus:ring-1 focus:ring-steel/30 hover:border-steel/50 hover:bg-surface-muted/60 disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? "border-steel ring-1 ring-steel/30 bg-surface-muted/70" : ""
        } ${buttonClassName}`}
      >
        <span className="truncate flex items-center gap-2">
          {selectedOption ? (
            <>
              <span className="font-medium text-text-primary">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="rounded bg-steel/15 px-1.5 py-0.5 text-[10px] font-semibold text-steel-light border border-steel/20">
                  {selectedOption.badge}
                </span>
              )}
            </>
          ) : (
            <span className="text-text-muted">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-200 ${
            isOpen ? "rotate-180 text-steel-light" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute left-0 z-50 w-full min-w-50 overflow-hidden rounded-xl border border-border-emphasis bg-surface-overlay/95 backdrop-blur-xl shadow-2xl p-1.5 transition-all animate-in fade-in zoom-in-95 duration-100 ${
            openUpward ? "bottom-full mb-1.5" : "top-full mt-1.5"
          } ${menuClassName}`}
        >
          <div className="max-h-60 overflow-y-auto space-y-0.5 overscroll-contain pr-0.5">
            {options.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-muted text-center italic">
                No options available
              </div>
            ) : (
              options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(opt.value)}
                    className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                      isSelected
                        ? "bg-steel/15 text-steel-light font-semibold"
                        : "text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
                    }`}
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{opt.label}</span>
                        {opt.badge && (
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-normal ${
                              isSelected
                                ? "bg-steel/25 text-steel-light"
                                : "bg-surface-subtle text-text-muted group-hover:text-text-secondary"
                            }`}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </div>
                      {opt.sublabel && (
                        <span className="text-[10px] text-text-muted truncate mt-0.5">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-steel-light" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
