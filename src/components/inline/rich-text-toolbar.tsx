"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Bold,
  Check,
  ChevronDown,
  Italic,
  RemoveFormatting,
  Type,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FONT_FAMILIES,
  FONT_SIZES,
  normalizeFontFamily,
  pasteHtmlToInline,
  plainToEditableHtml,
  richTextToPlain,
} from "@/lib/rich-text";

/* ------------------------- special characters ------------------------- */

interface SpecialChar {
  ch: string;
  name: string;
}

const CHAR_GROUPS: { label: string; chars: SpecialChar[] }[] = [
  {
    label: "Accents",
    chars: [
      { ch: "á", name: "a acute" },
      { ch: "é", name: "e acute" },
      { ch: "í", name: "i acute" },
      { ch: "ó", name: "o acute" },
      { ch: "ú", name: "u acute" },
      { ch: "ü", name: "u diaeresis" },
      { ch: "ñ", name: "n tilde ene" },
      { ch: "Á", name: "A acute capital" },
      { ch: "É", name: "E acute capital" },
      { ch: "Í", name: "I acute capital" },
      { ch: "Ó", name: "O acute capital" },
      { ch: "Ú", name: "U acute capital" },
      { ch: "Ü", name: "U diaeresis capital" },
      { ch: "Ñ", name: "N tilde ene capital" },
    ],
  },
  {
    label: "Punctuation",
    chars: [
      { ch: "¿", name: "inverted question mark" },
      { ch: "¡", name: "inverted exclamation mark" },
      { ch: "«", name: "left angle quote guillemet" },
      { ch: "»", name: "right angle quote guillemet" },
      { ch: "—", name: "em dash" },
      { ch: "–", name: "en dash" },
      { ch: "‘", name: "left single quote" },
      { ch: "’", name: "right single quote apostrophe" },
      { ch: "“", name: "left double quote" },
      { ch: "”", name: "right double quote" },
      { ch: "…", name: "ellipsis dots" },
    ],
  },
  {
    label: "Symbols",
    chars: [
      { ch: "°", name: "degree" },
      { ch: "©", name: "copyright" },
      { ch: "®", name: "registered" },
      { ch: "™", name: "trademark" },
      { ch: "€", name: "euro" },
      { ch: "♡", name: "heart" },
      { ch: "★", name: "star" },
    ],
  },
];

/* --------------------------- editing commands --------------------------- */
/* All commands go through document.execCommand so the browser's native      */
/* undo stack (Ctrl+Z) keeps working. The strict sanitizer runs on save, so  */
/* any extra markup a browser sneaks in gets reduced to the whitelist.       */

function rangeWithin(editor: HTMLElement, range: Range | null): range is Range {
  return !!range && editor.contains(range.commonAncestorContainer);
}

/**
 * Make sure the browser selection is inside the editor, restoring the last
 * known range if focus wandered off (e.g. into the palette's search box).
 */
function restoreSelection(editor: HTMLElement, saved: Range | null): Selection | null {
  const sel = window.getSelection();
  if (!sel) return null;
  const current = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  if (rangeWithin(editor, current)) return sel;
  editor.focus({ preventScroll: true });
  sel.removeAllRanges();
  if (rangeWithin(editor, saved)) {
    sel.addRange(saved.cloneRange());
  } else {
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    sel.addRange(r);
  }
  return sel;
}

function execSimple(editor: HTMLElement, saved: Range | null, cmd: "bold" | "italic" | "underline") {
  restoreSelection(editor, saved);
  // styleWithCSS=false → <b>/<i>/<u> tags (our whitelist), not styled spans.
  document.execCommand("styleWithCSS", false, "false");
  document.execCommand(cmd);
}

/** Select the whole editor content when nothing is selected. */
function ensureRange(editor: HTMLElement, sel: Selection): Range {
  let range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
  if (!range || range.collapsed || !rangeWithin(editor, range)) {
    range = document.createRange();
    range.selectNodeContents(editor);
    sel.removeAllRanges();
    sel.addRange(range);
  }
  return range;
}

