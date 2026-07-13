"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useNewsletter } from "@/lib/use-newsletter";
import { useSiteSettings } from "@/lib/use-site-content";
import { EditableText } from "@/components/inline/editable-text";
import { FooterColumns } from "./footer-columns";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FooterSignup() {
  const { submitting, subscribe } = useNewsletter();
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = email.trim();
    if (!EMAIL_RE.test(trimmed)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    // Capture only — persists to Firestore, never sends email.
    const result = await subscribe({ email: trimmed, source: "footer" });
    if (result.status === "error") {
      toast.error(result.message);
      return;
    }
    toast.success(result.message);
    setEmail("");
    setDone(true);
  }

  return (
    <div className="w-full max-w-sm">
      <EditableText as="p" id="home.footer.newsletterLabel" className="eyebrow text-[#FACDE8]">La Carta · The Newsletter</EditableText>
      <p className="mt-2 font-display text-xl text-white">
        <EditableText as="span" id="home.footer.newsletterTitle.before">Trips &amp; events,</EditableText>{" "}
        <EditableText as="span" id="home.footer.newsletterTitle.accent" className="font-display-italic text-[#FACDE8]">in your inbox</EditableText>
      </p>
      <EditableText as="p" id="home.footer.newsletterFinePrint" className="mt-1.5 text-xs text-white/50">
        No spam, ever. Unsubscribe anytime. ♡
      </EditableText>
      {done ? (
        <p
          role="status"
          className="mt-3 rounded-2xl border border-[var(--magenta)]/30 bg-[var(--magenta)]/10 px-4 py-3 text-sm font-medium text-[#FFB3D0]"
        >
          <EditableText as="span" id="home.footer.newsletterSuccess">You&apos;re on the list — gracias! ♡</EditableText>
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
          <label htmlFor="footer-newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="footer-newsletter-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={submitting}
            className="h-11 flex-1 rounded-full border border-white/12 bg-white/[0.06] px-4 text-sm text-white placeholder:text-white/35 outline-none transition-colors focus-visible:border-[var(--magenta)]/40 focus-visible:ring-2 focus-visible:ring-[var(--magenta)]/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            aria-label="Subscribe to the newsletter"
            className="lift flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] text-white shadow-[0_6px_24px_rgb(255_0_153/0.30)] transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1a0a12] disabled:opacity-70"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export function Footer() {
  const settings = useSiteSettings();
  const igUrl = `https://www.instagram.com/${settings.instagramHandle}/`;
  return (
    <footer className="relative overflow-hidden bg-[#2A0A1E] py-20 grain">
      <div className="absolute inset-0 bg-gradient-to-b from-[#2A0A1E] via-[#1f0716] to-[#160510]" />
      <div className="absolute inset-0 pattern-dots opacity-[0.05]" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--magenta)]/35 to-transparent" />
      {/* soft blush glow, top-left */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-[var(--magenta)]/10 blur-[90px]"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Big editorial sign-off */}
        <div className="max-w-2xl">
          <EditableText as="p" id="home.footer.eyebrow" className="eyebrow text-[#FACDE8]">Connect · Empower · Celebrate</EditableText>
          <h2 className="mt-4 font-display text-title leading-[1.05] text-white">
            <EditableText as="span" id="home.footer.title.before">Find your new</EditableText>{" "}
            <EditableText as="span" id="home.footer.title.accent" className="font-display-italic text-[#FACDE8]">amigas</EditableText>{" "}
            <EditableText as="span" id="home.footer.title.heart" className="text-[var(--magenta)]">♡</EditableText>
          </h2>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/55">
            <EditableText as="span" id="home.footer.blurb">A Latina travel community built on sisterhood, cultura y aventura.</EditableText>{" "}
            {settings.tagline}
          </p>
        </div>

        {/* Link columns + newsletter */}
        <div className="mt-14 grid grid-cols-1 gap-10 border-t border-white/[0.08] pt-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link
              href="/"
              aria-label="Amigas Y Más Social — home"
              className="inline-flex flex-col items-start gap-2"
            >
              <Image
                src={settings.logoUrl}
                alt={settings.siteName}
                width={266}
                height={192}
                className="h-16 w-auto drop-shadow-[0_0_20px_rgb(255_0_153/0.28)]"
              />
            </Link>
            <div className="mt-6">
              <FooterSignup />
            </div>
          </div>

          <FooterColumns />

          <div className="md:col-span-3">
            <EditableText as="p" id="home.footer.followHeading" className="eyebrow text-white/40">Follow</EditableText>
            <a
              href={igUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Follow ${settings.siteName} on Instagram (opens in a new tab)`}
              className="lift mt-4 inline-flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-medium text-white/70 transition-colors hover:border-[var(--magenta)]/40 hover:text-[#FACDE8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--magenta)]/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2A0A1E]"
            >
              <InstagramIcon className="h-5 w-5" />
              @{settings.instagramHandle}
            </a>
            {settings.contactEmail && (
              <a
                href={`mailto:${settings.contactEmail}`}
                className="mt-3 block text-sm text-white/55 transition-colors hover:text-[#FACDE8] focus-visible:outline-none focus-visible:text-[#FACDE8]"
              >
                {settings.contactEmail}
              </a>
            )}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.07] pt-6 text-center text-xs text-white/45 sm:flex-row sm:text-left">
          <p>
            &copy; {new Date().getFullYear()} {settings.siteName}. All rights
            reserved. ♡
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href="/privacy"
              className="transition-colors hover:text-[#FACDE8] focus-visible:outline-none focus-visible:text-[#FACDE8]"
            >
              <EditableText as="span" id="home.footer.legalPrivacy">Privacy Policy</EditableText>
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-[#FACDE8] focus-visible:outline-none focus-visible:text-[#FACDE8]"
            >
              <EditableText as="span" id="home.footer.legalTerms">Terms of Service</EditableText>
            </Link>
            <EditableText as="span" id="home.footer.madeWith" className="tracking-[0.18em] uppercase">Hecho con cariño</EditableText>
          </div>
        </div>
      </div>
    </footer>
  );
}
