"use client";

import { motion } from "framer-motion";
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
    gradient: "from-gold/25 via-coral/20 to-rosa/15",
    gradientBack: "from-gold via-coral to-primary",
    emoji: "🍷",
  },
  {
    en: { title: "NYC Weekend", desc: "The city that never sleeps! Broadway, food tours, and shopping with your amigas." },
    es: { title: "Fin de Semana en NYC", desc: "¡La ciudad que nunca duerme! Broadway, tours de comida y compras con tus amigas." },
    date: "November 7–9, 2026",
    tag: "Domestic",
    gradient: "from-lavender/25 via-primary/20 to-rosa/15",
    gradientBack: "from-lavender via-magenta to-primary",
    emoji: "🗽",
  },
];

export function Trips() {
  return (
    <section id="trips" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
            Upcoming Trips
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight sm:text-5xl">
            Travel With Your{" "}
            <span className="bg-gradient-to-r from-primary via-coral to-gold bg-clip-text text-transparent">Amigas</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            We organize group trips that create lifelong memories. From beach
            getaways to city adventures, there&apos;s something for every amiga.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          {TRIPS.map((trip, i) => (
            <motion.div
              key={trip.en.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
            >
              <FlipCard
                className="h-[420px] cursor-pointer"
                front={
                  <div className="flex h-full flex-col rounded-2xl border border-rosa/20 bg-card overflow-hidden border-glow transition-shadow hover:glow-pink">
                    <div className={`h-48 bg-gradient-to-br ${trip.gradient} flex items-center justify-center relative`}>
                      <div className="absolute inset-0 pattern-dots opacity-15" />
                      <span className="text-6xl relative z-10 drop-shadow-lg">{trip.emoji}</span>
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-heading)]">{trip.en.title}</h3>
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold">{trip.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                        <Calendar className="h-4 w-4 text-primary" />
                        {trip.date}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed flex-1">{trip.en.desc}</p>
                      <div className="mt-4">
                        <span className="text-xs text-primary/60 font-medium">Hover to see in Spanish →</span>
                      </div>
                    </div>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col rounded-2xl bg-gradient-to-br ${trip.gradientBack} overflow-hidden text-white glow-pink-lg`}>
                    <div className="h-48 flex items-center justify-center relative bg-white/5">
                      <div className="absolute inset-0 pattern-dots opacity-10" />
                      <span className="text-6xl relative z-10 drop-shadow-lg">{trip.emoji}</span>
                    </div>
                    <div className="flex-1 p-6 flex flex-col">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xl font-bold font-[family-name:var(--font-heading)]">{trip.es.title}</h3>
                        <Badge className="bg-white/15 text-white border-white/20 text-[10px] font-bold">{trip.tag}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/70 mb-3">
                        <Calendar className="h-4 w-4" />
                        {trip.date}
                      </div>
                      <p className="text-sm text-white/85 leading-relaxed flex-1">{trip.es.desc}</p>
                      <div className="mt-4">
                        <Link href="/register" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full bg-white/10 border-white/25 text-white hover:bg-white/20 font-semibold")}>
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
    </section>
  );
}
