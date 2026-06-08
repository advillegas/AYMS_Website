"use client";

/**
 * Milestones & Badges shelf.
 *
 * Shows the full badge catalog: earned badges get a glass card with the
 * badge's gradient and a celebratory glow; locked badges are greyscale
 * with a clear "how to earn" line. Recognition-first — there are no
 * points, no ranks, no comparison to other members. Works on both the
 * self profile and other members' profiles (read-only).
 *
 * Earning logic + persistence lives in use-badges.ts. This is purely
 * presentation over the items it's handed.
 */

import { Lock, Award } from "lucide-react";
import type { BadgeShelfItem } from "@/lib/use-badges";
import { cn } from "@/lib/utils";

interface BadgeShelfProps {
  items: BadgeShelfItem[];
  /** Whether this is the signed-in member's own shelf (copy tweaks). */
  isSelf: boolean;
  /** Display name for the empty/other-member copy. */
  name?: string;
}

export function BadgeShelf({ items, isSelf, name }: BadgeShelfProps) {
  const earned = items.filter((i) => i.earned);
  const locked = items.filter((i) => !i.earned);

  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand">
          <Award className="h-3.5 w-3.5 text-primary" />
          Milestones
        </h2>
        <span className="text-xs text-muted-foreground">
          {earned.length > 0
            ? `${earned.length} of ${items.length} earned`
            : isSelf
              ? "Start your collection below"
              : `${name ?? "She"} hasn't earned badges yet`}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {/* Earned first */}
        {earned.map((item) => (
          <div
            key={item.def.id}
            className="group glass-strong elevate-2 glow-pink relative overflow-hidden rounded-2xl p-3 text-center"
          >
            <div
              className={cn(
                "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-15",
                item.def.gradient,
              )}
            />
            <div className="relative">
              <div
                className={cn(
                  "mx-auto mb-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-xl shadow-[0_4px_14px_rgb(255_0_153/0.3)]",
                  item.def.gradient,
                )}
              >
                <span aria-hidden>{item.def.emoji}</span>
              </div>
              <p className="text-xs font-bold leading-tight text-foreground">
                {item.def.title}
              </p>
              <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                {item.def.description}
              </p>
            </div>
          </div>
        ))}

        {/* Locked */}
        {locked.map((item) => (
          <div
            key={item.def.id}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted/40 p-3 text-center"
          >
            <div className="mx-auto mb-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-foreground/5 text-xl grayscale">
              <span aria-hidden className="opacity-50">
                {item.def.emoji}
              </span>
            </div>
            <p className="flex items-center justify-center gap-1 text-xs font-semibold leading-tight text-foreground/55">
              <Lock className="h-2.5 w-2.5" />
              {item.def.title}
            </p>
            <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {isSelf ? item.def.howToEarn : "Not earned yet"}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
