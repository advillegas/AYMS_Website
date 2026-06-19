"use client";

import { useEffect, useState } from "react";
import { formatDraftAge } from "@/lib/use-form-draft";
import { History, RotateCcw, X } from "lucide-react";

interface Props {
  savedAt: number | null;
  onRestore: () => void;
  onDiscard: () => void;
  /** What was being drafted, e.g. "trip", "event". */
  label?: string;
}

/**
 * Restore prompt shown at the top of a form when a recoverable draft exists.
 * Re-renders its relative time every 30s so "2m ago" stays accurate.
 */
export function DraftBanner({ savedAt, onRestore, onDiscard, label = "draft" }: Props) {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#FF0099]/30 bg-[#FF0099]/10 px-3 py-2 text-sm">
      <History className="h-4 w-4 shrink-0 text-[#FF0099]" aria-hidden="true" />
      <span className="flex-1 min-w-0 text-foreground">
        You have an unsaved {label} from{" "}
        <strong className="font-semibold">{formatDraftAge(savedAt)}</strong>.
      </span>
      <button
        type="button"
        onClick={onRestore}
        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 py-1 text-xs font-semibold text-white hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
      >
        <RotateCcw className="h-3 w-3" aria-hidden="true" /> Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
      >
        <X className="h-3 w-3" aria-hidden="true" /> Discard
      </button>
    </div>
  );
}

/** Subtle "Draft saved Xs ago" indicator for a live editing session. */
export function DraftSavedHint({ savedAt }: { savedAt: number | null }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => force((n) => n + 1), 15_000);
    return () => clearInterval(t);
  }, [savedAt]);
  if (!savedAt) return null;
  return (
    <span className="text-[11px] text-muted-foreground" aria-live="polite">
      Draft saved {formatDraftAge(savedAt)}
    </span>
  );
}
