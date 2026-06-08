"use client";

import { useReducedMotion } from "framer-motion";

const WORDS = [
  "connect",
  "empower",
  "celebrate",
  "latina travel",
  "amigas y más social",
  "sisterhood",
  "group trips",
  "latina community",
  "memories",
  "growth",
  "family",
  "cultura",
  "aventura",
  "hermandad",
];

export function Marquee() {
  const prefersReducedMotion = useReducedMotion();

  const track = WORDS.map((w) => (
    <span key={w} className="flex items-center gap-5">
      <span className="text-xs sm:text-sm font-extrabold uppercase tracking-[0.28em] text-[#6A1B4D]">{w}</span>
      <span className="text-[#FF0099] text-base leading-none" aria-hidden="true">♡</span>
    </span>
  ));

  return (
    <div
      className="relative overflow-hidden border-y border-[#FACDE8]/60 bg-[#FFF7FB] py-3.5"
      aria-hidden="true"
    >
      {/* Left / right edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#FFF7FB] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#FFF7FB] to-transparent" />
      {prefersReducedMotion ? (
        // No infinite motion when the visitor opts out — show a single static,
        // centered, wrapping row instead of the scrolling track.
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6">
          {track}
        </div>
      ) : (
        <div className="flex w-max animate-[marquee_30s_linear_infinite] gap-5">
          {track}
          {track}
        </div>
      )}
    </div>
  );
}
