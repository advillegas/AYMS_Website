"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Shield, Heart, MapPin, Sparkles, Users, Crown } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const PROPS = [
  {
    icon: Users,
    en: { title: "Small Groups", desc: "Intimate groups of 10–20 amigas so everyone bonds and no one gets lost in the crowd." },
    es: { title: "Grupos Pequeños", desc: "Grupos íntimos de 10–20 amigas para que todas se conecten y nadie se pierda." },
    gradient: "from-primary/20 to-rosa/10",
    gradientBack: "from-[#FF0099] to-[#B51760]",
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
    gradientBack: "from-[#9B2C8A] to-[#FF0099]",
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
    gradientBack: "from-[#FF0099] to-[#9B2C8A]",
  },
  {
    icon: Sparkles,
    en: { title: "All-Inclusive Vibes", desc: "Hotels, meals, activities, and transfers included. Just show up and enjoy." },
    es: { title: "Todo Incluido", desc: "Hoteles, comidas, actividades y traslados incluidos. Solo llega y disfruta." },
    gradient: "from-rosa/20 to-primary/10",
    gradientBack: "from-[#B51760] to-[#FF0099]",
  },
];

export function WhyUs() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section className="relative py-32 overflow-hidden bg-[#FFF7FB]">
      <div className="absolute inset-0 pattern-grid opacity-[0.25]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FF0099]">
            Why Travel With Us
          </p>
          <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-[#6A1B4D] text-balance">
            Sit Back &amp; Relax,{" "}
            <span className="text-gradient-brand">You&apos;re in Good Hands</span>
          </h2>
          <p className="text-lead mx-auto mt-4 max-w-2xl text-[#6A1B4D]/80">
            Unlike big commercial group tours, we prioritize boutique
            experiences, hand-crafted itineraries, and real connections.
          </p>
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
                className="ring-gradient h-52 cursor-pointer rounded-3xl"
                front={
                  <div className="glass lift flex h-full flex-col items-start justify-center gap-3 rounded-3xl p-7 elevate-2">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF0099]/15 to-[#FACDE8]/30">
                      <p.icon className="h-6 w-6 text-[#FF0099]" aria-hidden="true" />
                    </div>
                    <h3 className="text-base font-bold font-[family-name:var(--font-heading)] text-[#6A1B4D]">{p.en.title}</h3>
                    <p className="text-sm text-[#6A1B4D]/60 leading-relaxed">{p.en.desc}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-start justify-center gap-3 rounded-3xl bg-gradient-to-br ${p.gradientBack} p-7 text-white`}>
                    <p.icon className="h-7 w-7 text-white/80" aria-hidden="true" />
                    <h3 className="text-base font-bold font-[family-name:var(--font-heading)]">{p.es.title}</h3>
                    <p className="text-sm text-white/80 leading-relaxed">{p.es.desc}</p>
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
