"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Mail, Heart, Send, Loader2 } from "lucide-react";

const NEWSLETTER_INBOX = "hello@amigasymassocial.com";
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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(true);

    try {
      // No third-party email provider is wired up, so we gracefully fall back
      // to opening the visitor's mail client pre-filled with their details.
      // This never throws and degrades cleanly if a mail client is unavailable.
      const subject = encodeURIComponent("Newsletter signup");
      const body = encodeURIComponent(
        `Hi AYMS team,\n\nI'd like to join the newsletter.\n\nName: ${
          name.trim() || "(not provided)"
        }\nEmail: ${trimmedEmail}`,
      );
      window.location.href = `mailto:${NEWSLETTER_INBOX}?subject=${subject}&body=${body}`;
      toast.success(
        "Almost there! Send the email we opened to finish signing up ♡",
      );
      setName("");
      setEmail("");
    } catch {
      toast.error(
        `Couldn't open your email app. Write to us at ${NEWSLETTER_INBOX}.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="contact" className="relative py-32 overflow-hidden bg-[#FFF7FB]">
      <div className="absolute inset-0 pattern-dots opacity-[0.30]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#FF0099]/25 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-start gap-14 lg:grid-cols-2">
          <motion.div
            initial={prefersReducedMotion ? false : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="font-detail text-base font-semibold italic tracking-[0.12em] text-[#FF0099]">
              Contact Us
            </p>
            <h2 className="text-title mt-3 font-[family-name:var(--font-heading)] font-extrabold text-[#6A1B4D] text-balance">
              Ready to Join the{" "}
              <span className="text-gradient-brand">Family</span>?
            </h2>
            <p className="text-lead mt-5 text-[#6A1B4D]/80 leading-relaxed">
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
                      <p className="text-sm font-semibold text-[#6A1B4D]">
                        <span className="group-hover:hidden">{item.en.title}</span>
                        <span className="hidden group-hover:inline text-[#FF0099]">{item.es.title}</span>
                      </p>
                      <p className="text-xs text-[#6A1B4D]/80">
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
              <div className="absolute inset-0 bg-gradient-to-br from-[#FF0099]/4 to-[#FACDE8]/8" />
              <CardHeader className="relative">
                <h3 className="text-xl font-bold font-[family-name:var(--font-heading)] text-[#6A1B4D]">Newsletter</h3>
                <p className="text-sm text-[#6A1B4D]/60">
                  Stay updated on events, trips, and community news.
                </p>
              </CardHeader>
              <CardContent className="relative">
                <form onSubmit={handleSubscribe} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="font-semibold text-[#6A1B4D]">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      disabled={submitting}
                      className="rounded-xl border-[#FACDE8]/50 focus-visible:ring-[#FF0099]/40 bg-white/60"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-semibold text-[#6A1B4D]">Email</Label>
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
                      className="rounded-xl border-[#FACDE8]/50 focus-visible:ring-[#FF0099]/40 bg-white/60"
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
                    className="lift w-full h-12 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] text-white border-0 hover:brightness-110 shadow-[0_6px_24px_rgb(255_0_153/0.30)] font-semibold disabled:opacity-70"
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
                  <p className="text-center text-[11px] text-[#6A1B4D]/55">
                    No spam, ever. Unsubscribe anytime.
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
