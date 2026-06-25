"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Compass, Heart, Globe, Users, Star } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/**
 * StoryBrand "meets a guide" — empathy ("we get it") plus authority
 * (proof we can be trusted). The stat band carries the authority; the
 * copy carries the empathy and the owner's voice.
 */
const STATS = [
  { id: "trips", icon: Globe, value: "30+", label: "trips curated" },
  { id: "countries", icon: Compass, value: "12", label: "countries" },
  { id: "amigas", icon: Users, value: "2k+", label: "amigas served" },
  { id: "rating", icon: Star, value: "5.0", label: "amiga rating" },
];

export function ConciergeGuide() {
  const reduceMotion = useReducedMotion();
  return (
    <section className="canvas-editorial grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24">
      <div className="mesh-warm opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <EditableText as="p" id="concierge.guide.eyebrow" className="eyebrow text-[var(--brand-pink)]">
              You&apos;ve got a guide
            </EditableText>
            <h2 className="font-display text-title mt-3 text-ink text-balance">
              <EditableText as="span" id="concierge.guide.title">You bring the dream.</EditableText>{" "}
              <EditableText as="span" id="concierge.guide.titleAccent" className="font-display-italic text-[var(--magenta)]">
                We bring the plan.
              </EditableText>
            </h2>
            <EditableText as="p" id="concierge.guide.body1" className="mt-5 text-lead leading-relaxed text-ink-soft">
              We&apos;re Amigas Y Más Social — Latinas who have spent years
              turning bucket-list ideas into real, beautifully-run trips for
              women just like you. We&apos;ve made the mistakes, found the gems,
              and built the relationships so you don&apos;t have to.
            </EditableText>
            <EditableText as="p" id="concierge.guide.body2" className="mt-4 leading-relaxed text-ink-soft">
              When you hand us your trip, you get a partner who treats it like
              our own — obsessing over the details, sweating the logistics, and
              making sure every day feels like it was made for you. Because it was.
            </EditableText>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border border-rosa/30 bg-rosa/5 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--magenta)] to-[var(--brand-pink)] text-white">
                <Heart className="h-5 w-5" aria-hidden="true" />
              </span>
              <EditableText as="p" id="concierge.guide.promise" className="text-sm font-medium text-ink">
                Our promise: a trip that feels effortless to you, because we
                carry everything that isn&apos;t.
              </EditableText>
            </div>
          </motion.div>

          <motion.div
            initial={reduceMotion ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-2 gap-4"
          >
            {STATS.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.id}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                  className="glass-strong elevate-float rounded-3xl p-6 text-center"
                >
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--magenta)]/15 to-[var(--brand-pink)]/10 text-[var(--magenta)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <p className="mt-3 font-display text-4xl text-ink">
                    <EditableText as="span" id={`concierge.guide.stat.${s.id}.value`}>{s.value}</EditableText>
                  </p>
                  <EditableText as="p" id={`concierge.guide.stat.${s.id}.label`} className="mt-1 text-xs font-medium uppercase tracking-wider text-ink-soft">
                    {s.label}
                  </EditableText>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
