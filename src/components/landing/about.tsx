"use client";

import { motion } from "framer-motion";
import { Star, Globe, Coffee, Sparkles } from "lucide-react";

const VALUES = [
  {
    icon: Star,
    title: "Sisterhood",
    description:
      "We believe in the power of women supporting women. Every amiga is family.",
  },
  {
    icon: Globe,
    title: "Culture",
    description:
      "Celebrating our Latina roots through shared experiences, traditions, and pride.",
  },
  {
    icon: Coffee,
    title: "Connection",
    description:
      "From Coffee & Cuties meetups to group trips, we create spaces to bond.",
  },
  {
    icon: Sparkles,
    title: "Growth",
    description:
      "Empowering each other to grow, explore, and become our best selves.",
  },
];

export function About() {
  return (
    <section id="about" className="py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            About Us
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            More Than a Community —{" "}
            <span className="text-primary">A Family</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
            Amigas Y Más Social is a Latina community and travel company built
            on connection, empowerment, and celebration. We bring women together
            through unforgettable experiences.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="group rounded-2xl border border-border/50 bg-card p-8 text-center transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <v.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{v.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {v.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
