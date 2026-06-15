"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Users, Check, Sparkles, CreditCard } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";

/** How to Book — editorial four-step guide on warm canvas. */
export function TripsHowTo() {
  const reduceMotion = useReducedMotion();

  return (
    <section className="canvas-warm grain relative overflow-hidden border-t border-[#FF7F50]/15 py-24">
      <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <EditableText as="p" id="trips.howto.eyebrow" className="eyebrow text-[#FF7F50] mb-3">Four Simple Steps</EditableText>
          <h2 className="text-title font-display text-ink">
            <EditableText as="span" id="trips.howto.title">How to</EditableText>{" "}
            <EditableText as="span" id="trips.howto.titleAccent" className="font-display-italic marker-swipe text-[#B51760]">Book</EditableText>
          </h2>
          <EditableText as="p" id="trips.howto.subtitle" multiline className="mt-3 text-ink-soft text-lead max-w-lg mx-auto">
            Four simple steps stand between you and the trip of a lifetime.
          </EditableText>
        </motion.div>
        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: "1", icon: CreditCard, title: "Secure Your Spot", desc: "Pay in full or place a deposit with a payment plan." },
            { step: "2", icon: Check, title: "Sign Agreement", desc: "Review and sign the travel agreement & waiver via email." },
            { step: "3", icon: Users, title: "Meet Your Amigas", desc: "Join a mandatory group Zoom call to meet your travel crew." },
            { step: "4", icon: Sparkles, title: "Pack & Go!", desc: "We meet you at the airport. Just bring yourself and good vibes!" },
          ].map((s, i) => (
            <motion.div
              key={s.step}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="lift flex flex-col items-center text-center bg-white rounded-2xl p-6 elevate-2 border border-[#221019]/8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF7F50]/20 to-[#FF0099]/10 text-[#FF7F50] mb-4 ring-gradient">
                <s.icon className="h-7 w-7" aria-hidden="true" />
              </div>
              <div className="text-xs font-bold text-[#FF7F50]/80 uppercase tracking-wider mb-1.5">
                Step {s.step}
              </div>
              <h3 className="font-display text-ink text-lg">
                {s.title}
              </h3>
              <p className="mt-1.5 text-sm text-ink-soft leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
