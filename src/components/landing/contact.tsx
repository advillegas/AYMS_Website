"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Heart, Send } from "lucide-react";

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

const CONTACT_ITEMS = [
  {
    href: "https://www.instagram.com/amigasymassocial/",
    icon: InstagramIcon,
    gradient: "from-primary/20 to-magenta/15",
    iconColor: "text-primary",
    en: { title: "@amigasymassocial", sub: "Follow us on Instagram" },
    es: { title: "@amigasymassocial", sub: "Síguenos en Instagram" },
    isLink: true,
  },
  {
    href: undefined,
    icon: Mail,
    gradient: "from-coral/20 to-gold/15",
    iconColor: "text-coral",
    en: { title: "hello@amigasymassocial.com", sub: "Email us anytime" },
    es: { title: "hello@amigasymassocial.com", sub: "Escríbenos cuando quieras" },
    isLink: false,
  },
  {
    href: undefined,
    icon: Heart,
    gradient: "from-lavender/20 to-primary/15",
    iconColor: "text-magenta",
    en: { title: "Become an Amiga", sub: "Join for free and access the community portal" },
    es: { title: "Hazte una Amiga", sub: "Únete gratis y accede al portal comunitario" },
    isLink: false,
  },
];

export function Contact() {
  return (
    <section id="contact" className="relative py-28 overflow-hidden">
      <div className="absolute inset-0 pattern-grid opacity-20" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-primary text-glow-pink">
              Contact Us
            </p>
            <h2 className="mt-3 font-[family-name:var(--font-heading)] text-4xl font-bold tracking-tight sm:text-5xl">
              Ready to Join the{" "}
              <span className="bg-gradient-to-r from-primary via-magenta to-coral bg-clip-text text-transparent">Family</span>?
            </h2>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
              Have questions about events, trips, or membership? We&apos;d love
              to hear from you. Reach out and we&apos;ll get back to you
              shortly.
            </p>

            <div className="mt-8 space-y-4">
              {CONTACT_ITEMS.map((item) => {
                const inner = (
                  <>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${item.gradient}`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        <span className="group-hover:hidden">{item.en.title}</span>
                        <span className="hidden group-hover:inline text-primary">{item.es.title}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="group-hover:hidden">{item.en.sub}</span>
                        <span className="hidden group-hover:inline">{item.es.sub}</span>
                      </p>
                    </div>
                  </>
                );
                const cls = "group flex items-center gap-4 rounded-xl border border-rosa/20 bg-card p-5 transition-all hover:border-primary/40 hover:glow-pink cursor-default";
                return item.isLink ? (
                  <a key={item.en.title} href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <div key={item.en.title} className={cls}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Card className="border-rosa/20 glow-pink-lg relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/3 to-rosa/3" />
              <CardHeader className="relative">
                <h3 className="text-xl font-bold font-[family-name:var(--font-heading)]">Newsletter</h3>
                <p className="text-sm text-muted-foreground">
                  Stay updated on events, trips, and community news.
                </p>
              </CardHeader>
              <CardContent className="relative">
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold">Name</Label>
                    <Input id="name" placeholder="Your name" className="border-rosa/25 focus-visible:ring-primary/40 bg-card/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      className="border-rosa/25 focus-visible:ring-primary/40 bg-card/50"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-to-r from-primary via-magenta to-primary text-white border-0 hover:opacity-90 glow-pink animate-shimmer font-semibold h-11">
                    <Send className="h-4 w-4 mr-2" />
                    Subscribe ♡
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
