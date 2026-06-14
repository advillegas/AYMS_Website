"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart, Globe, Coffee, Sparkles } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";
import { EditableText } from "@/components/inline/editable-text";

const VALUES = [
  {
    icon: Heart,
    en: { title: "Sisterhood", description: "We believe in the power of women supporting women. Every amiga is family." },
    es: { title: "Hermandad", description: "Creemos en el poder de las mujeres apoyando a mujeres. Cada amiga es familia." },
    gradient: "from-primary/20 to-rosa/15",
    gradientBack: "from-primary to-magenta",
    iconColor: "text-primary",
  },
  {
    icon: Globe,
    en: { title: "Culture", description: "Celebrating our Latina roots through shared experiences, traditions, and pride." },
    es: { title: "Cultura", description: "Celebrando nuestras raíces Latinas a través de experiencias, tradiciones y orgullo." },
    gradient: "from-magenta/20 to-brand-pink/15",
    gradientBack: "from-magenta to-brand-pink",
    iconColor: "text-magenta",
  },
  {
    icon: Coffee,
    en: { title: "Connection", description: "From Coffee & Cuties meetups to group trips, we create spaces to bond." },
    es: { title: "Conexión", description: "De nuestros meetups de Café y Cuties a viajes grupales, creamos espacios para conectar." },
    gradient: "from-brand-pink/20 to-rosa/15",
    gradientBack: "from-brand-pink to-magenta",
    iconColor: "text-brand-pink",
  },
  {
    icon: Sparkles,
    en: { title: "Growth", description: "Empowering each other to grow, explore, and become our best selves." },
    es: { title: "Crecimiento", description: "Empoderándonos mutuamente para crecer, explorar y ser nuestra mejor versión." },
    gradient: "from-rosa/20 to-primary/15",
    gradientBack: "from-magenta to-brand-pink",
    iconColor: "text-magenta",
  },
];

export function About() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="about" className="canvas-warm grain relative overflow-hidden py-28 sm:py-32">
      {/* Warm editorial backdrop */}
      <div className="mesh-warm" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Editorial intro — founder-led warmth */}
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7"
          >
            <EditableText as="p" id="home.about.eyebrow" className="eyebrow text-[var(--brand-pink)]">About Us</EditableText>
            <h2 className="text-title mt-4 font-display text-ink text-balance">
              More than a community —{" "}
              <span className="font-display-italic marker-swipe">we are family</span>
            </h2>
            <EditableText as="p" id="home.about.lead" className="text-lead mt-6 max-w-xl text-ink-soft">
              Amigas Y Más Social is the Latina travel community built on
              connection, empowerment, and celebration. Founded by Sally Vee, we
              bring Latina women together through curated group trips, local
              meetups, and a sisterhood that lasts a lifetime.
            </EditableText>
          </motion.div>

          {/* Oversized editorial pull-quote */}
          <motion.figure
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: prefersReducedMotion ? 0 : 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="relative lg:col-span-5"
          >
            <span
              aria-hidden="true"
              className="font-display absolute -left-2 -top-8 select-none text-[7rem] leading-none text-[var(--magenta)]/15"
            >
              &ldquo;
            </span>
            <blockquote className="relative">
              <p className="font-display text-[1.7rem] leading-snug text-ink sm:text-[2rem]">
                We don&apos;t just travel together — we{" "}
                <span className="font-display-italic text-[var(--brand-pink)]">belong</span>{" "}
                together.
              </p>
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-2 text-sm text-ink-soft">
              <span className="h-px w-8 bg-[var(--magenta)]/40" aria-hidden="true" />
              The AYMS promise
            </figcaption>
          </motion.figure>
        </div>

        {/* Value cards */}
        <div className="mt-16 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.en.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.12, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <FlipCard
                className="h-64 cursor-pointer rounded-3xl"
                front={
                  <div className="glass lift elevate-2 flex h-full flex-col items-start justify-center gap-4 rounded-3xl p-7 text-left">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--magenta)]/12 to-[#FACDE8]/40 ${v.iconColor}`}>
                      <v.icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl text-ink">{v.en.title}</h3>
                    <p className="text-sm leading-relaxed text-ink-soft">{v.en.description}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-start justify-center gap-4 rounded-3xl bg-gradient-to-br ${v.gradientBack} p-7 text-left text-white`}>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <v.icon className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl">{v.es.title}</h3>
                    <p className="text-sm leading-relaxed text-white/85">{v.es.description}</p>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>

        {/* Founder spotlight — editorial mission card */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong elevate-3 mt-20 overflow-hidden rounded-[2rem] p-8 sm:p-12"
        >
          <div className="flex flex-col items-center gap-8 text-center sm:flex-row sm:items-start sm:text-left">
            <div className="elevate-float flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--magenta)] via-[var(--brand-pink)] to-[var(--coral)] font-display text-3xl font-semibold text-white">
              SV
            </div>
            <div className="flex-1">
              <EditableText as="p" id="home.about.founderEyebrow" className="eyebrow text-[var(--magenta)]">Founder &amp; CEO</EditableText>
              <EditableText as="h3" id="home.about.founderName" className="mt-2 font-display text-2xl text-ink sm:text-[2rem]">Sally Romero</EditableText>
              <EditableText as="p" id="home.about.founderQuote" className="mt-4 max-w-2xl font-display-italic text-lg leading-relaxed text-ink-soft">
                &ldquo;I had a vision of sisterhood and made it my mission to bring
                it to life. Through countless meetings, sleepless nights, and a lot
                of elbow grease, Amigas Y Más was born. It feels like family, every
                time.&rdquo;
              </EditableText>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
