"use client";

/**
 * Profile Completeness "Journey Ring".
 *
 * A gradient progress ring + a warm "Finish your intro" checklist.
 * Self-only — it's a gentle nudge to fill in your profile so the
 * community gets to know you. Recognition-first: at 100% it celebrates
 * ("You're all set!") rather than ever scolding incomplete profiles.
 *
 * Pure scoring lives in profile-completeness.ts; this component is the
 * presentation + the "jump to edit" affordance.
 */

import { useMemo } from "react";
import { Check, Sparkles } from "lucide-react";
import { getProfileCompleteness } from "@/lib/profile-completeness";
import type { User } from "@/lib/store";
import { cn } from "@/lib/utils";

interface JourneyRingProps {
  profile: User;
  /** Called when the member taps "Finish your intro" (opens edit mode). */
  onEdit?: () => void;
  className?: string;
}

export function JourneyRing({ profile, onEdit, className }: JourneyRingProps) {
  const result = useMemo(() => getProfileCompleteness(profile), [profile]);
  const { percent, steps, remaining, complete } = result;

  // SVG ring geometry.
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (percent / 100) * circ;

  return (
    <div
      className={cn(
        "glass elevate-2 rounded-2xl p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        {/* Ring */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            <defs>
              <linearGradient id="journey-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FF0099" />
                <stop offset="100%" stopColor="#B51760" />
              </linearGradient>
            </defs>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="currentColor"
              strokeWidth={stroke}
              className="text-rosa/20"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="url(#journey-ring-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${dash} ${circ}`}
              className="transition-[stroke-dasharray] duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold leading-none text-gradient-brand">
              {percent}%
            </span>
          </div>
        </div>

        {/* Copy */}
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {complete ? "You're all set!" : "Finish your intro"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {complete
              ? "Your profile is complete — the community knows the real you. 💕"
              : "A complete profile helps amigas connect with you."}
          </p>
        </div>
      </div>

      {/* Checklist of remaining steps (hidden once complete) */}
      {!complete && remaining.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {remaining.slice(0, 4).map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={onEdit}
              className="flex w-full items-center gap-2 rounded-lg border border-rosa/20 bg-card/60 px-3 py-2 text-left text-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="text-sm" aria-hidden>
                {s.emoji}
              </span>
              <span className="flex-1 font-medium text-foreground/80">
                {s.label}
              </span>
              <span className="text-[10px] font-semibold text-primary">
                +{s.weight}%
              </span>
            </button>
          ))}
          {remaining.length > 4 && (
            <p className="pl-1 pt-1 text-[10px] text-muted-foreground">
              and {remaining.length - 4} more…
            </p>
          )}
        </div>
      )}

      {/* Completed-step recap when fully done */}
      {complete && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {steps.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-foreground/70"
            >
              <Check className="h-2.5 w-2.5 text-primary" />
              {s.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
