"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { EditableText } from "@/components/inline/editable-text";
import { FlipCard } from "@/components/ui/flip-card";
import { EASE } from "./shared";

const FEATURES = [
  {
    icon: "/camp/icon-nostalgia.png",
    en: {
      title: "Camp Nostalgia",
      desc: "Cabins, bunk beds, ice breakers, and classic camp vibes — re-imagined for Latinas.",
    },
    es: {
      title: "Nostalgia de Campamento",
      desc: "Cabañas, literas, dinámicas para romper el hielo y el clásico ambiente de campamento — reimaginado para Latinas.",
    },
    gradientBack: "from-[#FF0099] to-[#B51760]",
  },
  {
    icon: "/camp/icon-play.png",
    en: {
      title: "Play, Laughter, Fun",
      desc: "Group games, pool time, movie nights, and carefree moments that feel like true sisterhood.",
    },
    es: {
      title: "Juego, Risas, Diversión",
      desc: "Juegos en grupo, piscina, noches de película y momentos sin preocupaciones que se sienten como verdadera hermandad.",
    },
    gradientBack: "from-[#FF7F50] to-[#FF0099]",
  },
  {
    icon: "/camp/icon-connection.png",
    en: {
      title: "Connection & Reflection",
      desc: "Intentional connections and space to reconnect with yourself and other Latinas.",
    },
    es: {
      title: "Conexión y Reflexión",
      desc: "Conexiones intencionales y espacio para reconectar contigo misma y con otras Latinas.",
    },
    gradientBack: "from-[#9B2C8A] to-[#FF0099]",
  },
  {
    icon: "/camp/icon-community.png",
    en: {
      title: "True Community",
      desc: "You'll arrive solo but you won't leave alone. These are amigas that extend beyond the weekend.",
    },
    es: {
      title: "Comunidad Verdadera",
      desc: "Llegarás sola pero no te irás sola. Son amigas que trascienden el fin de semana.",
    },
    gradientBack: "from-[#B51760] to-[#FF7F50]",
  },
];

export function CampFeatures() {
  const reduceMotion = useReducedMotion();
  const reveal = {
    initial: reduceMotion ? false : { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.7, ease: EASE },
  };

  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <Image
        src="/camp/texture.webp"
        alt=""
        fill
        unoptimized
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-white/25" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.p {...reveal} className="eyebrow mb-8 text-center text-[#B51760]">
          Hover or tap to flip · Pasa el cursor o toca para voltear
        </motion.p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.en.title}
              initial={reduceMotion ? false : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: reduceMotion ? 0 : i * 0.08, ease: EASE }}
            >
              <FlipCard
                className="h-64 cursor-pointer rounded-2xl"
                front={
                  <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-[#221019]/8 bg-white p-7 text-center elevate-2">
                    <div className="mb-4 h-16 w-16">
                      <Image src={f.icon} alt="" width={64} height={64} unoptimized className="h-full w-full object-contain" />
                    </div>
                    <EditableText id={`camp.feature.${i}.en.title`} as="h3" className="font-display text-lg text-ink">{f.en.title}</EditableText>
                    <EditableText id={`camp.feature.${i}.en.desc`} as="p" multiline className="mt-2 text-sm leading-relaxed text-ink-soft">{f.en.desc}</EditableText>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${f.gradientBack} p-7 text-center text-white`}>
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/90 p-2.5">
                      <Image src={f.icon} alt="" width={48} height={48} unoptimized className="h-full w-full object-contain" />
                    </div>
                    <EditableText id={`camp.feature.${i}.es.title`} as="h3" className="font-display text-lg">{f.es.title}</EditableText>
                    <EditableText id={`camp.feature.${i}.es.desc`} as="p" multiline className="mt-2 text-sm leading-relaxed text-white/90">{f.es.desc}</EditableText>
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
