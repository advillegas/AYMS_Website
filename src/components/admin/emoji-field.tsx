"use client";

/**
 * Inline emoji picker for admin forms (trips, events). Renders the emoji-mart
 * picker *in the document flow inside the dialog* rather than a portaled
 * popover — Base UI's Dialog closes on outside-press and traps focus, so a
 * portaled picker would dismiss the form or break the search box.
 *
 * - Click the swatch to open/close the picker.
 * - Pick an emoji to set it.
 * - "Remove" clears the emoji entirely (it's optional on a trip/event).
 */

import { useEffect, useRef, useState } from "react";
import { Smile, X } from "lucide-react";
import {
  loadPicker,
  type EmojiData,
  type LoadedPicker,
} from "@/components/community/emoji-picker-popover";

interface EmojiFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function EmojiField({ value, onChange }: EmojiFieldProps) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<LoadedPicker | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void loadPicker().then((p) => {
      if (!cancelled) setLoaded(p);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={value ? "Change emoji" : "Pick an emoji"}
          aria-expanded={open}
          className="flex h-10 w-14 items-center justify-center rounded-md border border-input bg-background text-2xl leading-none transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {value ? (
            <span aria-hidden="true">{value}</span>
          ) : (
            <Smile className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="text-xs font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {open ? "Close" : value ? "Change" : "Choose emoji"}
        </button>

        {value && (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
            }}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
            Remove
          </button>
        )}
      </div>

      {open && (
        <div ref={panelRef} className="mt-2 w-fit overflow-hidden rounded-xl border border-input">
          {loaded ? (
            <loaded.Picker
              data={loaded.data}
              onEmojiSelect={(emoji: EmojiData) => {
                if (emoji.native) onChange(emoji.native);
                setOpen(false);
              }}
              theme="light"
              previewPosition="none"
              skinTonePosition="search"
              perLine={8}
              emojiSize={20}
              emojiButtonSize={32}
              navPosition="bottom"
            />
          ) : (
            <div className="flex h-[300px] w-[320px] items-center justify-center bg-card">
              <span className="text-xs text-muted-foreground">Loading emojis…</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
