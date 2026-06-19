"use client";

/**
 * Thin vertical drag handle that straddles a panel's inner edge.
 *
 * It reports the raw pointer X on every move; the parent converts that into
 * a width against the panel's bounding rect (so the same handle works for a
 * left rail growing rightward and a right rail growing leftward). While
 * dragging we capture the pointer and lock the page cursor / text selection
 * so the drag feels solid even if the cursor outruns the handle.
 */

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface PanelResizerProps {
  /** Which edge of the panel the handle sits on. */
  side: "left" | "right";
  /** Called with the pointer's clientX as the user drags. */
  onResize: (clientX: number) => void;
  /** Double-click to reset the panel to its default width. */
  onReset?: () => void;
  ariaLabel: string;
  className?: string;
}

export function PanelResizer({
  side,
  onResize,
  onReset,
  ariaLabel,
  className,
}: PanelResizerProps) {
  const [dragging, setDragging] = useState(false);

  const start = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function move(e: PointerEvent) {
      e.preventDefault();
      onResize(e.clientX);
    }
    function stop() {
      setDragging(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    const prevCursor = document.body.style.cursor;
    const prevSelect = document.body.style.userSelect;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevSelect;
    };
  }, [dragging, onResize]);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={ariaLabel}
      onPointerDown={start}
      onDoubleClick={onReset}
      className={cn(
        "group absolute top-0 z-30 h-full w-2 cursor-col-resize touch-none",
        // Straddle the edge so the hit area covers the border line itself.
        side === "right" ? "right-0 translate-x-1/2" : "left-0 -translate-x-1/2",
        className,
      )}
    >
      {/* Visible indicator line — subtle until hovered or actively dragged. */}
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2 transition-colors",
          dragging
            ? "bg-primary"
            : "bg-transparent group-hover:bg-primary/50",
        )}
      />
      {/* Grip dot cluster, shown on hover for affordance. */}
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 left-1/2 flex h-8 w-1 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity",
          dragging ? "bg-primary opacity-100" : "bg-primary/60 group-hover:opacity-100",
        )}
      />
    </div>
  );
}
