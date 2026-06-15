"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EditableText } from "@/components/inline/editable-text";
import { EditableImage } from "@/components/inline/editable-image";
import { CheckoutButtons, EASE } from "./shared";

const CTA_PHOTOS = ["/camp/cta-1.png", "/camp/cta-2.png", "/camp/cta-3.png", "/camp/cta-4.png"];

export function CampCta() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="canvas-editorial grain relative overflow-hidden py-24">
      <div className="mesh-warm" />
      <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div {...reveal}>
          <h2 className="text-title font-display text-ink">
            Enough already.{" "}
            <span className="font-display-italic marker-swipe text-[#B51760]">SIGN ME UP!</span>
          </h2>
          <EditableText id="camp.cta.subtitle" as="p" multiline className="mx-auto mt-4 max-w-xl text-lead text-ink-soft">
            Spots are limited and these weekends fill fast. Lock in your bunk and we&apos;ll handle the rest.
          </EditableText>
          <CheckoutButtons className="mt-8 items-center justify-center" />
        </motion.div>
        <motion.div {...reveal} className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CTA_PHOTOS.map((src, i) => (
            <div key={src} className="relative aspect-square overflow-hidden rounded-2xl elevate-2">
              <EditableImage id={`camp.cta.photo.${i}`} src={src} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
