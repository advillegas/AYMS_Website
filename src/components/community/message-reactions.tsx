"use client";

import { useState, useRef } from "react";
import { Smile, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { FloatingPopover } from "./floating-popover";
import { EmojiPickerPopover } from "./emoji-picker-popover";

export const QUICK_EMOJIS = ["❤️", "🔥", "😂", "🎉", "🙌", "💖", "✨", "🌸", "👏", "💕"];

interface MessageReactionsProps {
  reactions: Record<string, string[]>;
  currentUserId?: string;
  onToggle: (emoji: string) => void;
  className?: string;
}

/**
 * Reaction badges shown beneath a message. Click an existing badge to
 * toggle your own reaction in/out.
 */
export function MessageReactions({
  reactions,
  currentUserId,
  onToggle,
  className,
}: MessageReactionsProps) {
  const entries = Object.entries(reactions).filter(([, ids]) => ids.length > 0);
  if (entries.length === 0) return null;
  return (
    <div className={cn("inline-flex flex-wrap gap-1", className)}>
      {entries.map(([emoji, ids]) => {
        const mine = currentUserId ? ids.includes(currentUserId) : false;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors focus:outline-none shadow-sm",
              "[background-color:#fff]",
              mine
                ? "text-primary border-2 border-primary/50"
                : "text-foreground/80 border border-rosa/40 hover:border-primary/40",
            )}
            aria-label={`${emoji} ${ids.length} ${mine ? "(yours)" : ""}`}
          >
            <span className="leading-none">{emoji}</span>
            <span className="text-[10px] font-semibold tabular-nums">
              {ids.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface AddReactionButtonProps {
  onSelect: (emoji: string) => void;
  align?: "start" | "end";
}

/**
 * Trigger button + portal-rendered reaction picker.
 *
 * Two-stage UI: the smiley shows a compact quick-react grid first (the
 * top 10 emojis we ship as defaults). A "+" tile in the same grid
 * expands the surface into the full lazy-loaded emoji-mart picker so
 * power users can search the entire Unicode set without leaving the
 * message.
 */
export function AddReactionButton({ onSelect, align = "end" }: AddReactionButtonProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [fullOpen, setFullOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  function handleQuickSelect(e: string) {
    onSelect(e);
    setQuickOpen(false);
  }

  function openFullPicker() {
    setQuickOpen(false);
    // Defer so the quick popover finishes closing before the full one
    // measures position; otherwise both render briefly stacked.
    requestAnimationFrame(() => setFullOpen(true));
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (fullOpen) {
            setFullOpen(false);
            return;
          }
          setQuickOpen((v) => !v);
        }}
        className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
        aria-label="Add reaction"
        title="Add reaction"
      >
        <Smile className="h-3.5 w-3.5" />
      </button>

      <FloatingPopover
        open={quickOpen}
        triggerRef={triggerRef}
        onClose={() => setQuickOpen(false)}
        placement={align === "end" ? "top-end" : "top-start"}
        width={300}
        className="bg-card border border-rosa/30"
      >
        <div className="p-2 flex flex-wrap gap-1">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => handleQuickSelect(e)}
              className="text-xl rounded-full p-1.5 hover:bg-primary/10 transition-colors leading-none"
              aria-label={`React with ${e}`}
            >
              {e}
            </button>
          ))}
          <button
            type="button"
            onClick={openFullPicker}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-primary/40 text-primary hover:bg-primary/10 transition-colors"
            aria-label="Browse all emojis"
            title="Browse all emojis"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </FloatingPopover>

      <EmojiPickerPopover
        open={fullOpen}
        triggerRef={triggerRef}
        onClose={() => setFullOpen(false)}
        onSelect={(emoji) => {
          onSelect(emoji);
          setFullOpen(false);
        }}
        placement={align === "end" ? "top-end" : "top-start"}
      />
    </>
  );
}
