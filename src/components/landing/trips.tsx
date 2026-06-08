"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import Link from "next/link";
import { FlipCard } from "@/components/ui/flip-card";

const TRIPS = [
  {
    en: { title: "Cancún, Mexico", desc: "All-inclusive resort adventure on the Caribbean coast. Sun, culture, and sisterhood." },
    es: { title: "Cancún, México", desc: "Aventura todo incluido en la costa del Caribe. Sol, cultura y hermandad." },
    date: "August 20–25, 2026",
    tag: "International",
    gradient: "from-primary/25 via-magenta/20 to-rosa/15",
    gradientBack: "from-primary via-magenta to-coral",
    emoji: "🇲🇽",
  },
  {
    en: { title: "Wine Country, Napa", desc: "A relaxing weekend of wine tastings, spa treatments, and meaningful conversations." },
    es: { title: "País del Vino, Napa", desc: "Un fin de semana relajante de catas de vino, spa y conversaciones significativas." },
    date: "October 10–12, 2026",
    tag: "Domestic",
    gradient: "from-coral/25 via-coral/20 to-rosa/15",
    gradientBack: "from-coral via-coral to-primary",
    emoji: "🍷",
  },
  {
    en: { title: "NYC Weekend", desc: "The city that never sleeps! Broadway, food tours, and shopping with your amigas." },
    es: { title: "Fin de Semana en NYC", desc: "¡La ciudad que nunca duerme! Broadway, tours de comida y compras con tus amigas." },
    date: "November 7–9, 2026",
    tag: "Domestic",
    gradient: "from-brand-pink/25 via-primary/20 to-rosa/15",
    gradientBack: "from-brand-pink via-magenta to-primary",
    emoji: "🗽",
  },
];

export function Trips() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section id="trips" className="grain relative overflow-hidden py-32 bg-[#3A1020]">
      {/* Coral-tinted dark bg — trips section only uses coral */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#3A1020] via-[#2A0D18] to-[#1a0a12]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgb(255_127_80/0.18),transparent)]" />
      <div className="absolute inset-0 pattern-dots opacity-10" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF7F50]/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FF7F50]">
            Upcoming Trips
          </p>
          <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
            Travel With Your{" "}
            <span className="bg-gradient-to-r from-[#FF7F50] via-[#FF0099] to-[#B51760] bg-clip-text text-transparent">Amigas</span>
          </h2>
          <p className="text-lead mx-auto mt-5 max-w-2xl text-white/55">
            We organize group trips that create lifelong memories. From beach
            getaways to city adventures, there&apos;s something for every amiga.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {TRIPS.map((trip, i) => (
            <motion.div
              key={trip.en.title}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <FlipCard
                className="ring-gradient h-[440px] cursor-pointer rounded-3xl"
                front={
                  <div className="flex h-full flex-col rounded-3xl bg-white/[0.06] overflow-hidden border border-white/10 backdrop-blur-sm">
                    <div className={`h-48 bg-gradient-to-br ${trip.gradient} flex items-center justify-center relative`}>
                      <div className="absolute inset-0 pattern-dots opacity-15" />
                      <span className="text-6xl relative z-10 drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] text-white">{trip.en.title}</h3>
                        <Badge className="bg-[#FF7F50]/15 text-[#FF7F50] border-[#FF7F50]/20 text-[10px] font-bold">{trip.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/55 mb-3">
                        <Calendar className="h-4 w-4 text-[#FF7F50]" aria-hidden="true" />
                        {trip.date}
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed flex-1">{trip.en.desc}</p>
                      <div className="mt-4">
                        <span className="text-xs text-[#FF7F50] font-medium">Hover to see in Spanish →</span>
                      </div>
                    </div>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col rounded-3xl bg-gradient-to-br ${trip.gradientBack} overflow-hidden text-white`}>
                    <div className="h-48 flex items-center justify-center relative bg-black/10">
                      <div className="absolute inset-0 pattern-dots opacity-10" />
                      <span className="text-6xl relative z-10 drop-shadow-lg" aria-hidden="true">{trip.emoji}</span>
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-heading)]">{trip.es.title}</h3>
                        <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-bold">{trip.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                        <Calendar className="h-4 w-4" aria-hidden="true" />
                        {trip.date}
                      </div>
                      <p className="text-sm text-white/85 leading-relaxed flex-1">{trip.es.desc}</p>
                      <div className="mt-4">
                        <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full rounded-full bg-white/10 border-white/25 text-white hover:bg-white/20 font-semibold")}>
                          Join Trip ♡
                        </Link>
                      </div>
                    </div>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom fade into light bg */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF7FB] to-transparent" />
    </section>
  );
}
