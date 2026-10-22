"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
  compact?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  itemLabel = "items",
  className = "",
  compact = false,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const validTotalPages = Math.max(1, totalPages);
  const activePage = Math.min(Math.max(1, currentPage), validTotalPages);
  const startItem = Math.min(totalItems, (activePage - 1) * pageSize + 1);
  const endItem = Math.min(totalItems, activePage * pageSize);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    if (validTotalPages <= 7) {
      return Array.from({ length: validTotalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis-start" | "ellipsis-end")[] = [1];
    if (activePage > 3) {
      pages.push("ellipsis-start");
    }
    const start = Math.max(2, activePage - 1);
    const end = Math.min(validTotalPages - 1, activePage + 1);
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    if (activePage < validTotalPages - 2) {
      pages.push("ellipsis-end");
    }
    if (validTotalPages > 1) {
      pages.push(validTotalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-3 py-3 border-t border-border-default/60 text-xs text-text-secondary ${className}`}
    >
      {/* Left: Item Counter & Page Size Selector */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-text-muted">
          Showing{" "}
          <span className="font-semibold text-text-primary">
            {startItem}-{endItem}
          </span>{" "}
          of{" "}
          <span className="font-semibold text-text-primary">{totalItems}</span>{" "}
          {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-text-muted">
            <span className="text-[11px]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                onPageSizeChange(Number(e.target.value));
                onPageChange(1);
              }}
              className="bg-surface-raised border border-border-default rounded-md px-2 py-0.5 text-xs text-text-primary focus:outline-none focus:border-steel cursor-pointer transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation Controls */}
      {validTotalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          {!compact && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={activePage === 1}
              className="p-1.5 rounded-lg border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="First Page"
              aria-label="First Page"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, activePage - 1))}
            disabled={activePage === 1}
            className="p-1.5 rounded-lg border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>

          {/* Page Indicator on Mobile or Compact */}
          <span className="sm:hidden text-xs text-text-muted px-2">
            {activePage} / {validTotalPages}
          </span>

          {/* Page Number Buttons (Hidden on small mobile, visible on sm+) */}
          <div className="hidden sm:flex items-center gap-1">
            {pageNumbers.map((p, idx) => {
              if (p === "ellipsis-start" || p === "ellipsis-end") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-1 text-text-muted select-none"
                  >
                    ...
                  </span>
                );
              }
              const isCurrent = p === activePage;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPageChange(p)}
                  className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-steel text-white shadow-xs font-bold"
                      : "border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle hover:text-text-primary"
                  }`}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(Math.min(validTotalPages, activePage + 1))}
            disabled={activePage === validTotalPages}
            className="p-1.5 rounded-lg border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          {/* Last Page */}
          {!compact && (
            <button
              type="button"
              onClick={() => onPageChange(validTotalPages)}
              disabled={activePage === validTotalPages}
              className="p-1.5 rounded-lg border border-border-default bg-surface-raised text-text-secondary hover:bg-surface-subtle hover:text-text-primary disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
              title="Last Page"
              aria-label="Last Page"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
