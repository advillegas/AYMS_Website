"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { z } from "zod";
import { Loader2, Send, CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditableText } from "@/components/inline/editable-text";
import { useConcierge } from "@/lib/use-concierge";

const Schema = z.object({
  name: z.string().trim().min(2, "Please add your name."),
  email: z.string().trim().email("Please enter a valid email."),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  destination: z.string().trim().max(200).optional().or(z.literal("")),
  travelDates: z.string().trim().max(120).optional().or(z.literal("")),
  partySize: z.string().trim().max(60).optional().or(z.literal("")),
  budget: z.string().trim().max(60).optional().or(z.literal("")),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
});

const BUDGETS = [
  "Not sure yet",
  "$2,500 – $5,000 / person",
  "$5,000 – $10,000 / person",
  "$10,000+ / person",
];

const inputCls =
  "rounded-xl border-[#221019]/12 bg-white/80 focus-visible:ring-[var(--magenta)]/40";

export function ConciergeInquiry() {
  const reduceMotion = useReducedMotion();
  const { submitting, submit } = useConcierge();
  const [done, setDone] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState("");
  const [travelDates, setTravelDates] = useState("");
  const [partySize, setPartySize] = useState("");
  const [budget, setBudget] = useState("");
  const [details, setDetails] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsed = Schema.safeParse({
      name,
      email,
      phone,
      destination,
      travelDates,
      partySize,
      budget,
      details,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    const res = await submit({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || undefined,
      destination: parsed.data.destination || undefined,
      travelDates: parsed.data.travelDates || undefined,
      partySize: parsed.data.partySize || undefined,
      budget: parsed.data.budget || undefined,
      details: parsed.data.details || undefined,
    });
    if (res.status === "error") {
      toast.error(res.message);
      return;
    }
    toast.success(res.message);
    setDone(true);
  }

  return (
    <section
      id="inquire"
      className="canvas-warm grain relative overflow-hidden border-t border-[#221019]/8 py-20 sm:py-24"
    >
      <div className="mesh-warm opacity-70" aria-hidden="true" />
      <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center"
        >
          <EditableText as="p" id="concierge.cta.eyebrow" className="eyebrow text-[var(--brand-pink)]">
            Your trip starts here
          </EditableText>
          <h2 className="font-display text-title mt-3 text-ink text-balance">
            <EditableText as="span" id="concierge.cta.title">Let&apos;s plan your</EditableText>{" "}
            <EditableText as="span" id="concierge.cta.titleAccent" className="font-display-italic marker-swipe text-[var(--magenta)]">
              escape
            </EditableText>
          </h2>
          <EditableText as="p" id="concierge.cta.lead" className="mx-auto mt-4 max-w-xl text-lead text-ink-soft">
            Tell us a little about your dream trip and we&apos;ll be in touch
            within 1–2 business days with next steps. It&apos;s free, friendly,
            and zero-obligation.
          </EditableText>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="glass-strong elevate-float mt-10 rounded-3xl border border-[#FACDE8]/60 p-6 sm:p-8"
        >
          {done ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-[#FF0099] to-[#B51760] text-white">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
              <h3 className="font-display text-2xl text-ink">You&apos;re on our radar ♡</h3>
              <p className="max-w-md text-sm text-ink-soft">
                Gracias, {name.split(" ")[0] || "amiga"}! Your request is in. Keep
                an eye on your inbox — we&apos;ll reach out within 1–2 business
                days to start planning.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="c-name" className="font-semibold text-ink">Name *</Label>
                  <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" disabled={submitting} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-email" className="font-semibold text-ink">Email *</Label>
                  <Input id="c-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" disabled={submitting} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-phone" className="font-semibold text-ink">Phone (optional)</Label>
                  <Input id="c-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 123-4567" autoComplete="tel" disabled={submitting} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-dest" className="font-semibold text-ink">Where to?</Label>
                  <Input id="c-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Tulum, Japan, surprise me…" disabled={submitting} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-dates" className="font-semibold text-ink">When?</Label>
                  <Input id="c-dates" value={travelDates} onChange={(e) => setTravelDates(e.target.value)} placeholder="Flexible / Spring 2027" disabled={submitting} className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-party" className="font-semibold text-ink">Who&apos;s going?</Label>
                  <Input id="c-party" value={partySize} onChange={(e) => setPartySize(e.target.value)} placeholder="Just me / 2 / a group of 6" disabled={submitting} className={inputCls} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-budget" className="font-semibold text-ink">Budget range (optional)</Label>
                <select
                  id="c-budget"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  disabled={submitting}
                  className="h-10 w-full rounded-xl border border-[#221019]/12 bg-white/80 px-3 text-sm text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]/40"
                >
                  <option value="">Select a range…</option>
                  {BUDGETS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="c-details" className="font-semibold text-ink">Tell us about your dream trip</Label>
                <textarea
                  id="c-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="The vibe, the must-dos, who it's for, anything on your bucket list…"
                  disabled={submitting}
                  className="w-full resize-y rounded-xl border border-[#221019]/12 bg-white/80 px-3 py-2 text-sm text-ink shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]/40"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="lift inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] px-8 text-base font-semibold tracking-wide text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] transition hover:brightness-110 disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Request my custom trip plan
                  </>
                )}
              </button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-ink-soft">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--magenta)]" aria-hidden="true" />
                Free, no-obligation consultation. Your details stay private.
              </p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
