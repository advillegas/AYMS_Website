"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { Compass, Sparkles, ShieldCheck, Plane } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * StoryBrand opening: name the hero's desire + problem in the first
 * breath, then offer the clear next step. Two CTAs — primary to the
 * inquiry form, secondary to the plan.
 */
export function ConciergeHero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-editorial grain relative overflow-hidden py-28 sm:py-36">
      <div className="mesh-warm" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8"
      >
        <motion.div
          initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="pill-glass mx-auto mb-7 flex w-fit items-center gap-2.5 px-4 py-1.5"
        >
          <Compass className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
          <EditableText as="span" id="concierge.hero.eyebrow" className="eyebrow text-[#B51760]">
            AYMS Private Concierge
          </EditableText>
        </motion.div>

        <h1 className="text-editorial font-display text-ink text-balance">
          <EditableText as="span" id="concierge.hero.title">
            Your dream trip,
          </EditableText>{" "}
          <EditableText
            as="span"
            id="concierge.hero.titleAccent"
            className="font-display-italic marker-swipe text-[var(--magenta)]"
          >
            planned for you
          </EditableText>{" "}
          <EditableText as="span" id="concierge.hero.titleEnd">
            — start to finish.
          </EditableText>
        </h1>

        <EditableText
          as="p"
          id="concierge.hero.lead"
          className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-2xl text-ink-soft"
        >
          You know you want the trip. You just don&apos;t have the hours to
          research it, the patience to compare a hundred tabs, or the peace of
          mind that you booked the right thing. That&apos;s exactly what we
          handle — a fully custom getaway, designed around you, with zero stress.
        </EditableText>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="#inquire"
            className="lift inline-flex h-14 items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-9 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] transition hover:brightness-110"
          >
            <EditableText as="span" id="concierge.hero.ctaPrimary">
              Plan my trip
            </EditableText>
            <Plane className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#how"
            className="inline-flex h-14 items-center justify-center rounded-full border border-[#221019]/15 bg-white/70 px-8 text-base font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760]"
          >
            <EditableText as="span" id="concierge.hero.ctaSecondary">
              See how it works
            </EditableText>
          </Link>
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
            <EditableText as="span" id="concierge.hero.trust1">100% custom itineraries</EditableText>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
            <EditableText as="span" id="concierge.hero.trust2">Vetted local partners</EditableText>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Compass className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
            <EditableText as="span" id="concierge.hero.trust3">Support before, during &amp; after</EditableText>
          </span>
        </div>
      </motion.div>
    </section>
  );
}
