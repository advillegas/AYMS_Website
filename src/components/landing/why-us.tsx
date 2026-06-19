"use client";

import { motion, useReducedMotion } from "framer-motion";
import { FlipCard } from "@/components/ui/flip-card";
import { EditableText } from "@/components/inline/editable-text";
import { useFlipCards, DEFAULT_WHYUS } from "@/lib/use-site-content";
import { iconByName } from "@/lib/section-icons";

export function WhyUs() {
  const prefersReducedMotion = useReducedMotion();
  const PROPS = useFlipCards("home.whyus", DEFAULT_WHYUS);
  return (
    <section className="canvas-editorial grain relative overflow-hidden py-28 sm:py-32">
      <div className="mesh-warm opacity-70" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/20 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto max-w-2xl text-center"
        >
          <EditableText as="p" id="home.whyus.eyebrow" className="eyebrow text-[var(--magenta)]">Why Travel With Us</EditableText>
          <h2 className="text-title mt-4 font-display text-ink text-balance">
            <EditableText as="span" id="home.whyus.title.before">Sit back &amp; relax,</EditableText>{" "}
            <EditableText as="span" id="home.whyus.title.accent" className="font-display-italic marker-swipe">you&apos;re in good hands</EditableText>
          </h2>
          <EditableText as="p" id="home.whyus.lead" className="text-lead mx-auto mt-5 text-ink-soft">
            Unlike big commercial group tours, we prioritize boutique
            experiences, hand-crafted itineraries, and real connections.
          </EditableText>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROPS.map((p, i) => {
            const Icon = iconByName(p.icon);
            return (
            <motion.div
              key={i}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <FlipCard
                className="h-52 cursor-pointer rounded-3xl"
                front={
                  <div className="glass lift elevate-2 flex h-full flex-col items-start justify-center gap-3 rounded-3xl p-7">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--magenta)]/12 to-[#FACDE8]/45">
                      <Icon className="h-6 w-6 text-[var(--magenta)]" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-lg text-ink">{p.enTitle}</h3>
                    <p className="text-sm leading-relaxed text-ink-soft">{p.enDesc}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-start justify-center gap-3 rounded-3xl bg-gradient-to-br ${p.gradientBack} p-7 text-white`}>
                    <Icon className="h-7 w-7 text-white/80" aria-hidden="true" />
                    <h3 className="font-display text-lg">{p.esTitle}</h3>
                    <p className="text-sm leading-relaxed text-white/85">{p.esDesc}</p>
                  </div>
                }
              />
            </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
