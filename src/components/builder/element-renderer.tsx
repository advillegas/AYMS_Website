"use client";

import { useRef, useState, useEffect } from "react";
import type { BuilderElement } from "@/lib/builder-store";
import { cn } from "@/lib/utils";
import { RevealWrap } from "@/components/builder/reveal-wrap";
import { uploadCmsMedia, toVideoEmbedUrl } from "@/lib/supabase-storage";

const NOISE_BG =
  "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")";

// Cream "editorial" theme migration. The page-builder store still seeds legacy
// dark-theme color defaults (e.g. #1A0814 surfaces, #ffffff text) into element
// props. This renderer is the cream site's renderer, so we translate those
// known dark literals to their warm-cream equivalents at render time. Brand
// pinks/corals and any genuinely custom color the user picked pass through
// untouched — only the old near-black surfaces and white-on-dark text get
// remapped so published/edited pages read like the live editorial site.
const CREAM = "#FDFCF7";
const INK = "#221019";
const DARK_SURFACE_MAP: Record<string, string> = {
  "#1a0814": CREAM,
  "#3a0f2a": "#FFF7FB",
  "#2a0a1e": "#FFF7FB",
  "#2d1020": "#FFF7FB",
  "#1a0a12": CREAM,
};
// NOTE: this remaps these exact light values to ink UNCONDITIONALLY, so an
// admin who *deliberately* picks white text on a custom dark surface the
// mapper doesn't recognize gets forced to ink. That's an accepted tradeoff —
// the mapper can't distinguish "legacy default white" from "intentional white".
// Callers that render on a known-colored face (e.g. a gradient card front)
// should bypass this map; see the card case.
const WHITE_TEXT_MAP: Record<string, string> = {
  "#ffffff": INK,
  "#fff": INK,
  "#ffffff99": "rgba(34,16,25,0.66)",
  "#ffffffd9": "rgba(34,16,25,0.85)",
  "white": INK,
};

// Remap a legacy dark surface/background color value to its cream equivalent.
// Handles bare hex surfaces and dark-only gradient strings; passes through
// brand colors, custom values, and anything already light.
function creamSurface(v: unknown): string {
  if (typeof v !== "string" || !v) return v as string;
  const lower = v.toLowerCase();
  if (DARK_SURFACE_MAP[lower]) return DARK_SURFACE_MAP[lower];
  if (lower.includes("gradient")) {
    let out = v;
    for (const [dark, cream] of Object.entries(DARK_SURFACE_MAP)) {
      out = out.replace(new RegExp(dark, "gi"), cream);
    }
    return out;
  }
  return v;
}

// Remap legacy white-on-dark text colors to editorial ink. Brand-pink and
// custom text colors pass through.
function creamText(v: unknown): string {
  if (typeof v !== "string" || !v) return v as string;
  return WHITE_TEXT_MAP[v.toLowerCase()] ?? v;
}

