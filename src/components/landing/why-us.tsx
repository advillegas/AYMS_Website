"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shield, Heart, MapPin, Sparkles, Users, Crown } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";
import { EditableText } from "@/components/inline/editable-text";

const PROPS = [
  {
    icon: Users,
    en: { title: "Small Groups", desc: "Intimate groups of 10–20 amigas so everyone bonds and no one gets lost in the crowd." },
    es: { title: "Grupos Pequeños", desc: "Grupos íntimos de 10–20 amigas para que todas se conecten y nadie se pierda." },
    gradient: "from-primary/20 to-rosa/10",
    gradientBack: "from-[var(--magenta)] to-[var(--brand-pink)]",
  },
  {
    icon: Crown,
    en: { title: "Curated Itineraries", desc: "Every meal, excursion, and surprise is hand-picked. No cookie-cutter tours here." },
    es: { title: "Itinerarios Curados", desc: "Cada comida, excursión y sorpresa es elegida a mano. Nada genérico aquí." },
    gradient: "from-brand-pink/20 to-coral/10",
    gradientBack: "from-[#DAA520] to-[#C44B3F]",
  },
  {
    icon: Shield,
    en: { title: "Safe & Supported", desc: "Experienced trip leaders, local guides, and emergency protocols at every destination." },
    es: { title: "Seguras y Apoyadas", desc: "Líderes de viaje experimentadas, guías locales y protocolos de emergencia en cada destino." },
    gradient: "from-rosa/20 to-primary/10",
    gradientBack: "from-[#9B2C8A] to-[var(--magenta)]",
  },
  {
    icon: Heart,
    en: { title: "Latina Sisterhood", desc: "Built by Latinas, for Latinas. A Latina travel community that gets you — your culture, your vibe, your language." },
    es: { title: "Hermandad Latina", desc: "Creado por Latinas, para Latinas. Una comunidad que te entiende — tu cultura, tu onda, tu idioma." },
    gradient: "from-coral/20 to-brand-pink/10",
    gradientBack: "from-[#C44B3F] to-[#DAA520]",
  },
  {
    icon: MapPin,
    en: { title: "Bucket List Destinations", desc: "From Cancún to Kenya, Bali to NYC — we go where the magic is." },
    es: { title: "Destinos de Ensueño", desc: "De Cancún a Kenya, Bali a NYC — vamos donde está la magia." },
    gradient: "from-primary/20 to-rosa/10",
    gradientBack: "from-[var(--magenta)] to-[#9B2C8A]",
  },
  {
    icon: Sparkles,
    en: { title: "All-Inclusive Vibes", desc: "Hotels, meals, activities, and transfers included. Just show up and enjoy." },
    es: { title: "Todo Incluido", desc: "Hoteles, comidas, actividades y traslados incluidos. Solo llega y disfruta." },
    gradient: "from-rosa/20 to-primary/10",
    gradientBack: "from-[var(--brand-pink)] to-[var(--magenta)]",
  },
];

export function WhyUs() {
  const prefersReducedMotion = useReducedMotion();
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
          {PROPS.map((p, i) => (
            <motion.div
              key={p.en.title}
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
                      <p.icon className="h-6 w-6 text-[var(--magenta)]" aria-hidden="true" />
                    </div>
                    <EditableText as="h3" id={`home.whyus.prop.${i}.en.title`} className="font-display text-lg text-ink">{p.en.title}</EditableText>
                    <EditableText as="p" id={`home.whyus.prop.${i}.en.desc`} className="text-sm leading-relaxed text-ink-soft">{p.en.desc}</EditableText>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-start justify-center gap-3 rounded-3xl bg-gradient-to-br ${p.gradientBack} p-7 text-white`}>
                    <p.icon className="h-7 w-7 text-white/80" aria-hidden="true" />
                    <EditableText as="h3" id={`home.whyus.prop.${i}.es.title`} className="font-display text-lg">{p.es.title}</EditableText>
                    <EditableText as="p" id={`home.whyus.prop.${i}.es.desc`} className="text-sm leading-relaxed text-white/85">{p.es.desc}</EditableText>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
