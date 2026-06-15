"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditableText } from "@/components/inline/editable-text";

/** Closing call-to-action linking to the community calendar. */
export function EventsCta() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20">
      <div className="mesh-warm opacity-70" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8"
      >
        <h2 className="text-title font-display text-ink">
          <EditableText as="span" id="events.cta.title">Want to see the</EditableText>{" "}
          <EditableText as="span" id="events.cta.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">full calendar?</EditableText>
        </h2>
        <EditableText as="p" id="events.cta.lead" className="mt-3 text-ink-soft text-lead">
          Join the community portal for the interactive calendar, RSVP tracking,
          and event chat channels.
        </EditableText>
        <Link
          href="/community/calendar"
          className={cn(
            buttonVariants({ size: "lg" }),
            "lift mt-8 h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
          )}
        >
          <EditableText as="span" id="events.cta.button">Open Community Calendar ♡</EditableText>
        </Link>
      </motion.div>
    </section>
  );
}