/** Replace the current selection with HTML and re-select what was inserted. */
function insertAndReselect(editor: HTMLElement, sel: Selection, html: string) {
  document.execCommand("insertHTML", false, html);
  const markers = editor.querySelectorAll("[data-rt-marker]");
  if (!markers.length) return;
  const r = document.createRange();
  r.setStartBefore(markers[0]);
  r.setEndAfter(markers[markers.length - 1]);
  markers.forEach((m) => m.removeAttribute("data-rt-marker"));
  sel.removeAllRanges();
  sel.addRange(r);
}

/**
 * insertHTML replaces the selection and splits any inline ancestors at the
 * insertion point — so formatting that WRAPPED the selection (e.g. the <b>
 * around a fully-bold word) would be lost from the inserted fragment. This
 * rebuilds those ancestors (minus the property being rewritten) so applying
 * a size to a bold word keeps it bold.
 */
function wrapWithInlineAncestors(
  editor: HTMLElement,
  range: Range,
  html: string,
  dropProp?: "font-size" | "font-family",
): string {
  let node: Node | null = range.commonAncestorContainer;
  if (node.nodeType === Node.TEXT_NODE) node = node.parentNode;
  let out = html;
  while (node && node !== editor && node instanceof HTMLElement) {
    const tag = node.tagName.toLowerCase();
    if (tag === "b" || tag === "strong" || tag === "i" || tag === "em" || tag === "u") {
      out = `<${tag}>${out}</${tag}>`;
    } else if (tag === "span") {
      const kept: string[] = [];
      const size = node.style.fontSize;
      const family = node.style.fontFamily;
      if (size && dropProp !== "font-size") kept.push(`font-size:${size}`);
      if (family && dropProp !== "font-family") kept.push(`font-family:${family}`);
      if (kept.length) out = `<span style="${kept.join(";")}">${out}</span>`;
    }
    node = node.parentNode;
  }
  return out;
}

/**
 * Wrap the selection (or the whole element when collapsed) in a span with
 * the given font-size/font-family, clearing that property from any nested
 * spans first so the new value always wins. `cssValue: null` clears it.
 */
function applyInlineStyle(
  editor: HTMLElement,
  saved: Range | null,
  prop: "font-size" | "font-family",
  cssValue: string | null,
) {
  const sel = restoreSelection(editor, saved);
  if (!sel) return;
  const range = ensureRange(editor, sel);
  const tmp = document.createElement("div");
  tmp.appendChild(range.cloneContents());
  tmp.querySelectorAll("span").forEach((s) => {
    s.style.removeProperty(prop);
    if (!s.getAttribute("style")) s.removeAttribute("style");
  });
  const inner = wrapWithInlineAncestors(editor, range, tmp.innerHTML, prop);
  const styleAttr = cssValue ? ` style="${prop}:${cssValue}"` : "";
  insertAndReselect(editor, sel, `<span data-rt-marker="1"${styleAttr}>${inner}</span>`);
}

/** Strip all formatting from the selection (or whole element) to plain text. */
function clearFormatting(editor: HTMLElement, saved: Range | null) {
  const sel = restoreSelection(editor, saved);
  if (!sel) return;
  const range = ensureRange(editor, sel);
  const tmp = document.createElement("div");
  tmp.appendChild(range.cloneContents());
  const plain = richTextToPlain(tmp.innerHTML);
  insertAndReselect(editor, sel, `<span data-rt-marker="1">${plainToEditableHtml(plain)}</span>`);
}

function insertChar(editor: HTMLElement, saved: Range | null, ch: string) {
  restoreSelection(editor, saved);
  document.execCommand("insertText", false, ch);
}

/** Shared paste handler: reduce foreign clipboard formatting to the whitelist. */
export function handleRichPaste(e: React.ClipboardEvent<HTMLElement>) {
  e.preventDefault();
  const html = e.clipboardData.getData("text/html");
  if (html) {
    document.execCommand("insertHTML", false, pasteHtmlToInline(html));
    return;
  }
  const text = e.clipboardData.getData("text/plain");
  if (text) document.execCommand("insertHTML", false, plainToEditableHtml(text));
}

