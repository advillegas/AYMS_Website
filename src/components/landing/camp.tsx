"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Sun } from "lucide-react";
import Link from "next/link";

export function Camp() {
  return (
    <section id="camp" className="bg-muted/50 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="secondary" className="mb-4">
              Summer 2026
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Amigas Summer Camp{" "}
              <span className="text-primary">2026</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Three days of bonding, growth, and unforgettable memories. Our
              annual camp brings amigas together for workshops, outdoor
              adventures, and sisterhood.
            </p>

            <div className="mt-8 grid grid-cols-2 gap-4">
              {[
                { icon: Calendar, label: "July 15–18, 2026" },
                { icon: MapPin, label: "Camp Wilderness, CA" },
                { icon: Users, label: "Limited to 50 Amigas" },
                { icon: Sun, label: "3 Days of Fun" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg bg-background p-3 border border-border/50"
                >
                  <item.icon className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-sm font-medium">{item.label}</span>
                </div>
              ))}
            </div>

            <Button size="lg" className="mt-8" render={<Link href="/register" />}>
              Register Now
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-coral/20 to-gold/20 p-8 flex items-center justify-center border border-border/30">
              <div className="text-center">
                <Sun className="mx-auto h-20 w-20 text-primary/60" />
                <p className="mt-4 text-2xl font-bold text-foreground/80">
                  Camp AYMS
                </p>
                <p className="mt-2 text-muted-foreground">
                  connect · empower · celebrate
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
