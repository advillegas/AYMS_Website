"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Heart, Users, Plane } from "lucide-react";

export function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-[90vh] items-center justify-center overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-coral/5 to-gold/10" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,oklch(0.70_0.18_25/0.12),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,oklch(0.80_0.14_80/0.10),transparent_50%)]" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-primary">
            Community · Travel · Sisterhood
          </p>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Home of Your{" "}
            <span className="bg-gradient-to-r from-primary via-coral to-gold bg-clip-text text-transparent">
              New Amigas
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Join our Latina community for connection, fun, and empowerment.
            We&apos;re ready to be your new family.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Button size="lg" className="text-base px-8 h-12" render={<Link href="/register" />}>
            Become an Amiga
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 h-12"
            render={<a href="#about" />}
          >
            Learn More
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3"
        >
          {[
            { icon: Heart, label: "Connect", desc: "Build lifelong friendships" },
            { icon: Users, label: "Empower", desc: "Grow together as a community" },
            { icon: Plane, label: "Celebrate", desc: "Travel and create memories" },
          ].map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center gap-2 rounded-xl bg-card/60 p-6 backdrop-blur-sm border border-border/50"
            >
              <item.icon className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">{item.label}</h3>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
