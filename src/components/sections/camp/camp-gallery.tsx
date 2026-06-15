"use client";

import { motion, useReducedMotion } from "framer-motion";
import { EditableImage } from "@/components/inline/editable-image";
import { EASE } from "./shared";

export function CampGallery() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="canvas-warm grain relative overflow-hidden border-y border-[#FF7F50]/15 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        <motion.h2 {...reveal} className="text-title font-display text-ink">
          Sunshine. Adventure.{" "}
          <span className="font-display-italic marker-swipe text-[#B51760]">Amigas.</span>
        </motion.h2>
        <motion.div {...reveal} className="mt-10 grid gap-5 sm:grid-cols-2">
          {["/camp/gallery-1.jpg", "/camp/gallery-2.jpg"].map((src, i) => (
            <div key={src} className="relative aspect-[16/9] overflow-hidden rounded-3xl elevate-2">
              <EditableImage id={`camp.gallery.photo.${i}`} src={src} alt="" fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
