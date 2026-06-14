"use client";

import { useReducedMotion } from "framer-motion";
import { useMarqueeContent } from "@/lib/use-site-content";

export function Marquee() {
  const prefersReducedMotion = useReducedMotion();
  const { words } = useMarqueeContent();

  const track = words.map((w) => (
    <span key={w} className="flex items-center gap-6">
      <span className="font-display text-lg italic tracking-tight text-white sm:text-xl">
        {w}
      </span>
      <span className="text-[#FACDE8] text-sm leading-none" aria-hidden="true">
        ✺
      </span>
    </span>
  ));

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-r from-[var(--brand-pink)] via-[var(--magenta)] to-[var(--brand-pink)] py-4"
      aria-hidden="true"
    >
      {/* Left / right edge fades into the magenta band */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-[var(--brand-pink)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-[var(--brand-pink)] to-transparent" />
      {prefersReducedMotion ? (
        // No infinite motion when the visitor opts out — show a single static,
        // centered, wrapping row instead of the scrolling track.
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 px-6">
          {track}
        </div>
      ) : (
        <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-6">
          {track}
          {track}
        </div>
      )}
    </div>
  );
}
