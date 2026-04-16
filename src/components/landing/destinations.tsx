"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const DESTINATIONS = [
  { name: "Mexico", emoji: "🇲🇽", gradient: "from-[#E8458B] to-[#C44B3F]", trips: 3 },
  { name: "Colombia", emoji: "🇨🇴", gradient: "from-[#DAA520] to-[#C44B3F]", trips: 1 },
  { name: "Bali", emoji: "🏝️", gradient: "from-[#2D8B6F] to-[#DAA520]", trips: 2 },
  { name: "Japan", emoji: "🇯🇵", gradient: "from-[#E8458B] to-[#FF6BA8]", trips: 1 },
  { name: "Kenya", emoji: "🦁", gradient: "from-[#DAA520] to-[#8B4513]", trips: 1 },
  { name: "Morocco", emoji: "🇲🇦", gradient: "from-[#C44B3F] to-[#DAA520]", trips: 1 },
  { name: "Peru", emoji: "🇵🇪", gradient: "from-[#9B2C8A] to-[#E8458B]", trips: 1 },
  { name: "Greece", emoji: "🇬🇷", gradient: "from-[#2D6BB8] to-[#2D8B6F]", trips: 1 },
];

export function Destinations() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-15" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
            Explore by Destination
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold sm:text-5xl">
            Where Will{" "}
            <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">
              You Go
            </span>
            ?
          </h2>
        </motion.div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {DESTINATIONS.map((dest, i) => (
            <motion.div
              key={dest.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <Link
                href="/trips"
                className={cn(
                  "group relative flex aspect-[4/3] flex-col items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br p-6 text-center text-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20",
                  dest.gradient,
                )}
              >
                <div className="absolute inset-0 pattern-dots opacity-10" />
                <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-black/0" />
                <span className="relative text-5xl mb-2 transition-transform group-hover:scale-110 drop-shadow-lg">
                  {dest.emoji}
                </span>
                <h3 className="relative text-lg font-bold font-[family-name:var(--font-heading)] drop-shadow-md">
                  {dest.name}
                </h3>
                <p className="relative text-xs text-white/70 mt-0.5">
                  {dest.trips} trip{dest.trips !== 1 ? "s" : ""}
                </p>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