interface Props {
  element: BuilderElement;
  editable?: boolean;
  onUpdate?: (props: Record<string, unknown>) => void;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ElementRenderer({ element, editable, onUpdate, onClick, isSelected }: Props) {
  const { type, props: p } = element;
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const wrapper = cn(
    "relative group/el transition-all",
    editable && "cursor-text",
    editable && isSelected && "ring-2 ring-[#FF0099] ring-offset-2 ring-offset-[#FDFCF7] rounded-lg",
    editable && !isSelected && "hover:ring-1 hover:ring-[#FF0099]/30 hover:ring-offset-1 hover:ring-offset-[#FDFCF7] rounded-lg",
  );

  const rv = (inner: React.ReactNode) => (
    <RevealWrap p={p} editable={editable} className="block w-full min-w-0">
      {inner}
    </RevealWrap>
  );

  function handleClick(e: React.MouseEvent) {
    if (!editable) return;
    e.stopPropagation();
    onClick?.();
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    key: string,
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset the input so re-picking the same file fires onChange again.
    e.target.value = "";
    setUploading(true);
    try {
      // Uploads to Supabase Storage and stores the URL (never a base64
      // blob — these elements persist as JSONB + stream over realtime).
      const url = await uploadCmsMedia(file);
      onUpdate?.({ [key]: url });
    } catch (err) {
      console.error("[builder] media upload failed", err);
    } finally {
      setUploading(false);
    }
  }

  switch (type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const sizes = { h1: "text-4xl sm:text-5xl lg:text-6xl", h2: "text-3xl sm:text-4xl", h3: "text-xl sm:text-2xl" };
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <Tag
              className={cn(
                "font-display text-ink outline-none",
                sizes[Tag],
                !!(p.textGlow as boolean) && "text-glow-pink",
                !!(p.ambientFloat as boolean) && !editable && "animate-float",
              )}
              style={{ color: creamText(p.color), textAlign: p.align as CanvasTextAlign }}
              contentEditable={!!editable}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
            >
              {p.text as string}
            </Tag>,
          )}
        </div>
      );
    }

    case "text":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <p
              className="leading-relaxed whitespace-pre-wrap outline-none text-ink-soft"
              style={{
                color: creamText(p.color),
                textAlign: p.align as CanvasTextAlign,
                fontSize: `${p.fontSize}px`,
              }}
              contentEditable={!!editable}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
            >
              {p.text as string}
            </p>,
          )}
        </div>
      );

    case "image":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input ref={fileRef} type="file" accept="image/*,image/gif" className="hidden" onChange={(e) => handleFileChange(e, "src")} />
          {(p.src as string) ? (
            <div className={cn("relative group/img", !!(p.ambientFloat as boolean) && !editable && "animate-float")}>
              <img
                src={p.src as string}
                alt={p.alt as string}
                className={cn(
                  "block max-w-full",
                  (p.align as string) === "left"
                    ? "mr-auto"
                    : (p.align as string) === "right"
                      ? "ml-auto"
                      : "mx-auto",
                )}
                style={{ width: p.width as string, borderRadius: `${p.borderRadius}px` }}
              />
              {editable && (
                <button
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute inset-0 flex items-center justify-center bg-[#221019]/45 backdrop-blur-[1px] opacity-0 group-hover/img:opacity-100 transition-opacity rounded-xl text-white text-sm font-semibold"
                >
                  {uploading ? "Uploading…" : "Click to replace image / GIF"}
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#FF0099]/30 bg-[#FF0099]/5 text-[#FF0099]/60 hover:bg-[#FF0099]/10 hover:border-[#FF0099]/50 transition-colors cursor-pointer"
              style={{ borderRadius: `${p.borderRadius}px` }}
            >
              <div className="text-center">
                <span className="text-3xl block mb-2">{uploading ? "⏳" : "📷"}</span>
                <span className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload image or GIF"}</span>
              </div>
            </button>
          )}
            </>,
          )}
        </div>
      );

    case "video":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileChange(e, "src")} />
          {(p.src as string) ? (
            <div className="relative group/vid">
              {toVideoEmbedUrl(p.src as string) ? (
                // YouTube / Vimeo embed
                <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: "16 / 9" }}>
                  <iframe
                    src={toVideoEmbedUrl(p.src as string) as string}
                    title={(p.alt as string) || "Embedded video"}
                    className="absolute inset-0 h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    // In the editor, don't let the iframe swallow clicks meant
                    // to select the element.
                    style={editable ? { pointerEvents: "none" } : undefined}
                  />
                </div>
              ) : (
                // Direct video file (mp4 / webm / Supabase upload)
                <video src={p.src as string} poster={p.poster as string} controls className="mx-auto w-full rounded-xl" autoPlay={p.autoplay as boolean} muted />
              )}
              {editable && (
                <button
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="absolute top-2 right-2 rounded-lg bg-[#221019]/55 backdrop-blur-[1px] px-3 py-1.5 text-xs font-medium text-white opacity-0 group-hover/vid:opacity-100 transition-opacity"
                >
                  Replace video
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              className="flex h-48 w-full items-center justify-center rounded-xl border-2 border-dashed border-[#FF0099]/30 bg-[#FF0099]/5 text-[#FF0099]/60 hover:bg-[#FF0099]/10 hover:border-[#FF0099]/50 transition-colors cursor-pointer"
            >
              <div className="text-center">
                <span className="text-3xl block mb-2">{uploading ? "⏳" : "🎬"}</span>
                <span className="text-sm font-medium">{uploading ? "Uploading…" : "Click to upload video"}</span>
                {!uploading && <span className="mt-1 block text-xs opacity-70">or paste a YouTube / Vimeo link in the panel</span>}
              </div>
            </button>
          )}
            </>,
          )}
        </div>
      );

    case "button": {
      const btnCustomStyle: React.CSSProperties = {};
      if (p.bgColor as string) btnCustomStyle.background = p.bgColor as string;
      if (p.textColor as string) btnCustomStyle.color = p.textColor as string;
      const shimmer = !!(p.shimmerEnabled as boolean) && !editable;

      const btnContent = (
        <span
          className={cn(
            "inline-block rounded-full px-8 py-3 font-semibold transition-all outline-none relative overflow-hidden",
            !(p.bgColor as string) && (p.variant as string) === "primary"
              ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
              : !(p.bgColor as string) && (p.variant as string) === "outline"
                ? "border border-[#221019]/15 text-ink hover:border-[#221019]/25 hover:bg-[#221019]/[0.04]"
                : !(p.bgColor as string)
                  ? "glass-strong text-ink elevate-1"
                  : "shadow-lg",
          )}
          style={btnCustomStyle}
          contentEditable={!!editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
        >
          {shimmer && (
            <span
              className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer bg-[length:200%_100%]"
              aria-hidden
            />
          )}
          <span className="relative z-[1]">{p.text as string}</span>
        </span>
      );

      return (
        <div className={wrapper} style={{ textAlign: p.align as CanvasTextAlign }} onClick={handleClick}>
          {rv(
            (p.href as string) && !editable ? (
              <a href={p.href as string} className="no-underline">{btnContent}</a>
            ) : (
              btnContent
            ),
          )}
        </div>
      );
    }

    case "spacer":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
              style={{ height: `${p.height}px` }}
              className={editable ? "border border-dashed border-[#221019]/10 rounded-lg bg-[#221019]/[0.02] flex items-center justify-center text-[#221019]/25 text-[10px]" : ""}
            >
              {editable && `Spacer ${p.height}px`}
            </div>,
          )}
        </div>
      );

    case "divider":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div className="flex justify-center">
              <hr className="border-0 h-px" style={{ backgroundColor: p.color as string, opacity: Number(p.opacity), width: p.width as string }} />
            </div>,
          )}
        </div>
      );

    case "card": {
      const cardBg = (p.gradientFrom as string) && (p.gradientTo as string)
        ? { background: `linear-gradient(135deg, ${creamSurface(p.gradientFrom)}, ${creamSurface(p.gradientTo)})` }
        : { backgroundColor: creamSurface(p.bgColor) };
      const flipBg = { background: `linear-gradient(135deg, ${p.flipGradientFrom || "#FF0099"}, ${p.flipGradientTo || "#B51760"})` };
      const cardImgRef = `card-img-${element.id}`;
      const hasFlip = !!(p.flipEnabled as boolean);
      const hasSpark = !!(p.sparkleEnabled as boolean);
      const hasGlow = !!(p.glowEnabled as boolean);
      const sparkCount = parseInt(p.sparkleCount as string, 10) || 10;
      const hoverLift = !!(p.hoverLift as boolean);
      const borderGlow = !!(p.borderGlow as boolean);
      const liftCls = hoverLift ? "transition-transform duration-300 hover:-translate-y-1" : "";
      const glowCls = borderGlow ? "border-glow" : "";

      function CardFace({ isFront }: { isFront: boolean }) {
        const style = isFront ? cardBg : flipBg;
        const title = isFront ? (p.title as string) : ((p.flipTitle as string) || (p.title as string));
        const desc = isFront ? (p.description as string) : ((p.flipDescription as string) || (p.description as string));
        // Front face uses a gradient when both stops are set (mirrors cardBg).
        // On a colored gradient face the chosen light text is correct for
        // contrast, so pass it through; only remap legacy white→ink when the
        // face is a plain light/cream surface. Title + description stay
        // consistent on whichever face they sit on.
        const frontGradient = !!((p.gradientFrom as string) && (p.gradientTo as string));
        const titleColor = isFront
          ? (frontGradient ? ((p.textColor as string) || "#ffffff") : (creamText(p.textColor) || "#221019"))
          : ((p.flipTextColor as string) || "#ffffff");
        const descClr = isFront
          ? (frontGradient ? ((p.descColor as string) || "rgba(255,255,255,0.9)") : (creamText(p.descColor) || "rgba(34,16,25,0.66)"))
          : ((p.flipDescColor as string) || "rgba(255,255,255,0.85)");
        const titleKey = isFront ? "title" : "flipTitle";
        const descKey = isFront ? "description" : "flipDescription";
        const faceFx = !hasFlip || !!editable;

        return (
          <div
            className={cn("rounded-2xl overflow-hidden border h-full", faceFx && liftCls, faceFx && glowCls)}
            style={{ ...style, borderColor: `${p.borderColor as string}33` }}
          >
            {isFront && (p.image as string) ? (
              <div className="relative group/cimg">
                <img src={p.image as string} alt="" className="w-full h-44 object-cover" />
                {editable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); (document.getElementById(cardImgRef) as HTMLInputElement)?.click(); }}
                    className="absolute inset-0 flex items-center justify-center bg-[#221019]/45 backdrop-blur-[1px] opacity-0 group-hover/cimg:opacity-100 transition-opacity text-white text-xs font-semibold"
                  >
                    Replace image
                  </button>
                )}
              </div>
            ) : isFront && editable ? (
              <button
                onClick={(e) => { e.stopPropagation(); (document.getElementById(cardImgRef) as HTMLInputElement)?.click(); }}
                className="flex h-24 w-full items-center justify-center border-b border-[#221019]/10 bg-[#221019]/[0.03] text-[#221019]/40 hover:bg-[#FF0099]/5 transition-colors text-xs"
              >
                + Add card image (optional)
              </button>
            ) : null}
            <div className={cn("p-6 flex flex-col", !isFront && "h-full justify-center")}>
              {isFront && (p.emoji as string) && (
                <span className="text-3xl mb-2 block">{p.emoji as string}</span>
              )}
              {!isFront && (p.emoji as string) && (
                <span className="text-3xl mb-2 block">{p.emoji as string}</span>
              )}
              <h3
                className="text-xl font-display mb-2 outline-none"
                style={{ color: titleColor }}
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ [titleKey]: e.currentTarget.textContent || "" })}
              >
                {title}
              </h3>
              <p
                className="text-sm leading-relaxed outline-none"
                style={{ color: descClr }}
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ [descKey]: e.currentTarget.textContent || "" })}
              >
                {desc}
              </p>
            </div>
          </div>
        );
      }

      const cardContent = hasFlip && !editable ? (
        <div className={cn("group [perspective:1200px]", liftCls, glowCls)} style={{ minHeight: "200px" }}>
          <div className="flip-card-inner relative h-full w-full [transform-style:preserve-3d]" style={{ minHeight: "inherit" }}>
            <div className="absolute inset-0 [backface-visibility:hidden]">
              <CardFace isFront />
            </div>
            <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
              <CardFace isFront={false} />
            </div>
            {hasSpark && (
              <div className="pointer-events-none absolute inset-0 z-30">
                {Array.from({ length: sparkCount }).map((_, i) => (
                  <span
                    key={i}
                    className="sparkle-particle absolute left-1/2 top-1/2 h-1 w-1 rounded-full"
                    style={{ ["--i" as string]: i, backgroundColor: (p.sparkleColor as string) || "#ffffff" }}
                  />
                ))}
              </div>
            )}
            {hasGlow && (
              <div
                className="flip-glow pointer-events-none absolute inset-0 z-20 rounded-2xl"
                style={{ ["--glow-color" as string]: (p.glowColor as string) || "#FF0099" }}
              />
            )}
          </div>
        </div>
      ) : (
        <CardFace isFront />
      );

      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input type="file" accept="image/*" className="hidden" id={cardImgRef} onChange={(e) => handleFileChange(e, "image")} />
          {(p.href as string) && !editable ? (
            <a href={p.href as string} className="block no-underline">{cardContent}</a>
          ) : cardContent}
          {editable && hasFlip && (
            <div className="mt-2 rounded-lg border border-dashed border-[#FF0099]/20 bg-[#FF0099]/5 p-3">
              <p className="text-[9px] uppercase tracking-wider text-[#FF0099]/40 font-bold mb-2">Flip Back (hover preview)</p>
              <CardFace isFront={false} />
            </div>
          )}
            </>,
          )}
        </div>
      );
    }

    case "section": {
      const pat = (p.patternType as string) || "none";
      const patOp = Math.min(1, Math.max(0, Number(p.patternOpacity) / 100 || 0.15));
      const radGlow = Math.min(1, Math.max(0, Number(p.radialGlow) / 100 || 0));

      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <section
              className="rounded-2xl relative overflow-hidden"
              style={{
                backgroundColor: creamSurface(p.bgColor),
                background: creamSurface((p.bgGradient as string) || (p.bgColor as string)),
                padding: `${p.padding}px 24px`,
                maxWidth: `${p.maxWidth}px`,
                margin: "0 auto",
              }}
            >
              {radGlow > 0 && (
                <div
                  className="pointer-events-none absolute inset-0 rounded-2xl z-[1]"
                  style={{
                    background: `radial-gradient(ellipse 70% 55% at 50% 0%, oklch(0.65 0.2 340 / ${radGlow * 0.45}) , transparent 62%)`,
                  }}
                />
              )}
              {pat !== "none" && (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 rounded-2xl z-[1]",
                    pat === "dots" && "pattern-dots",
                    pat === "grid" && "pattern-grid",
                  )}
                  style={{ opacity: patOp }}
                />
              )}
              {(p.borderTop as boolean) && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/30 to-transparent z-[2]" />
              )}
              {editable && (
                <div className="absolute top-2 left-3 text-[9px] uppercase tracking-wider text-[#221019]/30 font-bold pointer-events-none z-[2]">Section</div>
              )}
              <div className="relative z-[3]">
                {element.children && element.children.length > 0 ? (
                  <div className="space-y-4">
                    {element.children.map((child) => (
                      <ElementRenderer key={child.id} element={child} editable={editable} onUpdate={onUpdate} onClick={onClick} isSelected={false} />
                    ))}
                  </div>
                ) : editable ? (
                  <div className="flex h-20 items-center justify-center border border-dashed border-[#221019]/12 rounded-xl text-[#221019]/30 text-xs">
                    Section container
                  </div>
                ) : null}
              </div>
            </section>,
          )}
        </div>
      );
    }

    case "hero": {
      const heroImgRef = `hero-bg-${element.id}`;
      const bokehOp = Math.min(0.25, Math.max(0.02, Number(p.bokehOpacity) / 100 || 0.12));
      const showBokeh = !!(p.showBokeh as boolean);
      const showStars = !!(p.showStars as boolean);
      const showNoise = !!(p.showNoise as boolean);
      const heroCta = (
        <span
          className="inline-block rounded-full px-10 py-3.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white font-semibold shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110 transition-all outline-none"
          contentEditable={!!editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ ctaText: e.currentTarget.textContent || "" })}
        >
          {p.ctaText as string}
        </span>
      );
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input type="file" accept="image/*" className="hidden" id={heroImgRef} onChange={(e) => handleFileChange(e, "bgImage")} />
          <div
            className="relative rounded-2xl overflow-hidden flex items-center justify-center"
            style={{ minHeight: `${p.minHeight}px`, background: creamSurface(p.bgGradient) }}
          >
            {(p.bgImage as string) && (
              <img src={p.bgImage as string} alt="" className="absolute inset-0 w-full h-full object-cover z-0" />
            )}
            {showBokeh && !editable && (
              <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
                {[
                  { l: "12%", t: "18%", w: 176, h: 176 },
                  { l: "68%", t: "12%", w: 200, h: 200 },
                  { l: "42%", t: "58%", w: 168, h: 168 },
                ].map((b, i) => (
                  <div
                    key={i}
                    className="absolute rounded-full blur-[80px] bg-[#B51760]"
                    style={{ left: b.l, top: b.t, width: b.w, height: b.h, opacity: bokehOp }}
                  />
                ))}
              </div>
            )}
            {showStars && !editable && (
              <div className="pointer-events-none absolute inset-0 z-[1]">
                {["12% 22%", "78% 18%", "22% 72%", "70% 68%", "48% 12%"].map((pos, i) => (
                  <span
                    key={i}
                    className="absolute h-0.5 w-0.5 rounded-full bg-[#FF0099]/60 animate-pulse"
                    style={{ left: pos.split(" ")[0], top: pos.split(" ")[1], animationDelay: `${i * 0.4}s` }}
                  />
                ))}
              </div>
            )}
            {showNoise && (
              <div
                className="pointer-events-none absolute inset-0 z-[1] opacity-[0.035]"
                style={{ backgroundImage: NOISE_BG }}
              />
            )}
            <div className="absolute inset-0 z-[2]" style={{ backgroundColor: `rgba(253,252,247,${p.overlayOpacity})` }} />
            <div className="relative z-10 text-center px-6 py-16 space-y-6" style={{ textAlign: p.align as CanvasTextAlign }}>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-display text-ink text-balance outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ title: e.currentTarget.textContent || "" })}
              >
                {p.title as string}
              </h1>
              <p
                className="text-lg sm:text-xl text-ink-soft max-w-2xl mx-auto outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ subtitle: e.currentTarget.textContent || "" })}
              >
                {p.subtitle as string}
              </p>
              <div>
                {(p.ctaHref as string) && !editable ? (
                  <a href={p.ctaHref as string} className="no-underline">{heroCta}</a>
                ) : heroCta}
              </div>
              {editable && (
                <button
                  onClick={(e) => { e.stopPropagation(); (document.getElementById(heroImgRef) as HTMLInputElement)?.click(); }}
                  className="mt-4 inline-block rounded-full glass-strong border border-[#221019]/12 px-4 py-1.5 text-[10px] text-ink-soft hover:text-ink hover:bg-white/60 transition-colors"
                >
                  {(p.bgImage as string) ? "Change Background Image" : "+ Add Background Image"}
                </button>
              )}
            </div>
          </div>
            </>,
          )}
        </div>
      );
    }

    case "testimonial": {
      const testimonialAvatarRef = `testimonial-avatar-${element.id}`;
      const avatarGlow = !!(p.avatarPulseGlow as boolean) && !editable;
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input type="file" accept="image/*" className="hidden" id={testimonialAvatarRef} onChange={(e) => handleFileChange(e, "avatarImage")} />
          <div className="rounded-2xl p-6 glass elevate-2">
            <div className="flex items-start gap-4">
              <div
                className={cn(
                  "relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden group/avatar cursor-pointer",
                  avatarGlow && "animate-pulse-glow",
                )}
                style={{ background: `linear-gradient(135deg, ${p.gradientFrom}, ${p.gradientTo})` }}
                onClick={(e) => { if (editable) { e.stopPropagation(); (document.getElementById(testimonialAvatarRef) as HTMLInputElement)?.click(); } }}
              >
                {(p.avatarImage as string) ? (
                  <img src={p.avatarImage as string} alt="" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  p.avatarInitials as string
                )}
                {editable && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white">📷</div>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <p
                  className="font-display-italic text-ink leading-relaxed outline-none"
                  contentEditable={!!editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate?.({ quote: e.currentTarget.textContent || "" })}
                >
                  &ldquo;{p.quote as string}&rdquo;
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <span
                    className="text-ink font-semibold outline-none"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ name: e.currentTarget.textContent || "" })}
                  >
                    {p.name as string}
                  </span>
                  <span className="text-ink-soft/50">·</span>
                  <span
                    className="text-ink-soft outline-none"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ location: e.currentTarget.textContent || "" })}
                  >
                    {p.location as string}
                  </span>
                </div>
                <span
                  className="inline-block text-xs text-[#FF0099] outline-none"
                  contentEditable={!!editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate?.({ tripName: e.currentTarget.textContent || "" })}
                >
                  {p.tripName as string}
                </span>
              </div>
            </div>
          </div>
            </>,
          )}
        </div>
      );
    }

    case "gallery":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
            className="grid"
            style={{
              gridTemplateColumns: `repeat(${p.columns}, 1fr)`,
              gap: `${p.gap}px`,
            }}
          >
            {((p.images as string[]) || []).map((src, i) => (
              <div key={i} className="relative group/gimg">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id={`gallery-${element.id}-${i}`}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    e.target.value = "";
                    setUploading(true);
                    try {
                      const url = await uploadCmsMedia(file);
                      const imgs = [...(p.images as string[])];
                      imgs[i] = url;
                      onUpdate?.({ images: imgs });
                    } catch (err) {
                      console.error("[builder] gallery upload failed", err);
                    } finally {
                      setUploading(false);
                    }
                  }}
                />
                {src ? (
                  <>
                    <img src={src} alt="" className="w-full aspect-square object-cover" style={{ borderRadius: `${p.borderRadius}px` }} />
                    {editable && (
                      <button
                        onClick={(e) => { e.stopPropagation(); (document.getElementById(`gallery-${element.id}-${i}`) as HTMLInputElement)?.click(); }}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/gimg:opacity-100 transition-opacity text-white text-xs font-semibold"
                        style={{ borderRadius: `${p.borderRadius}px` }}
                      >
                        Replace
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={(e) => { e.stopPropagation(); (document.getElementById(`gallery-${element.id}-${i}`) as HTMLInputElement)?.click(); }}
                    className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-[#FF0099]/30 bg-[#FF0099]/5 text-[#FF0099]/50 hover:bg-[#FF0099]/10 transition-colors text-xs"
                    style={{ borderRadius: `${p.borderRadius}px` }}
                  >
                    + Image
                  </button>
                )}
              </div>
            ))}
            {editable && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdate?.({ images: [...(p.images as string[]), ""] });
                }}
                className="w-full aspect-square flex items-center justify-center border-2 border-dashed border-[#221019]/12 bg-[#221019]/[0.02] text-[#221019]/30 hover:bg-[#FF0099]/5 transition-colors text-xs rounded-xl"
              >
                + Add slot
              </button>
            )}
          </div>,
          )}
        </div>
      );

    case "trip-card": {
      const tripImgRef = `trip-img-${element.id}`;
      const tripLift = !!(p.hoverLift as boolean);
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <>
          <input type="file" accept="image/*" className="hidden" id={tripImgRef} onChange={(e) => handleFileChange(e, "image")} />
          <div
            className={cn(
              "rounded-2xl border border-[#FF0099]/15 glass-strong elevate-2 overflow-hidden hover:border-[#FF0099]/30 transition-colors",
              tripLift && "hover:-translate-y-1 hover:shadow-[var(--elevation-3)] duration-300",
            )}
          >
            {(p.image as string) ? (
              <div className="relative group/tripimg h-40">
                <img src={p.image as string} alt="" className="w-full h-full object-cover" />
                {editable && (
                  <button
                    onClick={(e) => { e.stopPropagation(); (document.getElementById(tripImgRef) as HTMLInputElement)?.click(); }}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/tripimg:opacity-100 transition-opacity text-white text-xs font-semibold"
                  >
                    Replace image
                  </button>
                )}
              </div>
            ) : editable ? (
              <button
                onClick={(e) => { e.stopPropagation(); (document.getElementById(tripImgRef) as HTMLInputElement)?.click(); }}
                className="w-full h-24 flex items-center justify-center border-b border-[#221019]/8 bg-[#221019]/[0.02] text-[#221019]/35 hover:bg-[#FF0099]/5 transition-colors text-xs"
              >
                + Add trip image (optional)
              </button>
            ) : null}
            <div className="p-6 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{p.emoji as string}</span>
                <div>
                  <h3
                    className="text-lg text-ink outline-none font-display"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ destination: e.currentTarget.textContent || "" })}
                  >
                    {p.destination as string}
                  </h3>
                  <span
                    className="text-sm text-ink-soft outline-none"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ dates: e.currentTarget.textContent || "" })}
                  >
                    {p.dates as string}
                  </span>
                </div>
              </div>
              <span className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase",
                (p.status as string) === "open" ? "bg-green-600/15 text-green-700" :
                (p.status as string) === "waitlist" ? "bg-amber-500/15 text-amber-700" :
                "bg-red-500/15 text-red-700"
              )}>
                {p.status as string}
              </span>
            </div>
            <p
              className="text-sm text-ink-soft leading-relaxed outline-none"
              contentEditable={!!editable}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ description: e.currentTarget.textContent || "" })}
            >
              {p.description as string}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-[#221019]/8">
              <span
                className="text-2xl font-bold text-[#FF0099] outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ price: e.currentTarget.textContent || "" })}
              >
                {p.price as string}
              </span>
              {(() => {
                const tripCta = (
                  <span
                    className="inline-block rounded-full px-5 py-2 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white text-sm font-semibold shadow-[0_6px_18px_rgb(255_0_153/0.22)] outline-none"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ ctaText: e.currentTarget.textContent || "" })}
                  >
                    {p.ctaText as string}
                  </span>
                );
                return (p.ctaHref as string) && !editable
                  ? <a href={p.ctaHref as string} className="no-underline">{tripCta}</a>
                  : tripCta;
              })()}
            </div>
          </div>
          </div>
            </>,
          )}
        </div>
      );
    }

    case "event-card": {
      const evLift = !!(p.hoverLift as boolean);
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
              className={cn(
                "rounded-2xl glass elevate-1 p-5 flex gap-4 hover:border-[#FF0099]/30 transition-colors",
                evLift && "hover:-translate-y-0.5 duration-300",
              )}
            >
            <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-gradient-to-br from-[#FF0099] to-[#B51760] flex flex-col items-center justify-center text-white">
              <span
                className="text-[10px] font-bold uppercase outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ dateMonth: e.currentTarget.textContent || "" })}
              >
                {p.dateMonth as string}
              </span>
              <span
                className="text-2xl font-bold leading-none outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ dateDay: e.currentTarget.textContent || "" })}
              >
                {p.dateDay as string}
              </span>
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between">
                <h3
                  className="text-base font-display text-ink outline-none"
                  contentEditable={!!editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate?.({ title: e.currentTarget.textContent || "" })}
                >
                  {p.title as string}
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FF0099]/12 text-[#B51760] font-semibold uppercase">
                  {p.type as string}
                </span>
              </div>
              <p className="text-xs text-ink-soft/70">{p.location as string}</p>
              <p
                className="text-sm text-ink-soft outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ description: e.currentTarget.textContent || "" })}
              >
                {p.description as string}
              </p>
            </div>
          </div>,
          )}
        </div>
      );
    }

    case "pricing": {
      const prLift = !!(p.hoverLift as boolean);
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
              className={cn(
                "rounded-2xl p-6 space-y-5",
                (p.highlight as boolean) ? "glass-strong elevate-3 border border-[#FF0099]/30" : "glass elevate-2",
                prLift && "hover:-translate-y-0.5 duration-300",
              )}
            >
            {(p.highlight as boolean) && (
              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-[#FF0099]/12 text-[#B51760] text-[10px] font-bold uppercase tracking-wider">Most Popular</span>
              </div>
            )}
            <h3
              className="text-xl text-ink text-center outline-none font-display"
              contentEditable={!!editable}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ title: e.currentTarget.textContent || "" })}
            >
              {p.title as string}
            </h3>
            <div className="text-center">
              <span className="text-4xl font-display text-ink">{p.currency as string}{p.price as string}</span>
              <span className="text-ink-soft/70 text-sm ml-2">{p.period as string}</span>
            </div>
            <ul className="space-y-2">
              {((p.features as string[]) || []).map((feat, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-ink-soft">
                  <span className="text-[#FF0099]">✓</span>
                  <span
                    className="outline-none flex-1"
                    contentEditable={!!editable}
                    suppressContentEditableWarning
                    onBlur={(e) => {
                      const feats = [...(p.features as string[])];
                      feats[i] = e.currentTarget.textContent || "";
                      onUpdate?.({ features: feats });
                    }}
                  >
                    {feat}
                  </span>
                </li>
              ))}
            </ul>
            {editable && (
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate?.({ features: [...(p.features as string[]), "New feature"] }); }}
                className="w-full text-center text-xs text-[#221019]/30 hover:text-[#FF0099]/70 transition-colors py-1"
              >
                + Add feature
              </button>
            )}
            <div className="text-center pt-2">
              <span
                className="inline-block rounded-full px-8 py-3 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white font-semibold w-full text-center shadow-[0_8px_30px_rgb(255_0_153/0.30)] outline-none"
                contentEditable={!!editable}
                suppressContentEditableWarning
                onBlur={(e) => onUpdate?.({ ctaText: e.currentTarget.textContent || "" })}
              >
                {p.ctaText as string}
              </span>
            </div>
          </div>,
          )}
        </div>
      );
    }

    case "countdown":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <CountdownRenderer
              targetDate={p.targetDate as string}
              label={p.label as string}
              bgColor={creamSurface(p.bgColor)}
              accentColor={p.accentColor as string}
              pulseGlow={!!(p.pulseGlow as boolean)}
              editable={!!editable}
              onUpdate={onUpdate}
            />,
          )}
        </div>
      );

    case "columns-2":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: `${p.gap}px` }}>
              {[0, 1].map((col) => {
                const colChildren = element.children?.filter((_, i) => i % 2 === col) || [];
                return (
                  <div key={col} className="space-y-4">
                    {colChildren.length > 0 ? (
                      colChildren.map((child) => (
                        <ElementRenderer key={child.id} element={child} editable={editable} onUpdate={onUpdate} onClick={onClick} isSelected={false} />
                      ))
                    ) : editable ? (
                      <div className="flex h-24 items-center justify-center border border-dashed border-[#221019]/12 rounded-xl text-[#221019]/30 text-xs">
                        Column {col + 1}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>,
          )}
        </div>
      );

    case "banner": {
      const bannerSpeed = Math.max(4, Number(p.speed) || 30);
      const strip = !!(p.shimmerStrip as boolean) && !editable;
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
              className="overflow-hidden rounded-xl py-3 relative"
              style={{ backgroundColor: p.bgColor as string }}
            >
              {strip && (
                <div
                  className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent animate-shimmer bg-[length:200%_100%] z-[1]"
                  aria-hidden
                />
              )}
              <div
                className="whitespace-nowrap flex gap-12"
                style={{ animation: `marquee ${bannerSpeed}s linear infinite` }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className="font-semibold tracking-wide outline-none"
                    style={{ color: p.textColor as string, fontSize: `${p.fontSize}px` }}
                    contentEditable={!!editable && i === 0}
                    suppressContentEditableWarning
                    onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
                  >
                    {p.text as string}
                  </span>
                ))}
              </div>
            </div>,
          )}
        </div>
      );
    }

    case "faq-item":
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <FaqItemRenderer
              question={p.question as string}
              answer={p.answer as string}
              editable={!!editable}
              onUpdate={onUpdate}
              onOuterClick={handleClick}
            />,
          )}
        </div>
      );

    case "cta-block": {
      const primShimmer = !!(p.primaryShimmer as boolean) && !editable;
      const ctaGlow = !!(p.borderGlow as boolean);
      const primaryBtn = (
        <span
          className="inline-block rounded-full px-8 py-3 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white font-semibold shadow-[0_8px_30px_rgb(255_0_153/0.30)] outline-none relative overflow-hidden"
          contentEditable={!!editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ primaryText: e.currentTarget.textContent || "" })}
        >
          {primShimmer && (
            <span
              className="pointer-events-none absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white/18 to-transparent animate-shimmer bg-[length:200%_100%]"
              aria-hidden
            />
          )}
          <span className="relative z-[1]">{p.primaryText as string}</span>
        </span>
      );
      const secondaryBtn = (
        <span
          className="inline-block rounded-full px-8 py-3 border border-[#221019]/15 text-ink font-semibold outline-none hover:border-[#221019]/25 hover:bg-[#221019]/[0.04] transition-colors"
          contentEditable={!!editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ secondaryText: e.currentTarget.textContent || "" })}
        >
          {p.secondaryText as string}
        </span>
      );
      return (
        <div className={wrapper} onClick={handleClick}>
          {rv(
            <div
              className={cn(
                "rounded-2xl p-8 sm:p-12 text-center space-y-5 relative overflow-hidden",
                ctaGlow && "border-glow",
              )}
              style={{ background: creamSurface(p.bgGradient) }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#FF0099]/8 via-transparent to-[#FF7F50]/8" />
              <div className="relative z-10 space-y-5">
                <h2
                  className="text-2xl sm:text-3xl text-ink font-display outline-none"
                  contentEditable={!!editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate?.({ heading: e.currentTarget.textContent || "" })}
                >
                  {p.heading as string}
                </h2>
                <p
                  className="text-ink-soft max-w-xl mx-auto outline-none"
                  contentEditable={!!editable}
                  suppressContentEditableWarning
                  onBlur={(e) => onUpdate?.({ description: e.currentTarget.textContent || "" })}
                >
                  {p.description as string}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-4">
                  {(p.primaryHref as string) && !editable ? (
                    <a href={p.primaryHref as string} className="no-underline">{primaryBtn}</a>
                  ) : primaryBtn}
                  {(p.secondaryHref as string) && !editable ? (
                    <a href={p.secondaryHref as string} className="no-underline">{secondaryBtn}</a>
                  ) : secondaryBtn}
                </div>
              </div>
            </div>,
          )}
        </div>
      );
    }

    default:
      return null;
  }
}