/** <br>-based line break that stays inside the current heading/paragraph. */
export function insertLineBreak() {
  let ok = false;
  try {
    ok = document.execCommand("insertLineBreak");
  } catch {
    ok = false;
  }
  if (!ok) document.execCommand("insertHTML", false, "<br>");
}

/* ------------------------------- toolbar ------------------------------- */

interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  sizeKey: string;
  fontKey: string;
}

const DEFAULT_FORMAT: FormatState = {
  bold: false,
  italic: false,
  underline: false,
  sizeKey: "m",
  fontKey: "default",
};

function readFormats(editor: HTMLElement, range: Range): FormatState {
  const state = { ...DEFAULT_FORMAT };
  try {
    state.bold = document.queryCommandState("bold");
    state.italic = document.queryCommandState("italic");
    state.underline = document.queryCommandState("underline");
  } catch {
    /* unsupported — leave false */
  }
  let sawSize = false;
  let sawFont = false;
  let node: Node | null = range.startContainer;
  while (node && node !== editor) {
    if (node instanceof HTMLElement && node.tagName === "SPAN") {
      if (!sawSize && node.style.fontSize) {
        const v = node.style.fontSize.toLowerCase().replace(/\s+/g, "");
        const opt = FONT_SIZES.find((f) => f.css === v);
        if (opt) state.sizeKey = opt.key;
        sawSize = true;
      }
      if (!sawFont && node.style.fontFamily) {
        const norm = normalizeFontFamily(node.style.fontFamily);
        const opt = FONT_FAMILIES.find((f) => f.css && normalizeFontFamily(f.css) === norm);
        if (opt) state.fontKey = opt.key;
        sawFont = true;
      }
    }
    node = node.parentNode;
  }
  return state;
}

interface RichTextToolbarProps {
  editorRef: React.RefObject<HTMLElement | null>;
  /** Show a "Done" commit button (used by the in-place page editor). */
  onDone?: () => void;
}

/**
 * Floating formatting toolbar for one active rich-text editable. Docks above
 * the element (below when there's no room) so it never covers the text.
 * Every control preventDefaults pointerdown, so the editor keeps focus and
 * selection while clicking around the toolbar; the character palette's
 * search box is the one exception — commands restore the saved selection.
 */
