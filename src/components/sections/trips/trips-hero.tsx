"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Plane } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/** Trips hero banner — light editorial, coral accent allowed on trips. */
export function TripsHero() {
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
          <Plane className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
          <EditableText as="span" id="trips.hero.eyebrow" className="eyebrow text-[#B51760]">
            The World Is Better With Amigas
          </EditableText>
        </motion.div>
        <h1 className="text-editorial font-display text-ink text-balance">
          <EditableText as="span" id="trips.hero.title">Shop</EditableText>{" "}
          <EditableText as="span" id="trips.hero.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">Trips</EditableText>
        </h1>
        <EditableText
          as="p"
          id="trips.hero.lead"
          multiline
          className="text-lead font-[family-name:var(--font-sans)] mx-auto mt-6 max-w-xl text-ink-soft"
        >
          Leave the hassle of planning to us. All you need to worry about is
          enjoying your trip while creating lifelong memories con tus nuevas
          Amigas.
        </EditableText>
      </motion.div>
    </section>
  );
}
