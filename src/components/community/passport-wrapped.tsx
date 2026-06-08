"use client";

/**
 * Passport "Wrapped" — a warm, derived year-in-review.
 *
 * A celebratory recap built purely from the member's passport, earned
 * badges, and tenure (see buildWrapped in game-data.ts). Self-only,
 * collapsed by default behind a tappable hero so it never dominates the
 * profile. Honest empty state when there's nothing to celebrate yet —
 * an invitation, not a guilt trip.
 *
 * No competition, no comparison: it's *her* year, told back to her.
 */

import { useMemo, useState } from "react";
import { Sparkles, ChevronDown } from "lucide-react";
import { buildWrapped, stampFlag, type PassportStamp } from "@/lib/game-data";
import { cn } from "@/lib/utils";

interface PassportWrappedProps {
  stamps: PassportStamp[];
  earnedBadgeCount: number;
  joinedDate?: string;
}

export function PassportWrapped({
  stamps,
  earnedBadgeCount,
  joinedDate,
}: PassportWrappedProps) {
  const wrapped = useMemo(
    () => buildWrapped(stamps, earnedBadgeCount, joinedDate),
    [stamps, earnedBadgeCount, joinedDate],
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="overflow-hidden rounded-2xl">
      {/* Hero / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex w-full items-center gap-3 overflow-hidden bg-gradient-to-r from-[#FF0099] to-[#B51760] px-4 py-3.5 text-left text-white"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/20 text-lg backdrop-blur-sm">
          <Sparkles className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold leading-tight">
            {wrapped.empty ? "Your Travel Wrapped" : `Your ${wrapped.year} Wrapped`}
          </span>
          <span className="block truncate text-xs text-white/85">
            {wrapped.empty ? "A recap of your journey so far" : wrapped.headline}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="glass-strong border-t border-rosa/20 p-4">
          <p className="text-center text-sm font-medium text-foreground/80">
            {wrapped.subhead}
          </p>

          {/* Stat tiles */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {wrapped.stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-rosa/20 bg-card/60 p-3 text-center"
              >
                <div className="text-xl" aria-hidden>
                  {stat.emoji}
                </div>
                <div className="mt-0.5 text-lg font-bold leading-none text-gradient-brand">
                  {stat.value}
                </div>
                <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Countries */}
          {wrapped.countries.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Places that became part of your story
              </p>
              <div className="flex flex-wrap gap-1.5">
                {wrapped.countries.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-foreground/80"
                  >
                    <span aria-hidden>{stampFlag(c)}</span>
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Featured stamps */}
          {wrapped.topStamps.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Highlights
              </p>
              <div className="flex flex-wrap gap-2">
                {wrapped.topStamps.map((s) => (
                  <span
                    key={s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-card/70 px-2.5 py-1.5 text-xs font-medium text-foreground/80 ring-1 ring-foreground/10"
                  >
                    <span aria-hidden>{s.emoji}</span>
                    {s.label}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
