"use client";

import { motion } from "framer-motion";

const EXPERIENCES = [
  { title: "Cenote Swimming in the Yucatán", location: "Mexico", emoji: "🏊‍♀️", gradient: "from-[#2D8B6F] to-[#1a5c4a]" },
  { title: "Cooking Class in Cartagena", location: "Colombia", emoji: "🍳", gradient: "from-[#DAA520] to-[#8B6914]" },
  { title: "Sunrise Safari Drive", location: "Kenya", emoji: "🦒", gradient: "from-[#C44B3F] to-[#8B3029]" },
  { title: "Wine Tasting in Napa Valley", location: "California", emoji: "🍷", gradient: "from-[#9B2C8A] to-[#6B1D5E]" },
  { title: "Salsa Night in Medellín", location: "Colombia", emoji: "💃", gradient: "from-[#FF0099] to-[#B8306A]" },
  { title: "Temple Visit in Kyoto", location: "Japan", emoji: "⛩️", gradient: "from-[#B51760] to-[#9B2C8A]" },
];

export function Experiences() {
  return (
    <section className="relative py-32 overflow-hidden bg-[#FFF7FB]">
      <div className="absolute inset-0 pattern-dots opacity-[0.35]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FF0099]">
            Bucket List
          </p>
          <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-[#6A1B4D] text-balance">
            Unforgettable{" "}
            <span className="text-gradient-brand">Experiences</span>
          </h2>
          <p className="text-lead mx-auto mt-4 max-w-xl text-[#6A1B4D]/80">
            Every trip is packed with curated activities that you&apos;ll
            remember forever. Here are just a few.
          </p>
        </motion.div>

        {/* Horizontal scroll on mobile, grid on desktop */}
        <div className="mt-14 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:overflow-visible sm:pb-0">
          {EXPERIENCES.map((exp, i) => (
            <motion.div
              key={exp.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 w-72 snap-center sm:w-auto"
            >
              <div
                className={`lift group relative h-56 overflow-hidden rounded-3xl bg-gradient-to-br ${exp.gradient} p-6 flex flex-col justify-end text-white cursor-default elevate-3`}
              >
                <div className="absolute inset-0 pattern-dots opacity-10" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                <span className="absolute top-5 right-5 text-3xl transition-transform group-hover:scale-110 group-hover:rotate-6 drop-shadow-lg">
                  {exp.emoji}
                </span>

                {/* location chip */}
                <div className="relative mb-2">
                  <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur-sm">
                    {exp.location}
                  </span>
                </div>
                <div className="relative">
                  <h3 className="text-base font-bold font-[family-name:var(--font-heading)] leading-snug drop-shadow-md">
                    {exp.title}
                  </h3>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
