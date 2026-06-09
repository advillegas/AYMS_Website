"use client";

/**
 * Lazy-loaded emoji-mart picker rendered through FloatingPopover.
 *
 * Centralised so EmojiPickerButton (composer toolbar), AddReactionButton
 * (hover-on-message reactions), and the right-click "All emojis..."
 * action all share the same surface and the same one-time bundle
 * download.
 *
 * emoji-mart pulls in ~600KB of emoji data; we only import it when the
 * user actually opens a picker.
 */

import { useEffect, useState, type RefObject } from "react";
import { FloatingPopover, type PopoverPlacement } from "./floating-popover";

export interface EmojiData {
  native?: string;
  shortcodes?: string;
}

interface PickerComponentProps {
  data: unknown;
  onEmojiSelect: (emoji: EmojiData) => void;
  theme?: "light" | "dark" | "auto";
  previewPosition?: "top" | "bottom" | "none";
  skinTonePosition?: "preview" | "search" | "none";
  perLine?: number;
  emojiSize?: number;
  emojiButtonSize?: number;
  navPosition?: "top" | "bottom" | "none";
}

type LoadedPicker = {
  Picker: React.ComponentType<PickerComponentProps>;
  data: unknown;
};

// Module-scope cache so the second open in any tab is instant. The
// Promise lets concurrent openers share one in-flight import.
let cachedPicker: LoadedPicker | null = null;
let pendingImport: Promise<LoadedPicker> | null = null;

function loadPicker(): Promise<LoadedPicker> {
  if (cachedPicker) return Promise.resolve(cachedPicker);
  if (pendingImport) return pendingImport;
  pendingImport = (async () => {
    const [pickerMod, dataMod] = await Promise.all([
      import("@emoji-mart/react"),
      import("@emoji-mart/data"),
    ]);
    cachedPicker = {
      Picker: pickerMod.default as React.ComponentType<PickerComponentProps>,
      data: dataMod.default,
    };
    return cachedPicker;
  })();
  return pendingImport;
}

export interface EmojiPickerPopoverProps {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  placement?: PopoverPlacement;
}

export function EmojiPickerPopover({
  open,
  triggerRef,
  onClose,
  onSelect,
  placement = "top-start",
}: EmojiPickerPopoverProps) {
  const [loaded, setLoaded] = useState<LoadedPicker | null>(cachedPicker);

  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    void loadPicker().then((picker) => {
      if (!cancelled) setLoaded(picker);
    });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  return (
    <FloatingPopover
      open={open}
      triggerRef={triggerRef}
      onClose={onClose}
      placement={placement}
      width={352}
      className="overflow-hidden"
    >
      {loaded ? (
        <loaded.Picker
          data={loaded.data}
          onEmojiSelect={(emoji: EmojiData) => {
            if (emoji.native) onSelect(emoji.native);
            onClose();
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
        <div className="flex h-[380px] w-[min(352px,calc(100vw-1rem))] items-center justify-center rounded-xl border border-rosa/30 bg-card">
          <span className="text-xs text-muted-foreground">
            Loading emojis...
          </span>
        </div>
      )}
    </FloatingPopover>
  );
}
