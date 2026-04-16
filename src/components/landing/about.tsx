"use client";

import { motion } from "framer-motion";
import { Heart, Globe, Coffee, Sparkles } from "lucide-react";
import { FlipCard } from "@/components/ui/flip-card";

const VALUES = [
  {
    icon: Heart,
    en: { title: "Sisterhood", description: "We believe in the power of women supporting women. Every amiga is family." },
    es: { title: "Hermandad", description: "Creemos en el poder de las mujeres apoyando a mujeres. Cada amiga es familia." },
    gradient: "from-primary/20 to-rosa/15",
    gradientBack: "from-primary to-magenta",
    iconColor: "text-primary",
  },
  {
    icon: Globe,
    en: { title: "Culture", description: "Celebrating our Latina roots through shared experiences, traditions, and pride." },
    es: { title: "Cultura", description: "Celebrando nuestras raíces Latinas a través de experiencias, tradiciones y orgullo." },
    gradient: "from-coral/20 to-gold/15",
    gradientBack: "from-coral to-gold",
    iconColor: "text-coral",
  },
  {
    icon: Coffee,
    en: { title: "Connection", description: "From Coffee & Cuties meetups to group trips, we create spaces to bond." },
    es: { title: "Conexión", description: "De nuestros meetups de Café y Cuties a viajes grupales, creamos espacios para conectar." },
    gradient: "from-gold/20 to-lavender/15",
    gradientBack: "from-gold to-coral",
    iconColor: "text-gold",
  },
  {
    icon: Sparkles,
    en: { title: "Growth", description: "Empowering each other to grow, explore, and become our best selves." },
    es: { title: "Crecimiento", description: "Empoderándonos mutuamente para crecer, explorar y ser nuestra mejor versión." },
    gradient: "from-lavender/20 to-primary/15",
    gradientBack: "from-magenta to-lavender",
    iconColor: "text-magenta",
  },
];

export function About() {
  return (
    <section id="about" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-30" />
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
            About Us
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight sm:text-5xl">
            More Than a Community —{" "}
            <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">
              We Are Family
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground leading-relaxed">
            Amigas Y Más Social is a Latina community and travel company built
            on connection, empowerment, and celebration. Founded by Sally Vee, we bring
            women together through unforgettable experiences.
          </p>
        </motion.div>

        <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALUES.map((v, i) => (
            <motion.div
              key={v.en.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5 }}
            >
              <FlipCard
                className="h-64 cursor-pointer"
                front={
                  <div className={`flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br ${v.gradient} p-8 text-center border border-rosa/20 border-glow transition-shadow hover:glow-pink`}>
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl bg-card/80 backdrop-blur-sm shadow-md ${v.iconColor}`}>
                      <v.icon className="h-8 w-8" />
                    </div>
                    <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">{v.en.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{v.en.description}</p>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col items-center justify-center gap-4 rounded-2xl bg-gradient-to-br ${v.gradientBack} p-8 text-center text-white glow-pink`}>
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur-sm">
                      <v.icon className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-lg font-bold font-[family-name:var(--font-heading)]">{v.es.title}</h3>
                    <p className="text-sm text-white/85 leading-relaxed">{v.es.description}</p>
                  </div>
                }
              />
            </motion.div>
          ))}
        </div>

        {/* Founder spotlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mt-24 flex flex-col items-center text-center"
        >
          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary via-magenta to-coral flex items-center justify-center text-white text-3xl font-bold font-[family-name:var(--font-heading)] glow-pink-lg animate-pulse-glow">
            SV
          </div>
          <h3 className="mt-5 text-2xl font-bold font-[family-name:var(--font-heading)]">Sally Vee</h3>
          <p className="text-sm text-primary font-semibold uppercase tracking-widest">Founder & CEO</p>
          <p className="mt-3 max-w-lg text-muted-foreground italic leading-relaxed">
            &ldquo;I had a vision of sisterhood and made it my mission to bring it to life.
            Through countless meetings, sleepless nights, and a lot of elbow grease,
            Amigas Y Más was born. It feels like family, every time.&rdquo;
          </p>
        </motion.div>
      </div>
    </section>
  );
}
