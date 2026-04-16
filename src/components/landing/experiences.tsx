"use client";

import { motion } from "framer-motion";

const EXPERIENCES = [
  { title: "Cenote Swimming in the Yucatán", location: "Mexico", emoji: "🏊‍♀️", gradient: "from-[#2D8B6F] to-[#1a5c4a]" },
  { title: "Cooking Class in Cartagena", location: "Colombia", emoji: "🍳", gradient: "from-[#DAA520] to-[#8B6914]" },
  { title: "Sunrise Safari Drive", location: "Kenya", emoji: "🦒", gradient: "from-[#C44B3F] to-[#8B3029]" },
  { title: "Wine Tasting in Napa Valley", location: "California", emoji: "🍷", gradient: "from-[#9B2C8A] to-[#6B1D5E]" },
  { title: "Salsa Night in Medellín", location: "Colombia", emoji: "💃", gradient: "from-[#E8458B] to-[#B8306A]" },
  { title: "Temple Visit in Kyoto", location: "Japan", emoji: "⛩️", gradient: "from-[#D4357A] to-[#9B2C8A]" },
];

export function Experiences() {
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rosa/8 via-background to-background" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rosa/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
            Bucket List
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold sm:text-5xl">
            Unforgettable{" "}
            <span className="bg-gradient-to-r from-primary via-coral to-gold bg-clip-text text-transparent">
              Experiences
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Every trip is packed with curated activities that you&apos;ll
            remember forever. Here are just a few.
          </p>
        </motion.div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="mt-14 flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="shrink-0 w-72 snap-center sm:w-auto"
            >
              <div
                className={`group relative h-52 overflow-hidden rounded-2xl bg-gradient-to-br ${exp.gradient} p-6 flex flex-col justify-end text-white transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20 cursor-default`}
              >
                <div className="absolute inset-0 pattern-dots opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

                <span className="absolute top-4 right-4 text-3xl transition-transform group-hover:scale-110 group-hover:rotate-6">
                  {exp.emoji}
                </span>

                <div className="relative">
                  <h3 className="text-base font-bold font-[family-name:var(--font-heading)] leading-snug drop-shadow-md">
                    {exp.title}
                  </h3>
                  <p className="text-xs text-white/60 mt-1">{exp.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
