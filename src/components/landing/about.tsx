"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Heart, Globe, Coffee, Sparkles } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

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
    <section id="about" className="grain relative overflow-hidden py-32 bg-[#1a0a12]">
      {/* Dark layered bg */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A0A1E] via-[#1a0a12] to-[#1a0a12]" />
      <div className="aurora opacity-50" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FACDE8]/70">
            About Us
          </p>
          <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
            More Than a Community —{" "}
            <span className="text-gradient-brand">We Are Family</span>
          </h2>
          <p className="text-lead mx-auto mt-5 max-w-2xl text-white/60">
            Amigas Y Más Social is the Latina travel community built
            on connection, empowerment, and celebration. Founded by Sally Vee,
            we bring Latina women together through curated group trips,
            local meetups, and a sisterhood that lasts a lifetime.
          </p>
        </motion.div>

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
                className="ring-gradient h-64 cursor-pointer rounded-3xl"
                front={
                  <div className="flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-white/[0.05] p-8 text-center backdrop-blur-sm border border-white/10">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ${v.iconColor}`}>
                      <v.icon className="h-7 w-7" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold font-[family-name:var(--font-heading)] text-white">{v.en.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{v.en.description}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-br ${v.gradientBack} p-8 text-center text-white`}>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <v.icon className="h-7 w-7 text-white" aria-hidden="true" />
                    </div>
                    <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">{v.es.title}</h3>
                    <p className="text-sm text-white/85 leading-relaxed">{v.es.description}</p>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>

        {/* Founder spotlight */}
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: prefersReducedMotion ? 0 : 0.3, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mt-24 flex flex-col items-center text-center"
        >
          <div className="elevate-float h-24 w-24 rounded-full bg-gradient-to-br from-[#FF0099] via-[#B51760] to-[#C44B3F] flex items-center justify-center text-white text-3xl font-bold font-[family-name:var(--font-heading)] animate-pulse-glow">
            SV
          </div>
          <h3 className="mt-5 text-2xl font-bold font-[family-name:var(--font-heading)] text-white">Sally Vee</h3>
          <p className="text-sm text-[#FF0099] font-semibold uppercase tracking-widest mt-1">Founder & CEO</p>
          <p className="mt-4 max-w-lg text-white/55 italic leading-relaxed font-detail text-base">
            &ldquo;I had a vision of sisterhood and made it my mission to bring it to life.
            Through countless meetings, sleepless nights, and a lot of elbow grease,
            Amigas Y Más was born. It feels like family, every time.&rdquo;
          </p>
        </motion.div>
      </div>

      {/* Bottom fade into light bg */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF7FB] to-transparent" />
    </section>
  );
}