export function RichTextToolbar({ editorRef, onDone }: RichTextToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const [menu, setMenu] = useState<null | "size" | "font" | "chars">(null);
  const [fmt, setFmt] = useState<FormatState>(DEFAULT_FORMAT);
  const [charQuery, setCharQuery] = useState("");

  const reposition = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const r = editor.getBoundingClientRect();
    const tw = rootRef.current?.offsetWidth ?? 340;
    const th = rootRef.current?.offsetHeight ?? 42;
    const margin = 8;
    // Keep clear of the fixed "Editing this page" banner at the top.
    let top = r.top - th - margin;
    let below = false;
    if (top < 48) {
      top = Math.min(r.bottom + margin, window.innerHeight - th - margin);
      below = true;
    }
    const left = Math.max(
      margin,
      Math.min(r.left + r.width / 2 - tw / 2, window.innerWidth - tw - margin),
    );
    setPos({ top, left, below });
  }, [editorRef]);

  useLayoutEffect(() => {
    reposition();
  }, [reposition]);

  useEffect(() => {
    const onMove = () => reposition();
    window.addEventListener("scroll", onMove, true);
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove, true);
      window.removeEventListener("resize", onMove);
    };
  }, [reposition]);

  // Content edits can change the element's size — follow it.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const onInput = () => reposition();
    editor.addEventListener("input", onInput);
    return () => editor.removeEventListener("input", onInput);
  }, [editorRef, reposition]);

  // Remember the latest selection inside the editor and mirror its formats.
  useEffect(() => {
    function onSelectionChange() {
      const editor = editorRef.current;
      if (!editor) return;
      const sel = window.getSelection();
      const range = sel && sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (rangeWithin(editor, range)) {
        savedRangeRef.current = range.cloneRange();
        setFmt(readFormats(editor, range));
      }
    }
    document.addEventListener("selectionchange", onSelectionChange);
    onSelectionChange();
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, [editorRef]);

  const run = useCallback(
    (fn: (editor: HTMLElement, saved: Range | null) => void) => {
      const editor = editorRef.current;
      if (!editor) return;
      fn(editor, savedRangeRef.current);
    },
    [editorRef],
  );

  if (typeof document === "undefined") return null;

  const sizeLabel = FONT_SIZES.find((f) => f.key === fmt.sizeKey)?.label ?? "M";
  const fontLabel =
    fmt.fontKey === "default"
      ? "Font"
      : (FONT_FAMILIES.find((f) => f.key === fmt.fontKey)?.label.split(" ")[0] ?? "Font");
  const menuUp = !(pos?.below ?? false);
  const q = charQuery.trim().toLowerCase();

  return createPortal(
    <div
      ref={rootRef}
      data-rich-toolbar=""
      role="toolbar"
      aria-label="Text formatting"
      className="fixed z-[130] select-none"
      style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
      onPointerDown={(e) => {
        // Keep focus + selection in the editor — except for real inputs
        // (the palette search box) which genuinely need focus.
        if (!(e.target as HTMLElement).closest("input")) e.preventDefault();
      }}
    >
      <div className="flex max-w-[calc(100vw-16px)] items-center gap-0.5 overflow-x-auto rounded-xl border border-white/15 bg-[#221019]/95 px-1.5 py-1 text-white shadow-[0_12px_40px_rgb(34_16_25/0.45)] backdrop-blur-md">
        <ToolButton label="Bold (Ctrl+B)" active={fmt.bold} onAction={() => run((ed, sv) => execSimple(ed, sv, "bold"))}>
          <Bold className="h-4 w-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={fmt.italic} onAction={() => run((ed, sv) => execSimple(ed, sv, "italic"))}>
          <Italic className="h-4 w-4" aria-hidden="true" />
        </ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={fmt.underline} onAction={() => run((ed, sv) => execSimple(ed, sv, "underline"))}>
          <Underline className="h-4 w-4" aria-hidden="true" />
        </ToolButton>

        <Divider />

        <ToolButton
          label="Text size"
          active={fmt.sizeKey !== "m"}
          expanded={menu === "size"}
          onAction={() => setMenu((m) => (m === "size" ? null : "size"))}
        >
          <Type className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="text-[11px] font-semibold">{sizeLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </ToolButton>

        <ToolButton
          label="Font family"
          active={fmt.fontKey !== "default"}
          expanded={menu === "font"}
          onAction={() => setMenu((m) => (m === "font" ? null : "font"))}
        >
          <span className="max-w-20 truncate text-[11px] font-semibold">{fontLabel}</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </ToolButton>

        <Divider />

        <ToolButton
          label="Special characters & accents"
          expanded={menu === "chars"}
          onAction={() => setMenu((m) => (m === "chars" ? null : "chars"))}
        >
          <span className="text-[13px] font-bold leading-none">Ñ</span>
          <ChevronDown className="h-3 w-3 opacity-60" aria-hidden="true" />
        </ToolButton>

        <Divider />

        <ToolButton label="Clear formatting" onAction={() => run(clearFormatting)}>
          <RemoveFormatting className="h-4 w-4" aria-hidden="true" />
        </ToolButton>

        {onDone && (
          <>
            <Divider />
            <button
              type="button"
              tabIndex={-1}
              onPointerDown={(e) => e.preventDefault()}
              onClick={onDone}
              className="flex h-8 items-center gap-1 rounded-lg bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] px-2.5 text-[11px] font-semibold text-white transition-all hover:brightness-110"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" /> Done
            </button>
          </>
        )}
      </div>

      {menu === "size" && (
        <MenuPanel up={menuUp} className="min-w-52 p-1.5">
          <div className="flex items-end gap-1">
            {FONT_SIZES.map((s) => (
              <button
                key={s.key}
                type="button"
                tabIndex={-1}
                title={s.css ? `${s.label} (${s.css})` : "Normal (inherit)"}
                aria-pressed={fmt.sizeKey === s.key}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  run((ed, sv) => applyInlineStyle(ed, sv, "font-size", s.css));
                  setMenu(null);
                }}
                className={cn(
                  "flex h-10 flex-1 items-end justify-center rounded-lg pb-1 font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white",
                  fmt.sizeKey === s.key && "bg-[var(--magenta)] text-white hover:bg-[var(--magenta)]",
                )}
                style={{ fontSize: 11 + FONT_SIZES.indexOf(s) * 2 }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </MenuPanel>
      )}

      {menu === "font" && (
        <MenuPanel up={menuUp} className="min-w-56 p-1.5">
          <div className="flex flex-col gap-0.5">
            {FONT_FAMILIES.map((f) => (
              <button
                key={f.key}
                type="button"
                tabIndex={-1}
                aria-pressed={fmt.fontKey === f.key}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => {
                  run((ed, sv) => applyInlineStyle(ed, sv, "font-family", f.css));
                  setMenu(null);
                }}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-[13px] text-white/85 transition-colors hover:bg-white/10 hover:text-white",
                  fmt.fontKey === f.key && "bg-white/10 text-white",
                )}
                style={{ fontFamily: f.css ?? undefined }}
              >
                {f.label}
                {fmt.fontKey === f.key && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--magenta)]" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </MenuPanel>
      )}

      {menu === "chars" && (
        <MenuPanel up={menuUp} className="w-72 p-2">
          <input
            type="text"
            value={charQuery}
            onChange={(e) => setCharQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setMenu(null);
                editorRef.current?.focus();
              }
            }}
            placeholder="Search… e.g. ñ, dash, heart"
            aria-label="Search special characters"
            className="mb-2 w-full rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none focus:ring-2 focus:ring-[var(--magenta)]/60"
          />
          <div className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
            {CHAR_GROUPS.map((group) => {
              const chars = q
                ? group.chars.filter((c) => c.name.toLowerCase().includes(q) || c.ch === charQuery.trim())
                : group.chars;
              if (!chars.length) return null;
              return (
                <div key={group.label}>
                  <p className="mb-1 px-0.5 text-[9px] font-bold uppercase tracking-wider text-white/40">
                    {group.label}
                  </p>
                  <div className="grid grid-cols-7 gap-0.5">
                    {chars.map((c) => (
                      <button
                        key={c.ch}
                        type="button"
                        tabIndex={-1}
                        title={c.name}
                        onPointerDown={(e) => e.preventDefault()}
                        onClick={() => run((ed, sv) => insertChar(ed, sv, c.ch))}
                        className="flex h-8 items-center justify-center rounded-lg text-[15px] text-white/90 transition-colors hover:bg-[var(--magenta)] hover:text-white"
                      >
                        {c.ch}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {q &&
              CHAR_GROUPS.every(
                (g) => !g.chars.some((c) => c.name.toLowerCase().includes(q) || c.ch === charQuery.trim()),
              ) && <p className="py-2 text-center text-xs text-white/40">No matches</p>}
          </div>
        </MenuPanel>
      )}
    </div>,
    document.body,
  );
}

function Divider() {
  return <span className="mx-0.5 h-5 w-px shrink-0 bg-white/15" aria-hidden="true" />;
}

function ToolButton({
  label,
  active,
  expanded,
  onAction,
  children,
}: {
  label: string;
  active?: boolean;
  expanded?: boolean;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      title={label}
      aria-label={label}
      aria-pressed={active}
      aria-expanded={expanded}
      onPointerDown={(e) => e.preventDefault()}
      onClick={onAction}
      className={cn(
        "flex h-8 min-w-8 shrink-0 items-center justify-center gap-1 rounded-lg px-1.5 text-white/80 transition-colors hover:bg-white/10 hover:text-white",
        active && "bg-[var(--magenta)]/90 text-white hover:bg-[var(--magenta)]",
      )}
    >
      {children}
    </button>
  );
}

function MenuPanel({
  up,
  className,
  children,
}: {
  up: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 z-10 rounded-xl border border-white/15 bg-[#221019]/[0.97] text-white shadow-2xl backdrop-blur-md",
        up ? "bottom-full mb-1.5" : "top-full mt-1.5",
        className,
      )}
    >
      {children}
    </div>
  );
}
