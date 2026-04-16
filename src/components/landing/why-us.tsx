"use client";

import { motion } from "framer-motion";
import { Shield, Heart, MapPin, Sparkles, Users, Crown } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const PROPS = [
  {
    icon: Users,
    en: { title: "Small Groups", desc: "Intimate groups of 10–20 amigas so everyone bonds and no one gets lost in the crowd." },
    es: { title: "Grupos Pequeños", desc: "Grupos íntimos de 10–20 amigas para que todas se conecten y nadie se pierda." },
    gradient: "from-primary/20 to-rosa/10",
    gradientBack: "from-[#E8458B] to-[#D4357A]",
  },
  {
    icon: Crown,
    en: { title: "Curated Itineraries", desc: "Every meal, excursion, and surprise is hand-picked. No cookie-cutter tours here." },
    es: { title: "Itinerarios Curados", desc: "Cada comida, excursión y sorpresa es elegida a mano. Nada genérico aquí." },
    gradient: "from-gold/20 to-coral/10",
    gradientBack: "from-[#DAA520] to-[#C44B3F]",
  },
  {
    icon: Shield,
    en: { title: "Safe & Supported", desc: "Experienced trip leaders, local guides, and emergency protocols at every destination." },
    es: { title: "Seguras y Apoyadas", desc: "Líderes de viaje experimentadas, guías locales y protocolos de emergencia en cada destino." },
    gradient: "from-lavender/20 to-primary/10",
    gradientBack: "from-[#9B2C8A] to-[#E8458B]",
  },
  {
    icon: Heart,
    en: { title: "Latina Sisterhood", desc: "Built by Latinas, for Latinas. A community that gets you — your culture, your vibe, your language." },
    es: { title: "Hermandad Latina", desc: "Creado por Latinas, para Latinas. Una comunidad que te entiende — tu cultura, tu onda, tu idioma." },
    gradient: "from-coral/20 to-gold/10",
    gradientBack: "from-[#C44B3F] to-[#DAA520]",
  },
  {
    icon: MapPin,
    en: { title: "Bucket List Destinations", desc: "From Cancún to Kenya, Bali to NYC — we go where the magic is." },
    es: { title: "Destinos de Ensueño", desc: "De Cancún a Kenya, Bali a NYC — vamos donde está la magia." },
    gradient: "from-primary/20 to-lavender/10",
    gradientBack: "from-[#E8458B] to-[#9B2C8A]",
  },
  {
    icon: Sparkles,
    en: { title: "All-Inclusive Vibes", desc: "Hotels, meals, activities, and transfers included. Just show up and enjoy." },
    es: { title: "Todo Incluido", desc: "Hoteles, comidas, actividades y traslados incluidos. Solo llega y disfruta." },
    gradient: "from-rosa/20 to-primary/10",
    gradientBack: "from-[#D4357A] to-[#E8458B]",
  },
];

export function WhyUs() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-dots opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
            Why Travel With Us
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold sm:text-5xl">
            Sit Back & Relax,{" "}
            <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">
              You&apos;re in Good Hands
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Unlike big commercial group tours, we prioritize boutique
            experiences, hand-crafted itineraries, and real connections.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PROPS.map((p, i) => (
            <motion.div
              key={p.en.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <FlipCard
                className="h-52 cursor-pointer"
                front={
                  <div className={`flex h-full flex-col items-start justify-center gap-3 rounded-2xl bg-gradient-to-br ${p.gradient} p-7 border border-rosa/15 border-glow`}>
                    <p.icon className="h-7 w-7 text-primary" />
                    <h3 className="text-base font-bold font-[family-name:var(--font-heading)]">{p.en.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{p.en.desc}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-start justify-center gap-3 rounded-2xl bg-gradient-to-br ${p.gradientBack} p-7 text-white`}>
                    <p.icon className="h-7 w-7 text-white/80" />
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
