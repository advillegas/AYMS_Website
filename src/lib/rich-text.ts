/**
 * Rich-text support for the in-place editor and the page-builder text blocks.
 *
 * Formatted values are stored as INLINE HTML strings in the same places plain
 * strings already live (cms_config overrides / builder element props), so the
 * storage layer is untouched. Back-compat rule: a stored value is treated as
 * rich text only if it contains one of the allowed tags — everything else
 * renders exactly as the plain string it always was.
 *
 * The sanitizer below is dependency-free and runs identically on the server
 * (SSR of client components) and in the browser, so sanitized markup never
 * causes hydration mismatches. Whitelist:
 *   tags   : b, strong, i, em, u, br, span
 *   styles : span[font-size]   → one of FONT_SIZE options (em-based so it
 *                                 scales inside headings vs paragraphs)
 *            span[font-family] → one of the brand font CSS variables
 * Everything else (tags, attributes, event handlers, urls, classes) is
 * stripped; unknown tags are dropped but their TEXT CONTENT is kept, except
 * for containers whose content is meaningless/dangerous (script, style, …).
 */

export interface FontOption {
  key: string;
  label: string;
  /** Inline-style value written into span[style]; null = inherit (no span). */
  css: string | null;
}

/** Brand fonts only — css values are the next/font variables set on <html>. */
export const FONT_FAMILIES: FontOption[] = [
  { key: "default", label: "Default (inherit)", css: null },
  { key: "montserrat", label: "Montserrat", css: "var(--font-sans)" },
  { key: "playfair", label: "Playfair Display", css: "var(--font-heading)" },
  { key: "fraunces", label: "Fraunces", css: "var(--font-display)" },
  { key: "cormorant", label: "Cormorant Garamond", css: "var(--font-detail)" },
  { key: "geist-mono", label: "Geist Mono", css: "var(--font-geist-mono)" },
];

/**
 * Preset size scale in em so "L" inside an h1 stays proportionally larger
 * than "L" inside a paragraph. "M" means inherit — no span is written.
 */
export const FONT_SIZES: FontOption[] = [
  { key: "s", label: "S", css: "0.85em" },
  { key: "m", label: "M", css: null },
  { key: "l", label: "L", css: "1.25em" },
  { key: "xl", label: "XL", css: "1.5em" },
  { key: "xxl", label: "XXL", css: "2em" },
];

const ALLOWED_FONT_SIZE_VALUES = new Set(
  FONT_SIZES.filter((f) => f.css).map((f) => f.css as string),
);

/** normalized family value → canonical css to emit */
const ALLOWED_FONT_FAMILY_VALUES = new Map<string, string>(
  FONT_FAMILIES.filter((f) => f.css).map((f) => [
    normalizeFontFamily(f.css as string),
    f.css as string,
  ]),
);

