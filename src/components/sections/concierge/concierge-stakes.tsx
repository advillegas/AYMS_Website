"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Check, X } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * StoryBrand stakes: contrast what failure (DIY / doing nothing) costs
 * against the success the guide makes possible. The side-by-side makes
 * the transformation vivid right before the closing CTA.
 */
const FAILURE = [
  { id: "f1", text: "Months of stop-start planning that drains your evenings" },
  { id: "f2", text: "PTO and savings spent on a trip that\u2019s just… fine" },
  { id: "f3", text: "Decision fatigue, second-guessing, and tourist traps" },
  { id: "f4", text: "The dream trip that keeps getting pushed to \u201Csomeday\u201D" },
];

const SUCCESS = [
  { id: "s1", text: "A done-for-you itinerary, ready before you can overthink it" },
  { id: "s2", text: "Every day curated around what you actually love" },
  { id: "s3", text: "Hidden gems and local access you\u2019d never find alone" },
  { id: "s4", text: "Total peace of mind — and the memories to prove it" },
];

export function ConciergeStakes() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-editorial grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24">
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <EditableText as="p" id="concierge.stakes.eyebrow" className="eyebrow text-[var(--brand-pink)]">
            What&apos;s at stake
          </EditableText>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            <EditableText as="span" id="concierge.stakes.title">The same trip budget,</EditableText>{" "}
            <EditableText as="span" id="concierge.stakes.titleAccent" className="font-display-italic text-[var(--magenta)]">
              two very different trips
            </EditableText>
          </h2>
        </motion.div>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {/* Failure */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-3xl border border-[#221019]/10 bg-[#221019]/[0.03] p-7"
          >
            <h3 className="font-display text-xl text-ink/70">
              <EditableText as="span" id="concierge.stakes.failure.title">Going it alone</EditableText>
            </h3>
            <ul className="mt-5 space-y-3">
              {FAILURE.map((f) => (
                <li key={f.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#221019]/10 text-ink/50">
                    <X className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <EditableText as="span" id={`concierge.stakes.${f.id}`} className="text-sm leading-relaxed text-ink-soft">
                    {f.text}
                  </EditableText>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Success */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="relative overflow-hidden rounded-3xl border border-[var(--magenta)]/25 bg-gradient-to-br from-[var(--magenta)]/8 to-[var(--brand-pink)]/8 p-7 shadow-[0_8px_30px_rgb(255_0_153/0.10)]"
          >
            <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              <EditableText as="span" id="concierge.stakes.success.badge">With AYMS</EditableText>
            </span>
            <h3 className="font-display text-xl text-[#B51760]">
              <EditableText as="span" id="concierge.stakes.success.title">With your concierge</EditableText>
            </h3>
            <ul className="mt-5 space-y-3">
              {SUCCESS.map((s) => (
                <li key={s.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white">
                    <Check className="h-3 w-3" aria-hidden="true" />
                  </span>
                  <EditableText as="span" id={`concierge.stakes.${s.id}`} className="text-sm font-medium leading-relaxed text-ink">
                    {s.text}
                  </EditableText>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
