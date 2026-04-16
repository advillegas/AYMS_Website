"use client";

import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Calendar, MapPin, Users, Sun, Star } from "lucide-react";
import Link from "next/link";

const DETAILS = [
  { icon: Calendar, en: "July 15–18, 2026", es: "15–18 de Julio, 2026" },
  { icon: MapPin, en: "Camp Wilderness, CA", es: "Campamento Wilderness, CA" },
  { icon: Users, en: "Limited to 50 Amigas", es: "Limitado a 50 Amigas" },
  { icon: Sun, en: "3 Days of Fun", es: "3 Días de Diversión" },
];

export function Camp() {
  return (
    <section id="camp" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rosa/12 via-primary/3 to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_50%,oklch(0.60_0.24_340/0.08),transparent)]" />
      <div className="absolute inset-0 pattern-dots opacity-25" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rosa/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-16 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-4 bg-gradient-to-r from-primary to-magenta text-white border-0 px-4 py-1.5 text-xs font-bold tracking-wider glow-pink">
              SUMMER 2026
            </Badge>
            <h2 className="font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight sm:text-5xl">
              Amigas Summer Camp{" "}
              <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">2026</span>
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Three days of bonding, growth, and unforgettable memories. Our
              annual camp brings amigas together for workshops, outdoor
              adventures, and sisterhood.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3">
              {DETAILS.map((item) => (
                <div
                  key={item.en}
                  className="group flex items-center gap-3 rounded-xl bg-card/80 p-3.5 border border-rosa/20 border-glow transition-all hover:border-primary/40 hover:glow-pink cursor-default"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">
                    <span className="group-hover:hidden">{item.en}</span>
                    <span className="hidden group-hover:inline text-primary font-semibold">{item.es}</span>
                  </span>
                </div>
              ))}
            </div>

            <Link
              href="/register"
              className={cn(
                buttonVariants({ size: "lg" }),
                "mt-8 bg-gradient-to-r from-primary via-magenta to-primary text-white border-0 hover:opacity-90 glow-pink-lg animate-shimmer font-semibold px-10",
              )}
            >
              Register Now ♡
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-3xl bg-gradient-to-br from-primary/20 via-magenta/15 to-lavender/20 p-8 flex items-center justify-center border border-rosa/25 glow-pink-lg relative">
              <div className="absolute inset-0 pattern-dots opacity-20" />
              <div className="relative text-center">
                <motion.div
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="mx-auto h-28 w-28 rounded-full bg-gradient-to-br from-primary via-magenta to-coral flex items-center justify-center shadow-2xl glow-pink-lg"
                >
                  <Sun className="h-14 w-14 text-white" />
                </motion.div>
                <p className="mt-6 text-3xl font-extrabold font-[family-name:var(--font-heading)] bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">
                  Camp AYMS
                </p>
                <p className="mt-2 text-muted-foreground text-sm tracking-[0.2em] uppercase font-semibold">
                  connect · empower · celebrate
                </p>
                <div className="mt-4 flex justify-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
