"use client";

import type { BuilderElement } from "@/lib/builder-store";
import { cn } from "@/lib/utils";

interface Props {
  element: BuilderElement;
  editable?: boolean;
  onUpdate?: (props: Record<string, unknown>) => void;
  onClick?: () => void;
  isSelected?: boolean;
}

export function ElementRenderer({ element, editable, onUpdate, onClick, isSelected }: Props) {
  const { type, props: p } = element;

  const wrapper = cn(
    "relative group/el transition-all",
    editable && "cursor-pointer",
    editable && isSelected && "ring-2 ring-[#E8458B] ring-offset-2 ring-offset-[#0d060a] rounded-lg",
    editable && !isSelected && "hover:ring-1 hover:ring-[#E8458B]/40 hover:ring-offset-1 hover:ring-offset-[#0d060a] rounded-lg",
  );

  function handleClick(e: React.MouseEvent) {
    if (!editable) return;
    e.stopPropagation();
    onClick?.();
  }

  switch (type) {
    case "heading": {
      const Tag = (p.level as string) === "h1" ? "h1" : (p.level as string) === "h3" ? "h3" : "h2";
      const sizes = { h1: "text-4xl sm:text-5xl lg:text-6xl", h2: "text-3xl sm:text-4xl", h3: "text-xl sm:text-2xl" };
      return (
        <div className={wrapper} onClick={handleClick}>
          <Tag
            className={cn(
              "font-[family-name:var(--font-heading)] font-bold",
              sizes[Tag],
            )}
            style={{ color: p.color as string, textAlign: p.align as CanvasTextAlign }}
            contentEditable={editable && isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
          >
            {p.text as string}
          </Tag>
        </div>
      );
    }

    case "text":
      return (
        <div className={wrapper} onClick={handleClick}>
          <p
            className="leading-relaxed whitespace-pre-wrap"
            style={{
              color: p.color as string,
              textAlign: p.align as CanvasTextAlign,
              fontSize: `${p.fontSize}px`,
            }}
            contentEditable={editable && isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
          >
            {p.text as string}
          </p>
        </div>
      );

    case "image":
      return (
        <div className={wrapper} onClick={handleClick}>
          {(p.src as string) ? (
            <img
              src={p.src as string}
              alt={p.alt as string}
              className="mx-auto max-w-full"
              style={{
                width: p.width as string,
                borderRadius: `${p.borderRadius}px`,
              }}
            />
          ) : (
            <div
              className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 text-white/40"
              style={{ borderRadius: `${p.borderRadius}px` }}
            >
              <div className="text-center">
                <span className="text-3xl block mb-1">🖼️</span>
                <span className="text-sm">Click to add image</span>
              </div>
            </div>
          )}
        </div>
      );

    case "video":
      return (
        <div className={wrapper} onClick={handleClick}>
          {(p.src as string) ? (
            <video
              src={p.src as string}
              poster={p.poster as string}
              controls
              className="mx-auto w-full rounded-xl"
              autoPlay={p.autoplay as boolean}
              muted
            />
          ) : (
            <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-white/20 bg-white/5 text-white/40">
              <div className="text-center">
                <span className="text-3xl block mb-1">🎬</span>
                <span className="text-sm">Click to add video</span>
              </div>
            </div>
          )}
        </div>
      );

    case "button":
      return (
        <div className={wrapper} style={{ textAlign: p.align as CanvasTextAlign }} onClick={handleClick}>
          <a
            href={editable ? undefined : (p.href as string)}
            className={cn(
              "inline-block rounded-xl px-8 py-3 font-semibold transition-all",
              (p.variant as string) === "primary"
                ? "bg-gradient-to-r from-[#E8458B] to-[#D4357A] text-white hover:brightness-110 shadow-lg shadow-[#E8458B]/20"
                : (p.variant as string) === "outline"
                  ? "border border-white/30 text-white hover:bg-white/10"
                  : "bg-white text-black hover:bg-white/90",
            )}
            contentEditable={editable && isSelected}
            suppressContentEditableWarning
            onBlur={(e) => onUpdate?.({ text: e.currentTarget.textContent || "" })}
          >
            {p.text as string}
          </a>
        </div>
      );

    case "spacer":
      return (
        <div className={wrapper} onClick={handleClick}>
          <div style={{ height: `${p.height}px` }} className={editable ? "border border-dashed border-white/10 rounded-lg bg-white/[0.02]" : ""} />
        </div>
      );

    case "divider":
      return (
        <div className={wrapper} onClick={handleClick}>
          <div className="flex justify-center">
            <hr
              className="border-0 h-px"
              style={{
                backgroundColor: p.color as string,
                opacity: Number(p.opacity),
                width: p.width as string,
              }}
            />
          </div>
        </div>
      );

    case "card":
      return (
        <div className={wrapper} onClick={handleClick}>
          <div
            className="rounded-2xl p-6 border"
            style={{
              backgroundColor: p.bgColor as string,
              borderColor: `${p.borderColor as string}33`,
            }}
          >
            <h3
              className="text-xl font-bold font-[family-name:var(--font-heading)] text-white mb-2"
              contentEditable={editable && isSelected}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ title: e.currentTarget.textContent || "" })}
            >
              {p.title as string}
            </h3>
            <p
              className="text-white/60 text-sm leading-relaxed"
              contentEditable={editable && isSelected}
              suppressContentEditableWarning
              onBlur={(e) => onUpdate?.({ description: e.currentTarget.textContent || "" })}
            >
              {p.description as string}
            </p>
          </div>
        </div>
      );

    default:
      return null;
  }
}
