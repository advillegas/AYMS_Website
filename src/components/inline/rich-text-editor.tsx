"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { serializeEditorHtml, valueToEditableHtml } from "@/lib/rich-text";
import {
  RichTextToolbar,
  handleRichPaste,
  insertLineBreak,
} from "@/components/inline/rich-text-toolbar";

interface RichTextEditorProps {
  as?: React.ElementType;
  className?: string;
  style?: React.CSSProperties;
  /** Stored value — legacy plain string OR whitelisted inline HTML. */
  value: string;
  /** Enter inserts a line break instead of committing. */
  multiline?: boolean;
  /** Focus and place the caret at the end on mount. */
  autoFocus?: boolean;
  /** Show a "Done" button in the toolbar. */
  showDone?: boolean;
  /**
   * Called with the serialized value (plain string when unformatted, inline
   * HTML otherwise) whenever an editing session ends. Fires even when
   * unchanged — callers diff against their stored value.
   */
  onCommit: (serialized: string) => void;
  /** Escape pressed — content is reverted before this fires. */
  onCancel?: () => void;
}

/**
 * The rich-text editing surface shared by the in-place page editor
 * (EditableText) and the visual builder's heading/text blocks. A plain
 * contentEditable rendering of the SAME element (so typography is WYSIWYG),
 * plus the floating formatting toolbar while focused. All formatting flows
 * through execCommand, so native undo/redo (Ctrl+Z) keeps working; pasted
 * content is reduced to the sanitizer's whitelist.
 */
export function RichTextEditor({
  as = "span",
  className,
  style,
  value,
  multiline,
  autoFocus,
  showDone,
  onCommit,
  onCancel,
}: RichTextEditorProps) {
  const Tag = as as React.ElementType;
  const ref = useRef<HTMLElement>(null);
  const focusedRef = useRef(false);
  const lastValueRef = useRef<string | null>(null);
  const [focused, setFocused] = useState(false);

  // Latest commit callback in a ref so the stable `finish` (used by the
  // document-level pointerdown listener) always calls the current one.
  const onCommitRef = useRef(onCommit);
  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  // Seed / refresh the DOM from the stored value — but never while the admin
  // is actively typing (their DOM is the source of truth until commit).
  useEffect(() => {
    const el = ref.current;
    if (!el || focusedRef.current) return;
    if (lastValueRef.current === value) return;
    el.innerHTML = valueToEditableHtml(value);
    lastValueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (!autoFocus) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [autoFocus]);

  const finish = useCallback(() => {
    if (!focusedRef.current) return;
    focusedRef.current = false;
    setFocused(false);
    const el = ref.current;
    if (!el) return;
    const out = serializeEditorHtml(el.innerHTML);
    lastValueRef.current = null; // next value change re-seeds
    onCommitRef.current(out);
  }, []);

  // Clicking/tapping anywhere outside the editor AND its toolbar commits.
  // (Blur alone can't cover it: focusing the palette's search box leaves the
  // editor without ending the session.)
  useEffect(() => {
    if (!focused) return;
    function onDown(ev: PointerEvent) {
      const t = ev.target as Node | null;
      const el = ref.current;
      if (!t || (el && el.contains(t))) return;
      if (t instanceof Element && t.closest("[data-rich-toolbar]")) return;
      finish();
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [focused, finish]);

  function handleFocus() {
    focusedRef.current = true;
    setFocused(true);
    try {
      // <b>/<i>/<u> tags rather than styled spans (matches the whitelist).
      document.execCommand("styleWithCSS", false, "false");
    } catch {
      /* ignore */
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLElement>) {
    const rt = e.relatedTarget as HTMLElement | null;
    // Focus moving into the toolbar (e.g. the palette search box) is still
    // part of this editing session.
    if (rt && rt.closest("[data-rich-toolbar]")) return;
    finish();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === "Escape") {
      e.preventDefault();
      const el = ref.current;
      focusedRef.current = false;
      setFocused(false);
      if (el) {
        // Revert to the stored value, then blur (finish() short-circuits
        // because focusedRef is already false — nothing gets committed).
        el.innerHTML = valueToEditableHtml(value);
        lastValueRef.current = value;
        el.blur();
      }
      onCancel?.();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (multiline) insertLineBreak();
      else ref.current?.blur(); // blur → commit
      return;
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const k = e.key.toLowerCase();
      if (k === "b" || k === "i" || k === "u") {
        e.preventDefault();
        try {
          document.execCommand("styleWithCSS", false, "false");
          document.execCommand(k === "b" ? "bold" : k === "i" ? "italic" : "underline");
        } catch {
          /* ignore */
        }
      }
    }
  }

  return (
    <>
      <Tag
        ref={ref}
        className={className}
        style={style}
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        role="textbox"
        aria-multiline={multiline || undefined}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        onPaste={handleRichPaste}
      />
      {focused && (
        <RichTextToolbar
          editorRef={ref}
          onDone={showDone ? () => ref.current?.blur() : undefined}
        />
      )}
    </>
  );
}
