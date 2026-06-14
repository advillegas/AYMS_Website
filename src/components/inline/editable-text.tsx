"use client";

import { useEffect, useRef, useState } from "react";
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
 * Text that an admin can edit in place. In edit mode it shows a dashed
 * outline; the element only becomes contentEditable AFTER it's tapped — so
 * the page still scrolls normally (critical on touch devices, where an
 * always-editable page traps scroll/taps). Saves on blur to the shared
 * overrides doc and go live for everyone.
 */
export function EditableText({ id, children, as = "span", className, multiline }: Props) {
  const value = useOverrideText(id, children);
  const editing = useInlineEdit((s) => s.enabled);
  const [active, setActive] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const Tag = as as React.ElementType;

  // When this element is activated, seed it with the current text and focus it.
  useEffect(() => {
    if (active && ref.current) {
      ref.current.textContent = value;
      ref.current.focus();
      // Place caret at the end.
      const sel = window.getSelection();
      if (sel) {
        const range = document.createRange();
        range.selectNodeContents(ref.current);
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Leaving edit mode entirely cancels any active editing.
  useEffect(() => {
    if (!editing) setActive(false);
  }, [editing]);

  if (!editing) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (!active) {
    return (
      <Tag
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
      >
        {value}
      </Tag>
    );
  }

  return (
    <Tag
      ref={ref}
      className={cn(className, "rounded-[3px] outline outline-2 outline-[var(--magenta)]")}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        const text = (e.currentTarget.textContent ?? "").replace(/\u00a0/g, " ").trim();
        if (text && text !== value) void saveOverrideText(id, text);
        setActive(false);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
        if (e.key === "Escape") {
          e.preventDefault();
          setActive(false);
        }
      }}
    />
  );
}
