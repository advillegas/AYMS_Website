"use client";

import { motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { EditableText } from "@/components/inline/editable-text";

/** Closing "still have questions?" glass card with contact + trips CTAs. */
export function FaqCta() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="relative overflow-hidden border-t border-[#221019]/10 canvas-warm py-20">
      <div className="mesh-warm opacity-70" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative mx-auto max-w-2xl px-4 sm:px-6 lg:px-8"
      >
        <div className="glass-strong elevate-3 rounded-3xl px-8 py-12 text-center sm:px-12">
          <h2 className="font-display text-title text-ink">
            <EditableText as="span" id="faq.cta.title">Still have</EditableText>{" "}
            <EditableText as="span" id="faq.cta.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">questions?</EditableText>
          </h2>
          <EditableText as="p" id="faq.cta.body" className="mt-3 text-ink-soft">
            We&apos;re here to help. Reach out anytime and we&apos;ll get back to
            you within 24–48 hours.
          </EditableText>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/#contact"
              className={cn(
                buttonVariants({ size: "lg" }),
                "lift h-14 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-10 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110"
              )}
            >
              <EditableText as="span" id="faq.cta.contactButton">Contact Us ♡</EditableText>
            </Link>
            <Link
              href="/trips"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "h-14 rounded-full border-[#221019]/15 bg-white/40 text-ink hover:bg-[#FF0099]/5 px-10 font-semibold"
              )}
            >
              <EditableText as="span" id="faq.cta.browseButton">Browse Trips</EditableText>
            </Link>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