function CountdownRenderer({ targetDate, label, bgColor, accentColor, pulseGlow, editable, onUpdate }: {
  targetDate: string; label: string; bgColor: string; accentColor: string; pulseGlow: boolean; editable: boolean;
  onUpdate?: (props: Record<string, unknown>) => void;
}) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    function calc() {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    calc();
    const id = setInterval(calc, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  const units = [
    { val: timeLeft.days, lbl: "Days" },
    { val: timeLeft.hours, lbl: "Hours" },
    { val: timeLeft.minutes, lbl: "Min" },
    { val: timeLeft.seconds, lbl: "Sec" },
  ];

  return (
    <div
      className={cn("rounded-2xl p-6 text-center space-y-4", pulseGlow && !editable && "animate-pulse-glow")}
      style={{ backgroundColor: bgColor }}
    >
      <p
        className="text-sm font-semibold uppercase tracking-wider text-ink-soft outline-none"
        contentEditable={editable}
        suppressContentEditableWarning
        onBlur={(e) => onUpdate?.({ label: e.currentTarget.textContent || "" })}
      >
        {label}
      </p>
      <div className="flex items-center justify-center gap-3 sm:gap-5">
        {units.map((u) => (
          <div key={u.lbl} className="flex flex-col items-center">
            <span className="text-3xl sm:text-5xl font-display text-ink tabular-nums" style={{ color: accentColor }}>
              {String(u.val).padStart(2, "0")}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-ink-soft/70 mt-1">{u.lbl}</span>
          </div>
        ))}
      </div>
      {editable && (
        <div className="pt-2">
          <label className="text-[10px] text-ink-soft/70 mr-2">Target date:</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => onUpdate?.({ targetDate: e.target.value })}
            className="bg-white/60 border border-[#221019]/12 rounded px-2 py-1 text-xs text-ink"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function FaqItemRenderer({ question, answer, editable, onUpdate, onOuterClick }: {
  question: string; answer: string; editable: boolean;
  onUpdate?: (props: Record<string, unknown>) => void;
  onOuterClick?: (e: React.MouseEvent) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl glass elevate-1 overflow-hidden">
      <button
        className="w-full flex items-center justify-between p-4 text-left"
        onClick={(e) => {
          e.stopPropagation();
          if (!editable) setOpen(!open);
          onOuterClick?.(e);
        }}
      >
        <span
          className="text-ink font-semibold outline-none flex-1"
          contentEditable={editable}
          suppressContentEditableWarning
          onBlur={(e) => onUpdate?.({ question: e.currentTarget.textContent || "" })}
          onClick={(e) => editable && e.stopPropagation()}
        >
          {question}
        </span>
        <span className={cn("text-[#FF0099]/60 transition-transform ml-3 text-lg", open && "rotate-180")}>▾</span>
      </button>
      {(open || editable) && (
        <div className="px-4 pb-4">
          <p
            className="text-sm text-ink-soft leading-relaxed outline-none"
            contentEditable={editable}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.({ answer: e.currentTarget.textContent || "" })}
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
