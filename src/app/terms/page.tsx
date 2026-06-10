import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ScrollText } from "lucide-react";

// NOTE FOR OPERATORS: a good-faith Terms of Service reflecting how the
// service works today. Have counsel review it and confirm the legal
// entity name and governing law (set to California below as a sensible
// default given AYMS's base — change if incorrect). Bump LAST_UPDATED
// whenever the terms change.
const LAST_UPDATED = "June 10, 2026";
const CONTACT_EMAIL = "hello@amigasymassocial.com";
const GOVERNING_LAW = "the State of California, United States";

export const metadata: Metadata = {
  // Root layout applies the "%s | Amigas Y Más Social" template.
  title: "Terms of Service",
  description:
    "The terms that govern your use of the Amigas Y Más Social website, " +
    "community platform, trips, and events.",
  openGraph: {
    title: "Terms of Service | Amigas Y Más Social",
    description:
      "The terms that govern your use of Amigas Y Más Social.",
  },
  alternates: { canonical: "/terms" },
};

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 space-y-3">
      <h2 className="font-[family-name:var(--font-heading)] text-2xl font-bold text-ink">
        {title}
      </h2>
      <div className="space-y-3 text-ink-soft leading-relaxed">{children}</div>
    </section>
  );
}

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="grain relative overflow-hidden canvas-editorial py-24">
          <div className="mesh-warm" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <ScrollText className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
            </div>
            <p className="eyebrow text-[#B51760]">The fine print, made friendly</p>
            <h1 className="text-hero font-display text-ink text-balance mt-3">
              Terms of{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">
                Service
              </span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-ink-soft">
              The agreement between you and Amigas Y Más Social when you use our
              website, community, and trips.
            </p>
            <p className="mt-4 text-sm text-ink-soft/80">
              Last updated: {LAST_UPDATED}
            </p>
          </div>
        </section>

        {/* Body */}
        <section className="relative py-16 canvas-editorial">
          <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
            <div className="space-y-3 text-ink-soft leading-relaxed">
              <p>
                Welcome to Amigas Y Más Social (&ldquo;AYMS,&rdquo;
                &ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). These
                Terms of Service (&ldquo;Terms&rdquo;) govern your access to and
                use of{" "}
                <span className="text-ink font-medium">amigasymassocial.com</span>,
                our community platform, and the trips and events we offer
                (together, the &ldquo;Services&rdquo;). By creating an account
                or using the Services, you agree to these Terms and to our{" "}
                <Link
                  href="/privacy"
                  className="text-[#B51760] font-medium underline underline-offset-2"
                >
                  Privacy Policy
                </Link>
                . If you don&rsquo;t agree, please don&rsquo;t use the Services.
              </p>
            </div>

            <Section id="eligibility" title="Eligibility">
              <p>
                You must be at least 18 years old to create an account and use
                the community platform. Our group trips are designed for women
                21 and older; specific trips may have their own age or other
                requirements described at booking. By using the Services, you
                confirm you meet these requirements and that the information you
                provide is accurate.
              </p>
            </Section>

            <Section id="accounts" title="Your account">
              <p>
                You&rsquo;re responsible for keeping your login credentials
                secure and for all activity under your account. Let us know
                right away if you suspect unauthorized use. Please keep your
                profile information accurate, and don&rsquo;t impersonate anyone
                or create an account for someone else without permission.
              </p>
            </Section>

            <Section id="conduct" title="Community conduct">
              <p>
                AYMS is a sisterhood built on respect. When you participate in
                chat, direct messages, meetups, events, or any community space,
                you agree not to:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  Harass, bully, threaten, or demean others, or post hateful,
                  discriminatory, or violent content.
                </li>
                <li>
                  Share content that is illegal, sexually explicit, infringing,
                  deceptive, or spam.
                </li>
                <li>
                  Solicit, scam, or use the community primarily to advertise
                  without our permission.
                </li>
                <li>
                  Share other members&rsquo; private information, or misuse the
                  member directory or messaging.
                </li>
                <li>
                  Attempt to disrupt, hack, scrape, or overload the Services.
                </li>
              </ul>
              <p>
                We may moderate, remove content, mute, suspend, or terminate
                accounts that violate these Terms or harm the community, at our
                discretion.
              </p>
            </Section>

            <Section id="your-content" title="Your content">
              <p>
                You keep ownership of the photos, messages, and other content
                you post. By posting, you grant us a non-exclusive, worldwide,
                royalty-free license to host, store, display, and share that
                content within the Services so we can operate the community
                (for example, showing your profile and messages to other
                members). You&rsquo;re responsible for what you post and confirm
                you have the rights to share it. We may remove content that
                violates these Terms.
              </p>
            </Section>

            <Section id="trips" title="Trips, bookings &amp; payments">
              <p>
                Reserving a trip on the website holds your spot — no payment is
                taken online. Our team follows up to arrange your deposit and
                payment plan. Trip pricing, what&rsquo;s included, deposits,
                balances, and cancellation and refund terms are set out in the
                travel agreement you receive when you book. <span className="text-ink font-medium">Deposits are generally
                non-refundable</span>, and the travel agreement controls if anything
                in it conflicts with these Terms.
              </p>
              <p>
                Trips involve activities and travel arranged with third-party
                providers (airlines, hotels, local operators). We select
                partners carefully, but we don&rsquo;t control them and
                aren&rsquo;t responsible for their acts, omissions, or the
                inherent risks of travel. Travel insurance is strongly
                recommended.
              </p>
            </Section>

            <Section id="agreements" title="Travel agreements &amp; e-signatures">
              <p>
                Some bookings require you to review and electronically sign a
                travel agreement and related disclosures. When you type your
                name and submit your signature, you agree it is your legal
                signature and that the agreement is binding. You&rsquo;ll always
                be able to read the full document before signing.
              </p>
            </Section>

            <Section id="third-parties" title="Third-party services">
              <p>
                The Services rely on third-party providers (such as our
                hosting, authentication, video chat, and other vendors) and may
                link to third-party sites. Your use of those services is subject
                to their own terms, and we aren&rsquo;t responsible for
                third-party content or practices.
              </p>
            </Section>

            <Section id="ip" title="Our intellectual property">
              <p>
                The AYMS name, logo, branding, site design, and content we
                create are owned by us or our licensors and are protected by
                intellectual-property laws. You may not copy, modify, or use
                them without our permission, except as needed to use the
                Services normally.
              </p>
            </Section>

            <Section id="disclaimers" title="Disclaimers">
              <p>
                The Services are provided &ldquo;as is&rdquo; and &ldquo;as
                available,&rdquo; without warranties of any kind, whether
                express or implied, including merchantability, fitness for a
                particular purpose, and non-infringement. We don&rsquo;t
                guarantee the Services will always be uninterrupted, secure, or
                error-free, or that any trip or event will meet your
                expectations.
              </p>
            </Section>

            <Section id="liability" title="Limitation of liability">
              <p>
                To the fullest extent permitted by law, AYMS and its team
                won&rsquo;t be liable for any indirect, incidental, special,
                consequential, or punitive damages, or any loss of data,
                profits, or goodwill, arising from your use of the Services. Our
                total liability for any claim relating to the Services or a trip
                is limited to the amount you paid us for that trip (or, for
                community use, US $100). Some jurisdictions don&rsquo;t allow
                these limits, so they may not fully apply to you.
              </p>
            </Section>

            <Section id="indemnification" title="Indemnification">
              <p>
                You agree to indemnify and hold AYMS harmless from claims,
                damages, and expenses (including reasonable legal fees) arising
                from your content, your use of the Services, or your violation
                of these Terms or the rights of others.
              </p>
            </Section>

            <Section id="termination" title="Termination">
              <p>
                You can stop using the Services and delete your account at any
                time. We may suspend or terminate your access if you violate
                these Terms or to protect the community. Provisions that by their
                nature should survive (such as content licenses, disclaimers,
                liability limits, and indemnification) will continue to apply.
              </p>
            </Section>

            <Section id="governing-law" title="Governing law">
              <p>
                These Terms are governed by the laws of {GOVERNING_LAW}, without
                regard to its conflict-of-laws rules. Any disputes will be
                handled in the courts located there, unless applicable law
                requires otherwise.
              </p>
            </Section>

            <Section id="changes" title="Changes to these Terms">
              <p>
                We may update these Terms from time to time. When we do,
                we&rsquo;ll revise the &ldquo;Last updated&rdquo; date above and,
                for material changes, give a more prominent notice. Your
                continued use of the Services after an update means you accept
                the revised Terms.
              </p>
            </Section>

            <Section id="contact" title="Contact us">
              <p>
                Questions about these Terms? Reach us at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[#B51760] font-medium underline underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>
                {" "}or on Instagram{" "}
                <a
                  href="https://www.instagram.com/amigasymassocial/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#B51760] font-medium underline underline-offset-2"
                >
                  @amigasymassocial
                </a>
                .
              </p>
            </Section>

            <div className="border-t border-[#221019]/10 pt-8">
              <Link
                href="/"
                className="text-sm font-medium text-[#B51760] underline underline-offset-2"
              >
                ← Back to home
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
