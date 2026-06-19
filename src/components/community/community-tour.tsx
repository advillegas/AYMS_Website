"use client";

/**
 * Guided community tour — a lightweight spotlight walkthrough shown once to a
 * member after they finish onboarding (and replayable from the avatar menu).
 *
 * It dims the screen, spotlights a target element via its `data-tour` anchor,
 * and explains it in a floating card. Steps whose anchor isn't on the current
 * page/viewport are skipped automatically, so it's safe across pages and
 * screen sizes. Completion is persisted to the per-user `tourDone` flag so it
 * never re-runs on its own.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/store";
import { useOnboarding } from "@/lib/use-onboarding";

interface TourStep {
  /** Anchor selector(s); first visible one wins. Omit for a centered step. */
  selector?: string | string[];
  title: string;
  body: string;
  emoji?: string;
}

const STEPS: TourStep[] = [
  {
    title: "Welcome to your community",
    body: "Here's a quick 30-second tour of where everything lives. You can replay it anytime from your avatar menu.",
    emoji: "👋",
  },
  {
    selector: '[data-tour="nav"]',
    title: "Find your way around",
    body: "These tabs jump you between Home, live Chat, your private Messages, the Events calendar (browse on a map or list, and host your own gathering), the Members directory, and your saved trips & RSVPs in My Events.",
    emoji: "🧭",
  },
  {
    selector: ['[data-tour="channels"]', '[data-tour="channels-mobile"]'],
    title: "Channels",
    body: "Topic chat rooms — General, Local, Trips & Travel and more. Tap one to jump in. On a phone, open them with the menu button.",
    emoji: "#️⃣",
  },
  {
    selector: '[data-tour="main"]',
    title: "Your space",
    body: "Whatever you choose opens right here — the conversation, the calendar, the member list, your profile.",
    emoji: "✨",
  },
  {
    selector: '[data-tour="notifications"]',
    title: "Stay in the loop",
    body: "Replies, @mentions, friend requests, event RSVPs and saved-trip updates all land in your bell.",
    emoji: "🔔",
  },
  {
    selector: '[data-tour="profile-menu"]',
    title: "Make it yours",
    body: "Set your photo, bio, languages and preferences from here — changes save instantly. You can also replay this tour from this menu.",
    emoji: "🪪",
  },
  {
    title: "You're all set!",
    body: "Dive in and say hola — the familia can't wait to meet you. 💕",
    emoji: "🎉",
  },
];

const CARD_W = 320;
const clamp = (v: number, min: number, max: number) =>
  Math.min(max, Math.max(min, v));

function firstVisible(selector?: string | string[]): HTMLElement | null {
  if (!selector || typeof document === "undefined") return null;
  const sels = Array.isArray(selector) ? selector : [selector];
  for (const s of sels) {
    for (const el of Array.from(document.querySelectorAll<HTMLElement>(s))) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) return el;
    }
  }
  return null;
}

export function CommunityTour() {
  const updateProfile = useAuth((s) => s.updateProfile);
  const endTour = useOnboarding((s) => s.endTour);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [mounted, setMounted] = useState(false);

  const step = STEPS[index];
  const isFirst = index === 0;
  const isLast = index === STEPS.length - 1;

  useEffect(() => setMounted(true), []);

  const measure = useCallback(() => {
    const el = firstVisible(step?.selector);
    setRect(el ? el.getBoundingClientRect() : null);
  }, [step]);

  // Re-measure on step change, after smooth-scroll settle, and on resize/scroll.
  useEffect(() => {
    const el = firstVisible(step?.selector);
    if (el) {
      el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    }
    measure();
    const t = setTimeout(measure, 380);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, step]);

  const finishTour = useCallback(() => {
    void updateProfile({ tourDone: true });
    endTour();
  }, [updateProfile, endTour]);

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i >= STEPS.length - 1) {
        finishTour();
        return i;
      }
      return i + 1;
    });
  }, [finishTour]);

  const goBack = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") finishTour();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finishTour, goNext, goBack]);

  const pad = 8;
  const spot = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  const cardStyle = useMemo<CSSProperties>(() => {
    if (typeof window === "undefined" || !spot) return {};
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const tall = spot.height > vh * 0.6;
    const wide = spot.width > vw * 0.6;
    // Tall side element (channel rail): place the card beside it, centered.
    if (tall && !wide) {
      const right = spot.left + spot.width + 12;
      const left =
        right + CARD_W < vw ? right : Math.max(12, spot.left - CARD_W - 12);
      return { top: clamp(vh / 2 - 120, 12, vh - 260), left };
    }
    const left = clamp(spot.left + spot.width / 2 - CARD_W / 2, 12, vw - CARD_W - 12);
    const below = spot.top + spot.height + 250 < vh;
    return below
      ? { top: spot.top + spot.height + 12, left }
      : { bottom: vh - spot.top + 12, left };
  }, [spot]);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="Community tour">
      {/* Click blocker so the app underneath isn't interactive mid-tour. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />

      {/* Dim: a spotlight "hole" via box-shadow when anchored, else a flat dim. */}
      {spot ? (
        <div
          className="pointer-events-none absolute rounded-2xl ring-2 ring-white/70 transition-all duration-300"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: "0 0 0 9999px rgba(17,9,15,0.62)",
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[#11090f]/62" />
      )}

      {/* Card */}
      <div
        className="absolute w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-2xl border border-white/15 bg-card shadow-2xl"
        style={
          spot
            ? cardStyle
            : { top: "50%", left: "50%", transform: "translate(-50%,-50%)" }
        }
      >
        <div className="flex items-start gap-3 p-4">
          <span className="text-2xl leading-none" aria-hidden>
            {step.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-heading text-sm font-bold text-foreground">
              {step.title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {step.body}
            </p>
          </div>
          <button
            type="button"
            onClick={finishTour}
            aria-label="End tour"
            className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-4 py-2.5">
          <div className="flex items-center gap-1" aria-hidden>
            {STEPS.map((_, i) => (
              <span
                key={i}
                className={
                  "h-1.5 rounded-full transition-all " +
                  (i === index ? "w-4 bg-primary" : "w-1.5 bg-primary/25")
                }
              />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {!isFirst && (
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={goBack}>
                <ArrowLeft className="mr-0.5 h-3.5 w-3.5" /> Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={goNext}
              className="h-7 border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 text-xs text-white hover:brightness-110"
            >
              {isLast ? (
                <>
                  <Sparkles className="mr-1 h-3.5 w-3.5" /> Done
                </>
              ) : (
                <>
                  Next <ArrowRight className="ml-0.5 h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Skip — bottom center, always reachable */}
      <button
        type="button"
        onClick={finishTour}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition-colors hover:bg-white/20 hover:text-white"
      >
        Skip tour
      </button>
    </div>,
    document.body,
  );
}
