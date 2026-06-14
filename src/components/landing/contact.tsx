"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Heart, Send, Loader2 } from "lucide-react";
import { useNewsletter } from "@/lib/use-newsletter";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
    external: true,
  },
  {
    href: "mailto:hello@amigasymassocial.com",
    icon: Mail,
    gradient: "from-coral/20 to-brand-pink/15",
    iconColor: "text-coral",
    en: { title: "hello@amigasymassocial.com", sub: "Email us anytime" },
    es: { title: "hello@amigasymassocial.com", sub: "Escríbenos cuando quieras" },
    isLink: true,
    external: false,
  },
  {
    href: "/register",
    icon: Heart,
    gradient: "from-rosa/20 to-primary/15",
    iconColor: "text-magenta",
    en: { title: "Become an Amiga", sub: "Join for free and access the community portal" },
    es: { title: "Hazte una Amiga", sub: "Únete gratis y accede al portal comunitario" },
    isLink: true,
    external: false,
  },
];

export function Contact() {
  const prefersReducedMotion = useReducedMotion();
  const { submitting, subscribe } = useNewsletter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Please enter a valid email address.");
      toast.error("Please enter a valid email address.");
      return;
    }
    setError(null);

    // Persist the signup to Firestore (capture only — no email is sent).
    // Degrades gracefully to a local "you're on the list" when Firebase
    // isn't configured.
    const result = await subscribe({
      email: trimmedEmail,
      name: name.trim() || undefined,
      source: "contact",
    });

    if (result.status === "error") {
      setError(result.message);
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setName("");
    setEmail("");
  };

  return (
    <section id="contact" className="canvas-editorial grain relative py-32 overflow-hidden">
      <div className="mesh-warm" aria-hidden="true" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="eyebrow text-[var(--brand-pink)]">Contact Us</p>
            <h2 className="font-display text-title mt-3 text-ink text-balance">
              Ready to join the{" "}
              <span className="font-display-italic text-[var(--magenta)]">family</span>?
            </h2>
            <p className="text-lead mt-5 text-ink-soft leading-relaxed">
              Have questions about events, trips, or membership? We&apos;d love
              to hear from you. Reach out and we&apos;ll get back to you
              shortly.
            </p>

            <div className="mt-8 space-y-4">
              {CONTACT_ITEMS.map((item) => {
                const inner = (
                  <>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${item.gradient} elevate-2`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        <span className="group-hover:hidden">{item.en.title}</span>
                        <span className="hidden group-hover:inline text-[var(--magenta)]">{item.es.title}</span>
                      </p>
                      <p className="text-xs text-ink-soft">
                        <span className="group-hover:hidden">{item.en.sub}</span>
                        <span className="hidden group-hover:inline">{item.es.sub}</span>
                      </p>
                    </div>
                  </>
                );
                const cls = "glass lift group flex items-center gap-4 rounded-2xl p-5 transition-all elevate-2";
                return item.isLink ? (
                  <a
                    key={item.en.title}
                    href={item.href}
                    target={item.external ? "_blank" : undefined}
                    rel={item.external ? "noopener noreferrer" : undefined}
                    aria-label={
                      item.external
                        ? `${item.en.sub} (opens in a new tab)`
                        : item.en.sub
                    }
                    className={`${cls} cursor-pointer`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={item.en.title} className={`${cls} cursor-default`}>
                    {inner}
                  </div>
                );
              })}
            </div>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <Card className="glass-strong elevate-float overflow-hidden rounded-3xl border-[#FACDE8]/60">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--magenta)]/4 to-[#FACDE8]/8" />
              <CardHeader className="relative">
                <p className="eyebrow text-[var(--brand-pink)]">Newsletter</p>
                <h3 className="font-display mt-2 text-2xl text-ink">
                  Stay in the{" "}
                  <span className="font-display-italic text-[var(--magenta)]">loop</span>
                </h3>
                <p className="mt-1 text-sm text-ink-soft">
                  Be the first to know about new events, trips, and community
                  news.
                </p>
              </CardHeader>
              <CardContent className="relative">
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold text-ink">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      disabled={submitting}
                      className="rounded-xl border-[#221019]/12 focus-visible:ring-[var(--magenta)]/40 bg-white/70"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-ink">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="you@example.com"
                      disabled={submitting}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "newsletter-email-error" : undefined}
                      className="rounded-xl border-[#221019]/12 focus-visible:ring-[var(--magenta)]/40 bg-white/70"
                    />
                    {error ? (
                      <p
                        id="newsletter-email-error"
                        role="alert"
                        className="text-xs font-medium text-destructive"
                      >
                        {error}
                      </p>
                    ) : null}
                  </div>
                  <Button
                    type="submit"
                    disabled={submitting}
                    aria-busy={submitting}
                    className="lift w-full h-12 rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] text-white border-0 hover:brightness-110 shadow-[0_6px_24px_rgb(255_0_153/0.30)] font-semibold disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" aria-hidden="true" />
                        Subscribing…
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" aria-hidden="true" />
                        Subscribe ♡
                      </>
                    )}
                  </Button>
                  <p className="text-center text-[11px] text-ink-soft">
                    No spam, ever — just the good stuff. Unsubscribe anytime. ♡
                  </p>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
