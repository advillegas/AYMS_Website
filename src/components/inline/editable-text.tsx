"use client";

import { useEffect, useRef } from "react";
import { useOverrideText, saveOverrideText } from "@/lib/use-site-content";
import { useInlineEdit } from "@/lib/use-inline-edit";
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
 * A text node that an admin can click-to-edit in place when edit mode is on.
 * Edits save (debounced on blur) to the shared overrides doc and go live for
 * everyone. When edit mode is off (or for visitors) it renders plain text.
 */
export function EditableText({ id, children, as = "span", className, multiline }: Props) {
  const value = useOverrideText(id, children);
  const editing = useInlineEdit((s) => s.enabled);
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  // Keep the contentEditable DOM in sync with external (realtime) changes,
  // but never while the user is actively typing in it.
  useEffect(() => {
    const el = ref.current;
    if (editing && el && document.activeElement !== el) {
      el.textContent = value;
    }
  }, [editing, value]);

  if (!editing) {
    return <Tag className={className}>{value}</Tag>;
  }

  return (
    <Tag
      ref={ref}
      className={cn(
        className,
        "cursor-text rounded-[3px] outline-dashed outline-1 outline-[var(--magenta)]/40 transition-[outline-color] hover:outline-[var(--magenta)] focus:outline focus:outline-2 focus:outline-[var(--magenta)]",
      )}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      tabIndex={0}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.textContent ?? "").replace(/\u00a0/g, " ");
        if (text !== value) void saveOverrideText(id, text);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        // Single-line fields commit on Enter; multiline keeps newlines.
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}
