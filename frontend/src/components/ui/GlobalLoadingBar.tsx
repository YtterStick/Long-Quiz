"use client";

import React, { useEffect, useState, useRef } from "react";
import { subscribeToNetworkActivity } from "@/lib/api";
import { Loader2 } from "lucide-react";

export function GlobalLoadingBar() {
  const [activeCount, setActiveCount] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showSlowNetworkBadge, setShowSlowNetworkBadge] = useState(false);
  const trickleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null);
  const completeTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToNetworkActivity((count) => {
      setActiveCount(count);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (activeCount > 0) {
      if (completeTimerRef.current) clearTimeout(completeTimerRef.current);
      setVisible(true);

      // Start progress from current or 25%
      setProgress((prev) => (prev === 0 ? 25 : prev));

      // Trickle progress slowly toward 85%
      if (!trickleTimerRef.current) {
        trickleTimerRef.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 85) return prev;
            const diff = 85 - prev;
            return prev + Math.max(0.6, diff * 0.1);
          });
        }, 180);
      }

      // If request takes longer than 500ms, show slow network indicator
      if (!slowTimerRef.current) {
        slowTimerRef.current = setTimeout(() => {
          setShowSlowNetworkBadge(true);
        }, 500);
      }
    } else {
      // Completed!
      if (trickleTimerRef.current) {
        clearInterval(trickleTimerRef.current);
        trickleTimerRef.current = null;
      }
      if (slowTimerRef.current) {
        clearTimeout(slowTimerRef.current);
        slowTimerRef.current = null;
      }
      setShowSlowNetworkBadge(false);

      if (visible) {
        setProgress(100);
        completeTimerRef.current = setTimeout(() => {
          setVisible(false);
          setProgress(0);
        }, 320);
      }
    }

    return () => {
      if (trickleTimerRef.current) clearInterval(trickleTimerRef.current);
    };
  }, [activeCount, visible]);

  if (!visible && progress === 0) return null;

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 z-9999 pointer-events-none h-0.75 bg-transparent"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      >
        <div
          className="h-full bg-linear-to-r from-steel via-cyan-400 to-amber-400 relative transition-all ease-out"
          style={{
            width: `${progress}%`,
            transitionDuration: progress === 100 ? "180ms" : "250ms",
            boxShadow: "0 0 10px rgba(56, 189, 248, 0.7), 0 0 5px rgba(245, 158, 11, 0.5)",
          }}
        >
          {/* Glowing pulse head on right edge */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-3 bg-white/60 blur-xs rounded-full pointer-events-none" />
        </div>
      </div>

      {showSlowNetworkBadge && (
        <div className="fixed top-3 right-4 z-9999 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 rounded-full border border-steel/30 bg-[#141d26]/90 backdrop-blur-md px-3.5 py-1.5 text-[11px] font-semibold text-text-primary shadow-xl">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-steel" />
            <span className="text-text-secondary">Syncing with server...</span>
          </div>
        </div>
      )}
    </>
  );
}
