"use client";

import { motion, useReducedMotion } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * FAQ hero — light editorial intro. The fixed navbar (88px) is cleared here
 * because in the section pipeline the page <main> no longer adds top padding;
 * `pt-[calc(7rem+88px)]` reproduces the original `pt-[88px]` + `py-28` spacing.
 */
export function FaqHero() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="grain relative overflow-hidden canvas-editorial pt-[calc(7rem+88px)] pb-28">
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
          className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center"
        >
          <HelpCircle className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
        </motion.div>
        <EditableText as="p" id="faq.hero.eyebrow" className="eyebrow text-[#B51760]">
          Got Questions? We&apos;ve Got Answers
        </EditableText>
        <h1 className="text-hero font-display text-ink text-balance mt-3">
          <EditableText as="span" id="faq.hero.title">Frequently</EditableText>{" "}
          <EditableText as="span" id="faq.hero.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">Asked</EditableText>
        </h1>
        <EditableText as="p" id="faq.hero.lead" className="text-lead mx-auto mt-6 max-w-xl text-ink-soft">
          Everything you need to know about traveling with AYMS. Can&apos;t find
          your answer? Reach out to us anytime.
        </EditableText>
      </motion.div>
    </section>
  );
}
