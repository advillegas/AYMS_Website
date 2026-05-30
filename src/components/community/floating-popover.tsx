"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/**
 * Floating popover that pins itself to a trigger element using
 * getBoundingClientRect, then rendered via Portal into document.body.
 * This sidesteps every "z-index parent stacking context" / "overflow:
 * hidden ancestor" problem that bedevils chat input popovers.
 *
 * Default placement is "top-end" (bottom-right of trigger). The
 * viewport edges are respected so it never gets cut off on small
 * screens.
 */

export type PopoverPlacement = "top-start" | "top-end" | "top-center";

interface FloatingPopoverProps {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
  placement?: PopoverPlacement;
  width?: number;
  className?: string;
  children: React.ReactNode;
}

export function FloatingPopover({
  open,
  triggerRef,
  onClose,
  placement = "top-end",
  width,
  className,
  children,
}: FloatingPopoverProps) {
  const popRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ left: number; top: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close on outside click + escape.
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        popRef.current &&
        !popRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        onClose();
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, triggerRef]);

  // Recompute position whenever open or window resizes/scrolls -
  // AND whenever the popup's own size changes. The latter matters
  // for content that loads asynchronously (emoji-mart, GIF results)
  // where the popup grows after the first render. Without the
  // ResizeObserver the picker would end up half off-screen because
  // the initial measurement was just the loading placeholder.
  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    function place() {
      const trigger = triggerRef.current;
      const pop = popRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const popW = width ?? pop?.offsetWidth ?? 320;
      const popH = pop?.offsetHeight ?? 380;
      const margin = 8;

      let left: number;
      switch (placement) {
        case "top-start":
          left = r.left;
          break;
        case "top-center":
          left = r.left + r.width / 2 - popW / 2;
          break;
        case "top-end":
        default:
          left = r.right - popW;
          break;
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Vertical placement: try ABOVE first, then BELOW, otherwise
      // pin against whichever edge gives the most room and clamp the
      // popup so it never overflows the viewport. This is the bug we
      // were hitting before -- the old code blindly subtracted popH
      // which could push the popup above the top of the viewport
      // after async content grew the popover.
      const spaceAbove = r.top - margin;
      const spaceBelow = vh - r.bottom - margin;
      let top: number;
      if (popH <= spaceAbove) {
        top = r.top - popH - margin;
      } else if (popH <= spaceBelow) {
        top = r.bottom + margin;
      } else {
        // Doesn't fully fit anywhere - park against the larger side
        // so the user can still scroll its inner content.
        if (spaceAbove >= spaceBelow) {
          top = margin;
        } else {
          top = Math.max(margin, vh - popH - margin);
        }
      }

      // Horizontal clamp.
      if (left + popW > vw - margin) left = vw - popW - margin;
      if (left < margin) left = margin;

      setCoords({ left, top });
    }
    place();

    // Re-place on the popup's own size changes (async content load).
    const pop = popRef.current;
    let ro: ResizeObserver | null = null;
    if (pop && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => place());
      ro.observe(pop);
    }

    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      if (ro) ro.disconnect();
    };
  }, [open, placement, width, triggerRef]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={popRef}
      style={{
        position: "fixed",
        left: coords?.left ?? -9999,
        top: coords?.top ?? -9999,
        // Hide until first measurement to avoid the flash at -9999.
        visibility: coords ? "visible" : "hidden",
        zIndex: 1000,
      }}
      className={cn("rounded-xl shadow-2xl", className)}
    >
      {children}
    </div>,
    document.body,
  );
}
