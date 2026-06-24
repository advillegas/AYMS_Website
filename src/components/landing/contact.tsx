"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Send, Loader2 } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { useNewsletter } from "@/lib/use-newsletter";
import { useContactLinks } from "@/lib/use-site-content";
import { getPlatform, resolveContactHref } from "@/lib/social-icons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Contact() {
  const prefersReducedMotion = useReducedMotion();
  const { submitting, subscribe } = useNewsletter();
  const contactLinks = useContactLinks();
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
            <EditableText as="p" id="home.contact.eyebrow" className="eyebrow text-[var(--brand-pink)]">Contact Us</EditableText>
            <h2 className="font-display text-title mt-3 text-ink text-balance">
              <EditableText as="span" id="home.contact.title.before">Ready to join the</EditableText>{" "}
              <EditableText as="span" id="home.contact.title.accent" className="font-display-italic text-[var(--magenta)]">family</EditableText>
              <EditableText as="span" id="home.contact.title.after">?</EditableText>
            </h2>
            <EditableText as="p" id="home.contact.lead" className="text-lead mt-5 text-ink-soft leading-relaxed">
              Have questions about events, trips, or membership? We&apos;d love
              to hear from you. Reach out and we&apos;ll get back to you
              shortly.
            </EditableText>

            <div className="mt-8 space-y-4">
              {contactLinks.map((item, i) => {
                const plat = getPlatform(item.platform);
                const Icon = plat.Icon;
                const href = resolveContactHref(item.platform, item.href);
                const inner = (
                  <>
                    <div
                      className={`relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl elevate-2 ${
                        item.image ? "bg-white" : `bg-gradient-to-br ${plat.gradient}`
                      }`}
                    >
                      {item.image ? (
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          unoptimized
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <Icon className={`h-5 w-5 ${plat.iconColor}`} />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        <span className="group-hover:hidden">{item.enTitle}</span>
                        <span className="hidden text-[var(--magenta)] group-hover:inline">
                          {item.esTitle || item.enTitle}
                        </span>
                      </p>
                      <p className="truncate text-xs text-ink-soft">
                        <span className="group-hover:hidden">{item.enSub}</span>
                        <span className="hidden group-hover:inline">
                          {item.esSub || item.enSub}
                        </span>
                      </p>
                    </div>
                  </>
                );
                // The page-wide `lift` hover plus a tap-scale so the tiles feel
                // tactile on both mouse and touch.
                const cls =
                  "glass lift group flex items-center gap-4 rounded-2xl p-5 transition-all elevate-2 active:scale-[0.98]";
                return href ? (
                  <a
                    key={i}
                    href={href}
                    target={plat.external ? "_blank" : undefined}
                    rel={plat.external ? "noopener noreferrer" : undefined}
                    aria-label={
                      plat.external ? `${item.enSub} (opens in a new tab)` : item.enSub
                    }
                    className={`${cls} cursor-pointer`}
                  >
                    {inner}
                  </a>
                ) : (
                  <div key={i} className={`${cls} cursor-default`}>
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
                <EditableText as="p" id="home.contact.newsletterEyebrow" className="eyebrow text-[var(--brand-pink)]">Newsletter</EditableText>
                <h3 className="font-display mt-2 text-2xl text-ink">
                  <EditableText as="span" id="home.contact.newsletterTitle.before">Stay in the</EditableText>{" "}
                  <EditableText as="span" id="home.contact.newsletterTitle.accent" className="font-display-italic text-[var(--magenta)]">loop</EditableText>
                </h3>
                <EditableText as="p" id="home.contact.newsletterSub" className="mt-1 text-sm text-ink-soft">
                  Be the first to know about new events, trips, and community
                  news.
                </EditableText>
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
                  <EditableText as="p" id="home.contact.newsletterFinePrint" className="text-center text-[11px] text-ink-soft">
                    No spam, ever — just the good stuff. Unsubscribe anytime. ♡
                  </EditableText>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
