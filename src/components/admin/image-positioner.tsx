"use client";

/**
 * Focal-point picker for a trip's cover photo. Trip cards crop the image with
 * `object-cover` into a fixed-height area, so an off-center subject can get
 * cut awkwardly. This lets the admin drag a focal point over a live preview;
 * the value is a CSS `object-position` string (e.g. "50% 30%") applied to the
 * same <Image> on the public cards.
 *
 * Dragging maps the marker linearly to object-position percentages — the
 * standard focal-point convention — so what you preview is what crops.
 */

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

interface ImagePositionerProps {
  src: string;
  /** CSS object-position, e.g. "50% 30%". */
  value?: string;
  onChange: (value: string) => void;
}

const DEFAULT_POS = "50% 50%";

/** Parse "x% y%" into {x,y} numbers, clamped 0–100, defaulting to center. */
function parsePos(value?: string): { x: number; y: number } {
  const m = (value ?? "").match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!m) return { x: 50, y: 50 };
  const clamp = (n: number) => Math.min(100, Math.max(0, n));
  return { x: clamp(parseFloat(m[1])), y: clamp(parseFloat(m[2])) };
}

const PRESETS: { label: string; pos: string }[] = [
  { label: "Center", pos: "50% 50%" },
  { label: "Top", pos: "50% 0%" },
  { label: "Bottom", pos: "50% 100%" },
  { label: "Left", pos: "0% 50%" },
  { label: "Right", pos: "100% 50%" },
];

export function ImagePositioner({ src, value, onChange }: ImagePositionerProps) {
  const { x, y } = parsePos(value);
  const boxRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const setFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const box = boxRef.current;
      if (!box) return;
      const rect = box.getBoundingClientRect();
      const px = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const py = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      onChange(`${Math.round(px)}% ${Math.round(py)}%`);
    },
    [onChange],
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setFromPointer(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setFromPointer(e.clientX, e.clientY);
  };

  const stopDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
  };

  return (
    <div className="grid gap-2">
      <div
        ref={boxRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        className="relative aspect-[16/9] w-full cursor-crosshair touch-none select-none overflow-hidden rounded-lg border border-input bg-muted"
        role="application"
        aria-label="Drag to set the photo focal point"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Position preview"
          draggable={false}
          className="pointer-events-none h-full w-full object-cover"
          style={{ objectPosition: `${x}% ${y}%` }}
        />
        {/* subtle rule-of-thirds guides */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/3 top-0 h-full w-px bg-white/20" />
          <div className="absolute left-2/3 top-0 h-full w-px bg-white/20" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-white/20" />
          <div className="absolute top-2/3 left-0 w-full h-px bg-white/20" />
        </div>
        {/* focal point marker */}
        <div
          className="pointer-events-none absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(0,0,0,0.4)] ring-2 ring-[var(--magenta,#FF0099)]/70"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground">Quick set:</span>
        {PRESETS.map((p) => {
          const active = `${x}% ${y}%` === p.pos;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => onChange(p.pos)}
              className={
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors " +
                (active
                  ? "border-transparent bg-[var(--magenta,#FF0099)] text-white"
                  : "border-input text-muted-foreground hover:bg-accent hover:text-foreground")
              }
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Drag the dot to choose what stays in view when the photo is cropped on
        the card.
      </p>
    </div>
  );
}

export { DEFAULT_POS };
