"use client";

import { useRef, useState } from "react";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EmojiPickerPopover,
} from "./emoji-picker-popover";
import type { PopoverPlacement } from "./floating-popover";

/**
 * Composer-toolbar trigger that opens the lazy emoji-mart picker via
 * the shared EmojiPickerPopover. Visual chrome only - all the load /
 * positioning logic lives in EmojiPickerPopover.
 */
interface EmojiPickerButtonProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  placement?: PopoverPlacement;
}

export function EmojiPickerButton({
  onSelect,
  disabled,
  placement = "top-start",
}: EmojiPickerButtonProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10"
        aria-label="Insert emoji"
        title="Insert emoji"
      >
        <Smile className="h-4 w-4" />
      </Button>
      <EmojiPickerPopover
        open={open}
        triggerRef={triggerRef}
        onClose={() => setOpen(false)}
        onSelect={onSelect}
        placement={placement}
      />
    </>
  );
}
