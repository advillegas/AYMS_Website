import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/landing/navbar";
import { Footer } from "@/components/landing/footer";
import { ShieldCheck } from "lucide-react";

// NOTE FOR OPERATORS: this is a good-faith policy reflecting how the app
// actually handles data today. Have counsel review it and confirm the
// legal entity name, governing law, and any state/region-specific rights
// before relying on it. Update LAST_UPDATED whenever practices change.
const LAST_UPDATED = "June 10, 2026";
const CONTACT_EMAIL = "hello@amigasymassocial.com";

export const metadata: Metadata = {
  // Root layout applies the "%s | Amigas Y Más Social" template.
  title: "Privacy Policy",
  description:
    "How Amigas Y Más Social collects, uses, shares, and protects your personal " +
    "information across our website and community platform.",
  openGraph: {
    title: "Privacy Policy | Amigas Y Más Social",
    description:
      "How we collect, use, and protect your information at Amigas Y Más Social.",
  },
  alternates: { canonical: "/privacy" },
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

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className="canvas-editorial min-h-screen pt-[88px]">
        {/* Hero */}
        <section className="grain relative overflow-hidden canvas-editorial py-24">
          <div className="mesh-warm" />
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <div className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
            </div>
            <p className="eyebrow text-[#B51760]">Your trust, protected</p>
            <h1 className="text-hero font-display text-ink text-balance mt-3">
              Privacy{" "}
              <span className="font-display-italic marker-swipe text-[#B51760]">
                Policy
              </span>
            </h1>
            <p className="text-lead mx-auto mt-6 max-w-xl text-ink-soft">
              How we collect, use, and protect your information across our
              website and community.
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
                Amigas Y Más Social (&ldquo;AYMS,&rdquo; &ldquo;we,&rdquo;
                &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is a Latina travel
                community. This Privacy Policy explains what information we
                collect when you visit{" "}
                <span className="text-ink font-medium">amigasymassocial.com</span>{" "}
                or use our community platform (together, the
                &ldquo;Services&rdquo;), how we use it, who we share it with,
                and the choices you have. By using the Services, you agree to
                this policy.
              </p>
            </div>

            <Section id="information-we-collect" title="Information we collect">
              <p>We collect the following categories of information:</p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <span className="text-ink font-medium">Account information.</span>{" "}
                  Your name, email address, and password, or a Google account
                  identifier if you sign in with Google.
                </li>
                <li>
                  <span className="text-ink font-medium">Profile details.</span>{" "}
                  Anything you choose to add — bio, pronouns, headline,
                  interests, languages, social links, and profile, cover, and
                  gallery photos.
                </li>
                <li>
                  <span className="text-ink font-medium">Community content.</span>{" "}
                  Messages and direct messages you send, posts, comments, poll
                  votes, reactions, friend connections, and event RSVPs.
                </li>
                <li>
                  <span className="text-ink font-medium">Location.</span>{" "}
                  If you opt in, an approximate location (derived from an
                  address you enter) so we can show nearby meetups and local
                  channels. You control your location-sharing radius and
                  visibility, and can turn it off.
                </li>
                <li>
                  <span className="text-ink font-medium">Trip &amp; booking information.</span>{" "}
                  Trip reservations, waitlist entries, and the details and
                  signatures on any travel agreements you complete with us.
                </li>
                <li>
                  <span className="text-ink font-medium">Newsletter sign-ups.</span>{" "}
                  Your email address (and name, if provided) when you subscribe.
                </li>
                <li>
                  <span className="text-ink font-medium">Technical &amp; usage data.</span>{" "}
                  Standard information your browser sends — IP address, device
                  and browser type, and pages viewed — plus cookies and local
                  storage used to keep you signed in and remember preferences.
                </li>
              </ul>
            </Section>

            <Section id="how-we-use" title="How we use your information">
              <ul className="list-disc space-y-2 pl-6">
                <li>Create and manage your account and community profile.</li>
                <li>
                  Operate community features — chat, direct messages, meetups,
                  events, the member directory, and notifications.
                </li>
                <li>
                  Match you with nearby meetups and local channels when you
                  share a location.
                </li>
                <li>
                  Process trip reservations and travel agreements, and follow
                  up with you about trips, events, and your bookings.
                </li>
                <li>
                  Send the newsletter and service updates you ask for (you can
                  unsubscribe anytime).
                </li>
                <li>
                  Keep the community safe — moderation, enforcing our rules, and
                  preventing abuse.
                </li>
                <li>Maintain, secure, and improve the Services.</li>
              </ul>
            </Section>

            <Section id="sharing" title="How we share information">
              <p>
                We do not sell your personal information. We share it only with
                service providers that help us run the Services, and only as
                needed to provide them:
              </p>
              <ul className="list-disc space-y-2 pl-6">
                <li>
                  <span className="text-ink font-medium">Supabase</span> —
                  database, authentication, file storage, and realtime
                  messaging.
                </li>
                <li>
                  <span className="text-ink font-medium">Vercel</span> —
                  website and application hosting.
                </li>
                <li>
                  <span className="text-ink font-medium">Stream</span> —
                  voice and video chat rooms.
                </li>
                <li>
                  <span className="text-ink font-medium">Google</span> —
                  &ldquo;Sign in with Google&rdquo; and calendar feeds for
                  events.
                </li>
                <li>
                  <span className="text-ink font-medium">GIPHY</span> — GIF
                  search (your search terms are sent to GIPHY when you use the
                  picker).
                </li>
                <li>
                  <span className="text-ink font-medium">Anthropic</span> —
                  powers our in-app assistant; messages you send to the
                  assistant are processed to generate replies.
                </li>
              </ul>
              <p>
                We may also disclose information if required by law, to protect
                the safety of our members or the public, or in connection with a
                business transfer. Note that content you post in community
                channels and your public profile are visible to other signed-in
                members.
              </p>
            </Section>

            <Section id="cookies" title="Cookies &amp; local storage">
              <p>
                We use cookies and browser local storage to keep you signed in,
                remember preferences (like theme), and operate core features. We
                do not use them for third-party advertising. You can clear them
                in your browser, though some features may stop working if you do.
              </p>
            </Section>

            <Section id="retention" title="Data retention">
              <p>
                We keep your information for as long as your account is active or
                as needed to provide the Services. Some records — such as
                completed travel agreements — may be retained longer where we
                have a legal or legitimate business reason. When you ask us to
                delete your account, we remove or anonymize your personal
                information except where we must keep it by law.
              </p>
            </Section>

            <Section id="your-rights" title="Your choices &amp; rights">
              <p>
                You can review and edit your profile at any time, adjust your
                location and privacy settings, and unsubscribe from the
                newsletter. Depending on where you live, you may have the right
                to access, correct, delete, or export your personal information,
                or to object to certain processing. To make a request, email us
                at{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="text-[#B51760] font-medium underline underline-offset-2"
                >
                  {CONTACT_EMAIL}
                </a>
                . We will not discriminate against you for exercising these
                rights.
              </p>
            </Section>

            <Section id="security" title="How we protect your information">
              <p>
                We protect data in transit with encryption (HTTPS), enforce
                row-level access rules so members can only reach data they are
                authorized to see, and keep direct messages restricted to their
                participants. No method of transmission or storage is perfectly
                secure, but we work to safeguard your information and review our
                practices regularly.
              </p>
            </Section>

            <Section id="children" title="Children's privacy">
              <p>
                The Services are intended for adults (our trips are for women
                21+). They are not directed to children, and we do not knowingly
                collect personal information from anyone under 16. If you believe
                a minor has provided us information, contact us and we will
                delete it.
              </p>
            </Section>

            <Section id="international" title="Where your data is processed">
              <p>
                We are based in the United States, and our service providers may
                process and store your information in the U.S. and other
                countries. By using the Services, you understand your
                information may be transferred to and processed in locations with
                different data-protection laws than your own.
              </p>
            </Section>

            <Section id="changes" title="Changes to this policy">
              <p>
                We may update this Privacy Policy from time to time. When we do,
                we will revise the &ldquo;Last updated&rdquo; date above and, for
                material changes, provide a more prominent notice. Your continued
                use of the Services after an update means you accept the revised
                policy.
              </p>
            </Section>

            <Section id="contact" title="Contact us">
              <p>
                Questions about this policy or your information? Reach us at{" "}
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
