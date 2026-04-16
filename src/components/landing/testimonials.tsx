"use client";

import { useRef } from "react";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FlipCard } from "@/components/ui/flip-card";

const TESTIMONIALS = [
  {
    name: "Sofia R.",
    location: "Miami, FL",
    trip: "Cancún, 2025",
    en: "AYMS gave me a second family. The trips are incredible and the friendships are real. I've never felt so welcomed anywhere.",
    es: "AYMS me dio una segunda familia. Los viajes son increíbles y las amistades son reales. Nunca me he sentido tan bienvenida.",
    initials: "SR",
    gradient: "from-[#E8458B] to-[#D4357A]",
  },
  {
    name: "Valentina L.",
    location: "New York, NY",
    trip: "Coffee & Cuties, 2026",
    en: "From the first Coffee & Cuties event, I knew I was home. The sisterhood here is unlike anything I've experienced before.",
    es: "Desde el primer evento de Coffee & Cuties, supe que estaba en casa. La hermandad aquí es única.",
    initials: "VL",
    gradient: "from-[#DAA520] to-[#C44B3F]",
  },
  {
    name: "Camila T.",
    location: "Chicago, IL",
    trip: "Summer Camp, 2025",
    en: "Summer camp changed my life. The bonds we built in three days will last a lifetime. Can't wait for next year!",
    es: "El campamento de verano cambió mi vida. Los lazos que construimos en tres días durarán toda la vida.",
    initials: "CT",
    gradient: "from-[#9B2C8A] to-[#E8458B]",
  },
  {
    name: "Isabella M.",
    location: "Austin, TX",
    trip: "Bali, 2024",
    en: "Everything was planned perfectly but still felt spontaneous. The temples, the food, the friendships — Bali with AYMS was a dream.",
    es: "Todo estaba planeado perfectamente pero se sentía espontáneo. Los templos, la comida, las amistades — Bali con AYMS fue un sueño.",
    initials: "IM",
    gradient: "from-[#2D8B6F] to-[#DAA520]",
  },
  {
    name: "Diana P.",
    location: "Los Angeles, CA",
    trip: "Morocco, 2025",
    en: "The Sahara glamping was something out of a movie. I never thought I'd ride a camel at sunset with 13 amazing women. Thank you AYMS!",
    es: "El glamping en el Sahara fue algo de película. Nunca pensé que montaría un camello al atardecer con 13 mujeres increíbles.",
    initials: "DP",
    gradient: "from-[#C44B3F] to-[#DAA520]",
  },
  {
    name: "Ana G.",
    location: "Houston, TX",
    trip: "Colombia, 2025",
    en: "Cartagena was magical. The salsa lessons, the street food, the rooftop dinners — every single detail was curated to perfection.",
    es: "Cartagena fue mágica. Las clases de salsa, la comida callejera, las cenas en la azotea — cada detalle fue curado a la perfección.",
    initials: "AG",
    gradient: "from-[#D4357A] to-[#9B2C8A]",
  },
  {
    name: "Lucia R.",
    location: "Phoenix, AZ",
    trip: "Napa Valley, 2025",
    en: "I was nervous traveling alone for the first time. By day two, I had 15 new best friends. If you're hesitating — just go. You won't regret it.",
    es: "Estaba nerviosa viajando sola por primera vez. Para el segundo día, tenía 15 nuevas mejores amigas. Si estás dudando — solo ve.",
    initials: "LR",
    gradient: "from-[#E8458B] to-[#FF6BA8]",
  },
  {
    name: "Carmen S.",
    location: "San Diego, CA",
    trip: "Safari, 2025",
    en: "Seeing the Big Five with my amigas was a bucket list moment I'll cherish forever. AYMS makes the impossible feel effortless.",
    es: "Ver los Big Five con mis amigas fue un momento de mi lista de deseos que atesoraré para siempre. AYMS hace lo imposible fácil.",
    initials: "CS",
    gradient: "from-[#DAA520] to-[#8B4513]",
  },
];

export function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({
      left: dir === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }

  return (
    <section className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-rosa/8 via-background to-background" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,oklch(0.40_0.14_340/0.06),transparent)]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rosa/40 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between"
        >
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
              Testimonials
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold sm:text-5xl">
              Hear From Our{" "}
              <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">
                Amigas
              </span>
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => scroll("left")} className="rounded-full border-rosa/20 hover:bg-primary/5 hover:border-primary/30">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => scroll("right")} className="rounded-full border-rosa/20 hover:bg-primary/5 hover:border-primary/30">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        {/* Horizontal scroll carousel */}
        <div
          ref={scrollRef}
          className="mt-10 flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="shrink-0 w-80 snap-center"
            >
              <FlipCard
                className="h-72 cursor-pointer"
                front={
                  <div className="flex h-full flex-col justify-between rounded-2xl border border-rosa/15 bg-card p-6 border-glow">
                    <div>
                      <div className="mb-3 text-2xl text-primary">♡</div>
                      <p className="text-sm text-muted-foreground italic leading-relaxed line-clamp-5">
                        &ldquo;{t.en}&rdquo;
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className={`bg-gradient-to-br ${t.gradient} text-white font-bold text-xs`}>
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground">{t.trip}</p>
                      </div>
                    </div>
                  </div>
                }
                back={
                  <div className={`flex h-full flex-col justify-between rounded-2xl bg-gradient-to-br ${t.gradient} p-6 text-white`}>
                    <div>
                      <div className="mb-3 text-2xl text-white/70">♡</div>
                      <p className="text-sm text-white/90 italic leading-relaxed line-clamp-5">
                        &ldquo;{t.es}&rdquo;
                      </p>
                    </div>
                    <div className="mt-4 flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-white/20 text-white font-bold text-xs backdrop-blur-sm">
                          {t.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-bold">{t.name}</p>
                        <p className="text-[10px] text-white/60">{t.trip}</p>
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
