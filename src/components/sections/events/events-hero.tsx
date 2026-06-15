"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EditableText } from "@/components/inline/editable-text";

/** Light editorial hero band for the public events page. */
export function EventsHero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-editorial grain relative overflow-hidden py-28 sm:py-32">
      <div className="mesh-warm" />
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
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF0099] opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF0099]" />
          </span>
          <EditableText as="span" id="events.hero.eyebrow" className="eyebrow text-[#B51760]">
            Always Something Happening
          </EditableText>
        </motion.div>
        <h1 className="text-editorial font-display text-ink text-balance">
          Upcoming{" "}
          <span className="font-display-italic marker-swipe text-[#B51760]">Events</span>
        </h1>
        <EditableText
          as="p"
          id="events.hero.lead"
          className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-xl text-ink-soft"
        >
          Coffee meetups, camp weekends, group trips, and social celebrations.
          There&apos;s always something happening with AYMS.
        </EditableText>
      </motion.div>
    </section>
  );
}
