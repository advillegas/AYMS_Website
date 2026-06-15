"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useGalleryContent } from "@/lib/use-site-content";

/**
 * Closing stats band — trip totals derived from the live gallery content,
 * plus fixed community milestones.
 */
export function GalleryStats() {
  const reduceMotion = useReducedMotion();
  const { pastTrips } = useGalleryContent();

  return (
    <section className="relative overflow-hidden border-t border-[#221019]/10 canvas-warm py-20">
      <div className="mesh-warm opacity-60" />
      <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 text-center">
          {[
            { value: pastTrips.length + "+", label: "Trips Completed" },
            { value: pastTrips.reduce((s, t) => s + t.amigas, 0) + "+", label: "Amigas Traveled" },
            { value: "10+", label: "Countries Visited" },
            { value: "∞", label: "Memories Made" },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lift glass rounded-2xl px-4 py-8 elevate-2"
            >
              <p className="font-display text-4xl text-[#B51760]">
                {s.value}
              </p>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-soft">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