export function normalizeFontFamily(value: string): string {
  return value.replace(/["']/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

/** Simple inline formatting tags emitted as-is (attributes stripped). */
const ALLOWED_SIMPLE_TAGS = new Set(["b", "strong", "i", "em", "u"]);

/** Dropped INCLUDING their content — text inside these is never user prose. */
const DROP_WITH_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "noscript",
  "template",
  "title",
  "head",
  "svg",
  "math",
  "textarea",
  "select",
  "option",
]);

/**
 * Does this stored value opt into rich rendering? Only strings containing an
 * allowed tag qualify — plain legacy strings (even ones with & or stray <)
 * keep rendering as literal text exactly like before.
 */
export function isRichText(value: string): boolean {
  return /<(b|strong|i|em|u|br|span)(\s|\/?>)/i.test(value);
}

function escapeText(text: string): string {
  // Preserve existing entities (&amp; etc); only neutralize stray angle
  // brackets that didn't parse as an allowed tag.
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Keep only whitelisted font-size / font-family declarations of a span. */
function sanitizeSpanStyle(rawAttrs: string): string | null {
  const m = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(rawAttrs);
  const raw = (m && (m[1] ?? m[2])) || "";
  if (!raw) return null;
  const kept: string[] = [];
  for (const decl of raw.split(";")) {
    const idx = decl.indexOf(":");
    if (idx === -1) continue;
    const prop = decl.slice(0, idx).trim().toLowerCase();
    const value = decl.slice(idx + 1).trim();
    if (prop === "font-size") {
      const norm = value.toLowerCase().replace(/\s+/g, "");
      if (ALLOWED_FONT_SIZE_VALUES.has(norm)) kept.push(`font-size:${norm}`);
    } else if (prop === "font-family") {
      const canonical = ALLOWED_FONT_FAMILY_VALUES.get(normalizeFontFamily(value));
      if (canonical) kept.push(`font-family:${canonical}`);
    }
  }
  return kept.length ? kept.join(";") : null;
}

/**
 * Strict whitelist sanitizer. Output only ever contains
 * b/strong/i/em/u/br and span[style] with the allowed declarations, is
 * balanced, and has all text content angle-bracket-escaped.
 */
export function sanitizeRichText(input: string): string {
  if (!input) return "";
  const out: string[] = [];
  const stack: { tag: string; emitted: boolean }[] = [];
  let dropTag: string | null = null;
  let dropDepth = 0;
  let i = 0;

  while (i < input.length) {
    const lt = input.indexOf("<", i);
    if (lt === -1) {
      if (!dropTag) out.push(escapeText(input.slice(i)));
      break;
    }
    if (lt > i && !dropTag) out.push(escapeText(input.slice(i, lt)));

    const m = /^<(\/?)([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>])*?)(\/?)>/.exec(
      input.slice(lt),
    );
    if (!m) {
      // Lone "<" that never forms a tag — neutralize and move on.
      if (!dropTag) out.push("&lt;");
      i = lt + 1;
      continue;
    }
    const [full, closing, rawName, rawAttrs, selfClose] = m;
    const name = rawName.toLowerCase();
    i = lt + full.length;

    if (dropTag) {
      // Inside a drop-with-content container: track nesting until it closes.
      if (name === dropTag) {
        if (closing) {
          dropDepth -= 1;
          if (dropDepth <= 0) {
            dropTag = null;
            dropDepth = 0;
          }
        } else if (!selfClose) {
          dropDepth += 1;
        }
      }
      continue;
    }

    if (closing) {
      let found = -1;
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].tag === name) {
          found = k;
          break;
        }
      }
      if (found === -1) continue; // stray closer — drop it
      for (let k = stack.length - 1; k >= found; k--) {
        if (stack[k].emitted) out.push(`</${stack[k].tag}>`);
      }
      stack.length = found;
      continue;
    }

    if (name === "br") {
      out.push("<br>");
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!selfClose) {
        dropTag = name;
        dropDepth = 1;
      }
      continue;
    }
    if (ALLOWED_SIMPLE_TAGS.has(name)) {
      out.push(`<${name}>`);
      if (selfClose) out.push(`</${name}>`);
      else stack.push({ tag: name, emitted: true });
      continue;
    }
    if (name === "span") {
      const style = sanitizeSpanStyle(rawAttrs);
      if (style) {
        out.push(`<span style="${style}">`);
        if (selfClose) out.push("</span>");
        else stack.push({ tag: "span", emitted: true });
      } else if (!selfClose) {
        // Unstyled span: drop the tag, keep its content.
        stack.push({ tag: "span", emitted: false });
      }
      continue;
    }
    // Any other tag (p, div, a, font, img, …): drop the tag, keep content.
    if (!selfClose) stack.push({ tag: name, emitted: false });
  }

  // Balance anything left open.
  for (let k = stack.length - 1; k >= 0; k--) {
    if (stack[k].emitted) out.push(`</${stack[k].tag}>`);
  }
  return out.join("");
}

/** HTML → plain text (br → \n, tags stripped, common entities decoded). */
export function richTextToPlain(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/gi, "&");
}

/** Plain string (possibly with \n) → HTML safe to seed into the editor. */
export function plainToEditableHtml(text: string): string {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

/** Stored value (plain or rich) → HTML to seed into the editor. */
export function valueToEditableHtml(value: string): string {
  return isRichText(value) ? sanitizeRichText(value) : plainToEditableHtml(value);
}

/**
 * Editor DOM → stored value. Sanitizes, then — if no real formatting
 * survived — collapses back to a plain string so unformatted content keeps
 * the exact legacy storage shape.
 */
export function serializeEditorHtml(rawHtml: string): string {
  const sanitized = sanitizeRichText(rawHtml).replace(
    /(?:\s*<br>\s*){3,}/gi,
    "<br><br>",
  );
  const hasFormatting = /<(?!br\b)[a-z]/i.test(sanitized);
  if (!hasFormatting) {
    return richTextToPlain(sanitized)
      .replace(/\u00a0/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return sanitized
    .replace(/^(?:\s|<br>)+/i, "")
    .replace(/(?:\s|<br>)+$/i, "");
}

/** True when a serialized value contains no visible text at all. */
export function isRichTextEmpty(value: string): boolean {
  return richTextToPlain(value).replace(/\u00a0/g, " ").trim() === "";
}

/**
 * Clipboard HTML → inline-only HTML: block boundaries become <br>, then the
 * strict whitelist runs, so foreign formatting collapses to the allowed set.
 */
export function pasteHtmlToInline(html: string): string {
  const inline = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<\/(p|div|li|h[1-6]|tr|blockquote|section|article|pre)>/gi, "<br>");
  return sanitizeRichText(inline)
    .replace(/(?:\s*<br>\s*){3,}/gi, "<br><br>")
    .replace(/^(?:\s|<br>)+/i, "")
    .replace(/(?:\s|<br>)+$/i, "");
}
