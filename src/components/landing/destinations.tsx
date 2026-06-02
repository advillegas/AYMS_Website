"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { name: "Mexico", emoji: "🇲🇽", gradient: "from-[#FF0099] to-[#C44B3F]", trips: 3 },
  { name: "Colombia", emoji: "🇨🇴", gradient: "from-[#DAA520] to-[#C44B3F]", trips: 1 },
  { name: "Bali", emoji: "🏝️", gradient: "from-[#2D8B6F] to-[#DAA520]", trips: 2 },
  { name: "Japan", emoji: "🇯🇵", gradient: "from-[#FF0099] to-[#FF6BA8]", trips: 1 },
  { name: "Kenya", emoji: "🦁", gradient: "from-[#DAA520] to-[#8B4513]", trips: 1 },
  { name: "Morocco", emoji: "🇲🇦", gradient: "from-[#C44B3F] to-[#DAA520]", trips: 1 },
  { name: "Peru", emoji: "🇵🇪", gradient: "from-[#9B2C8A] to-[#FF0099]", trips: 1 },
  { name: "Greece", emoji: "🇬🇷", gradient: "from-[#2D6BB8] to-[#2D8B6F]", trips: 1 },
];

export function Destinations() {
  return (
    <section className="grain relative overflow-hidden py-32 bg-[#1a0a12]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a0a12] via-[#2A0A1E] to-[#1a0a12]" />
      <div className="aurora opacity-40" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FACDE8]/70">
            Explore by Destination
          </p>
          <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-white text-balance">
            Where Will{" "}
            <span className="text-gradient-brand">You Go</span>?
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link
                href="/trips"
                className={cn(
                  "lift group relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-center text-white elevate-3",
                  dest.gradient,
                )}
              >
                <div className="absolute inset-0 pattern-dots opacity-10" />
                <div className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/0" />
                <span className="relative text-5xl mb-2 transition-transform group-hover:scale-115 drop-shadow-lg">
                  {dest.emoji}
                </span>
                <h3 className="relative text-lg font-bold font-[family-name:var(--font-heading)] drop-shadow-md">
                  {dest.name}
                </h3>
                <p className="relative mt-0.5 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                  {dest.trips} trip{dest.trips !== 1 ? "s" : ""}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Bottom fade into light bg */}
      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFF7FB] to-transparent" />
    </section>
  );
}
