"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useOverrideText, saveOverrideText } from "@/lib/use-site-content";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { isRichTextEmpty } from "@/lib/rich-text";
import { RichTextEditor } from "@/components/inline/rich-text-editor";
import { RichTextStatic } from "@/components/inline/rich-text-static";
import { cn } from "@/lib/utils";

type Tag = "h1" | "h2" | "h3" | "h4" | "h5" | "p" | "span" | "div" | "li" | "strong";

interface Props {
  /** Stable, unique id for this text slot (e.g. "camp.hero.title"). */
  id: string;
  /** The coded default text — shown until an override is saved. */
  children: string;
  as?: Tag;
  className?: string;
  multiline?: boolean;
}

/**
 * Text that an admin can edit in place. In edit mode it shows a dashed
 * outline; the element only becomes editable AFTER it's tapped — so the page
 * still scrolls normally (critical on touch devices, where an always-editable
 * page traps scroll/taps). While editing, a floating toolbar offers rich
 * formatting (bold/italic/underline, size, brand fonts, Spanish accents…).
 * Saves on blur/Done to the shared overrides doc and goes live for everyone.
 *
 * Stored values stay plain strings unless formatting is applied, in which
 * case whitelisted inline HTML is stored; both render correctly everywhere
 * via RichTextStatic.
 */
export function EditableText({ id, children, as = "span", className, multiline }: Props) {
  const value = useOverrideText(id, children);
  const editing = useInlineEdit((s) => s.enabled);
  const [active, setActive] = useState(false);

  // Leaving edit mode entirely cancels any active editing (state adjustment
  // during render — no effect, no extra committed frame).
  const [prevEditing, setPrevEditing] = useState(editing);
  if (prevEditing !== editing) {
    setPrevEditing(editing);
    if (!editing && active) setActive(false);
  }

  if (!editing) {
    return <RichTextStatic as={as} value={value} className={className} />;
  }

  if (!active) {
    return (
      <RichTextStatic
        as={as}
        value={value}
        className={cn(
          className,
          "cursor-pointer rounded-[3px] outline-dashed outline-1 outline-[var(--magenta)]/50 transition-[outline-color] hover:outline-[var(--magenta)]",
        )}
        role="button"
        tabIndex={0}
        title="Click to edit"
        onClick={(e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setActive(true);
        }}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActive(true);
          }
        }}
      />
    );
  }

  return (
    <RichTextEditor
      as={as}
      value={value}
      multiline={multiline}
      autoFocus
      showDone
      className={cn(className, "rounded-[3px] outline outline-2 outline-[var(--magenta)]")}
      onCommit={(out) => {
        setActive(false);
        if (isRichTextEmpty(out)) return; // empty discards; the default returns
        if (out === value) return;
        void saveOverrideText(id, out).then((ok) => {
          if (!ok) {
            toast.error("Couldn't save that change — check your connection and try again.");
          }
        });
      }}
      onCancel={() => setActive(false)}
    />
  );
}
