"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Images } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * Gallery hero — light editorial intro. Self-contained section body (no
 * Navbar/Footer); the CMS wrapper supplies page chrome. Heading copy is
 * inline-editable via the shared overrides doc.
 */
export function GalleryHero() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="grain relative overflow-hidden canvas-editorial py-28">
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
          <Images className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
        </motion.div>
        <EditableText as="p" id="gallery.hero.eyebrow" className="eyebrow text-[#B51760]">
          Memories for the Books
        </EditableText>
        <h1 className="text-hero font-display text-ink text-balance mt-3">
          <EditableText as="span" id="gallery.hero.title">Past</EditableText>{" "}
          <EditableText as="span" id="gallery.hero.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">Trips</EditableText>
        </h1>
        <EditableText as="p" id="gallery.hero.lead" className="text-lead mx-auto mt-6 max-w-xl text-ink-soft">
          Where we&apos;ve been, who we&apos;ve become. Every trip builds bonds that last a lifetime.
        </EditableText>
      </motion.div>
    </section>
  );
}
