"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pencil, Plus, GripVertical, Upload, Sparkles, X } from "lucide-react";

/** localStorage flag so the first-run coach only ever shows once per browser. */
const COACH_KEY = "ayms-builder-coached";

const STEPS = [
  {
    icon: Pencil,
    title: "Click to edit",
    body: "Tap any text or photo on the page to change it right where it sits.",
  },
  {
    icon: Plus,
    title: "Add a section",
    body: "Use the “Add Section” button up top to drop in new sections and tiles.",
  },
  {
    icon: GripVertical,
    title: "Reorder anything",
    body: "Drag a block, or use its up/down arrows, to move it around the page.",
  },
  {
    icon: Upload,
    title: "Save, then publish",
    body: "“Save” keeps a private draft. “Publish” makes it live for your visitors.",
  },
] as const;

/**
 * First-run onboarding overlay for the visual page builder. Explains the four
 * core actions in plain language and remembers (via localStorage) that the
 * owner has seen it, so it never nags on later visits.
 */
export function BuilderCoach() {
  // Initialise from localStorage lazily (client-only). The builder — and so
  // this overlay — only ever mounts after the owner enters edit mode, well
  // after hydration, so reading storage here cannot cause a hydration mismatch.
  const [show, setShow] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(COACH_KEY);
    } catch {
      return true;
    }
  });
  const dialogRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(COACH_KEY, "1");
    } catch {
      /* localStorage unavailable — still close for this session */
    }
    setShow(false);
  }, []);

  // Move focus into the dialog, support Escape to close, and keep Tab focus
  // trapped within the card while it is open.
  useEffect(() => {
    if (!show) return;
    primaryRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        dismiss();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button, [href], input, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, dismiss]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-4 backdrop-blur-sm sm:items-center"
      onClick={dismiss}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="builder-coach-title"
        aria-describedby="builder-coach-desc"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#FF0099]/30 bg-[#2A0A1E] text-white shadow-2xl shadow-black/60"
      >
        <div className="relative border-b border-white/10 bg-gradient-to-br from-[#FF0099]/25 via-[#FF0099]/5 to-transparent px-5 py-4 pr-12">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF0099]/20 text-[#FF0099]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="builder-coach-title" className="font-display text-base leading-tight text-white">
                Welcome to your page editor
              </h2>
              <p id="builder-coach-desc" className="text-[11px] text-white/55">
                Four quick things, then you’re ready to make it yours.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss tips"
            className="absolute right-2.5 top-2.5 rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <ul className="space-y-3.5 px-5 py-5">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.title} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#FF0099]/30 bg-[#FF0099]/10 text-[#FF0099]">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-semibold text-white">{step.title}</span>
                  <span className="block text-[13px] leading-snug text-white/60">{step.body}</span>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-3.5">
          <button
            ref={primaryRef}
            type="button"
            onClick={dismiss}
            className="rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-6 py-2 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] focus-visible:ring-offset-2 focus-visible:ring-offset-[#2A0A1E]"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
