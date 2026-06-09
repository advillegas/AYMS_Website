"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { MapPin, Plane } from "lucide-react";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { name: "Mexico", emoji: "🇲🇽", gradient: "from-[#FF0099] to-[#C44B3F]", image: "/trips/cancun-aug-26.jpg", trips: 3 },
  { name: "Colombia", emoji: "🇨🇴", gradient: "from-[#DAA520] to-[#C44B3F]", image: "/trips/colombia-dec-26.jpg", trips: 1 },
  { name: "Bali", emoji: "🏝️", gradient: "from-[#2D8B6F] to-[#DAA520]", image: "/trips/bali-jun-26.jpg", trips: 2 },
  { name: "Japan", emoji: "🇯🇵", gradient: "from-[#FF0099] to-[#FF6BA8]", image: "/trips/japan-nov-26.jpg", trips: 1 },
  { name: "Kenya", emoji: "🦁", gradient: "from-[#DAA520] to-[#8B4513]", image: "/trips/safari-jul-26.jpg", trips: 1 },
  { name: "Morocco", emoji: "🇲🇦", gradient: "from-[#C44B3F] to-[#DAA520]", image: "/trips/morocco-may-26.jpg", trips: 1 },
  { name: "Peru", emoji: "🇵🇪", gradient: "from-[#9B2C8A] to-[#FF0099]", image: "/destinations/peru.jpg", trips: 1 },
  { name: "Greece", emoji: "🇬🇷", gradient: "from-[#2D6BB8] to-[#2D8B6F]", image: "/destinations/greece.jpg", trips: 1 },
];

export function Destinations() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section className="canvas-editorial grain relative overflow-hidden py-28">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="eyebrow text-[#B51760]">Explore by Destination</p>
          <h2 className="text-title mt-3 font-display text-ink text-balance">
            Where will{" "}
            <span className="font-display-italic text-[#FF0099]">you go</span>?
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.name}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: prefersReducedMotion ? 0 : i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link href="/trips" className="photo-card group block elevate-2" aria-label={`${dest.name} — ${dest.trips} trip${dest.trips !== 1 ? "s" : ""}`}>
                <div className="photo-card-media aspect-[20/19]">
                  <div className={cn("photo-card-zoom grain absolute inset-0 bg-gradient-to-br", dest.gradient)}>
                    <Image src={dest.image} alt={`${dest.name} — travel destination`} fill unoptimized sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" />
                    <div className="absolute inset-0 pattern-dots opacity-10" aria-hidden="true" />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/5" aria-hidden="true" />
                  </div>
                  <span className="absolute bottom-2.5 left-3 z-10 text-3xl drop-shadow-lg" aria-hidden="true">
                    {dest.emoji}
                  </span>
                  <span className="pill-glass absolute left-3 top-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    <Plane className="h-3 w-3" aria-hidden="true" />
                    {dest.trips} trip{dest.trips !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 p-3 sm:p-4">
                  <h3 className="min-w-0 truncate font-display text-base text-ink sm:text-lg">{dest.name}</h3>
                  <span className="inline-flex shrink-0 items-center gap-1 text-sm text-ink-soft">
                    <MapPin className="h-3.5 w-3.5 text-[#FF0099]" aria-hidden="true" />
                    Explore
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
