"use client";

/**
 * Privacy Policy content — every heading, paragraph, and list item is
 * click-to-edit (admin edit mode), stored as cms_config overrides under
 * "privacy.*" ids. Coded defaults below mirror the original hardcoded copy,
 * so nothing changes visually until an admin edits. Contact email and
 * Instagram handle come from Site Settings (editable in Admin → Settings).
 *
 * NOTE FOR OPERATORS: this is a good-faith policy reflecting how the app
 * actually handles data today. Have counsel review it and confirm the
 * legal entity name, governing law, and any state/region-specific rights
 * before relying on it. Bump the "Last updated" date whenever practices
 * change (click it in edit mode).
 */

import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { useSiteSettings } from "@/lib/use-site-content";
import { LegalSection } from "./legal-section";

export function PrivacyBody() {
  const settings = useSiteSettings();
  const email = settings.contactEmail || "hello@amigasymassocial.com";

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden canvas-editorial py-24">
        <div className="mesh-warm" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center">
            <ShieldCheck className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
          </div>
          <p className="eyebrow text-[#B51760]">
            <EditableText as="span" id="privacy.hero.eyebrow">Your trust, protected</EditableText>
          </p>
          <h1 className="text-hero font-display text-ink text-balance mt-3">
            <EditableText as="span" id="privacy.hero.title">Privacy</EditableText>{" "}
            <span className="font-display-italic marker-swipe text-[#B51760]">
              <EditableText as="span" id="privacy.hero.titleAccent">Policy</EditableText>
            </span>
          </h1>
          <EditableText
            as="p"
            id="privacy.hero.lead"
            multiline
            className="text-lead mx-auto mt-6 max-w-xl text-ink-soft"
          >
            How we collect, use, and protect your information across our website and community.
          </EditableText>
          <p className="mt-4 text-sm text-ink-soft/80">
            <EditableText as="span" id="privacy.lastUpdated">Last updated: June 10, 2026</EditableText>
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="relative py-16 canvas-editorial">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-3 text-ink-soft leading-relaxed">
            <EditableText as="p" id="privacy.intro" multiline>
              {'Amigas Y Más Social (\u201CAYMS,\u201D \u201Cwe,\u201D \u201Cus,\u201D or \u201Cour\u201D) is a Latina travel community. This Privacy Policy explains what information we collect when you visit our websites at <b>amigasymassocial.com</b> and <b>amigasymas.com</b>, or use our community platform (these sites share one community and backend; together, the \u201CServices\u201D), how we use it, who we share it with, and the choices you have. By using the Services, you agree to this policy.'}
            </EditableText>
          </div>

          <LegalSection id="information-we-collect" titleId="privacy.collect.title" title="Information we collect">
            <EditableText as="p" id="privacy.collect.intro" multiline>
              We collect the following categories of information:
            </EditableText>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <EditableText as="span" id="privacy.collect.account" multiline>
                  {"<b>Account information.</b> Your name, email address, and password, or a Google account identifier if you sign in with Google."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.profile" multiline>
                  {"<b>Profile details.</b> Anything you choose to add — bio, pronouns, headline, interests, languages, social links, and profile, cover, and gallery photos."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.content" multiline>
                  {"<b>Community content.</b> Messages and direct messages you send, posts, comments, poll votes, reactions, friend connections, and event RSVPs."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.location" multiline>
                  {"<b>Location.</b> If you opt in, an approximate location (derived from an address you enter) so we can show nearby meetups and local channels. You control your location-sharing radius and visibility, and can turn it off."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.trips" multiline>
                  {"<b>Trip &amp; booking information.</b> Trip reservations, waitlist entries, and the details and signatures on any travel agreements you complete with us."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.newsletter" multiline>
                  {"<b>Newsletter sign-ups.</b> Your email address (and name, if provided) when you subscribe."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.collect.technical" multiline>
                  {"<b>Technical &amp; usage data.</b> Standard information your browser sends — IP address, device and browser type, and pages viewed — plus cookies and local storage used to keep you signed in and remember preferences."}
                </EditableText>
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="how-we-use" titleId="privacy.use.title" title="How we use your information">
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <EditableText as="span" id="privacy.use.1" multiline>
                  Create and manage your account and community profile.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.2" multiline>
                  Operate community features — chat, direct messages, meetups, events, the member directory, and notifications.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.3" multiline>
                  Match you with nearby meetups and local channels when you share a location.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.4" multiline>
                  Process trip reservations and travel agreements, and follow up with you about trips, events, and your bookings.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.5" multiline>
                  Send the newsletter and service updates you ask for (you can unsubscribe anytime).
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.6" multiline>
                  Keep the community safe — moderation, enforcing our rules, and preventing abuse.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.use.7" multiline>
                  Maintain, secure, and improve the Services.
                </EditableText>
              </li>
            </ul>
          </LegalSection>

          <LegalSection id="sharing" titleId="privacy.sharing.title" title="How we share information">
            <EditableText as="p" id="privacy.sharing.intro" multiline>
              We do not sell your personal information. We share it only with service providers that help us run the Services, and only as needed to provide them:
            </EditableText>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <EditableText as="span" id="privacy.sharing.supabase" multiline>
                  {"<b>Supabase</b> — database, authentication, file storage, and realtime messaging."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.sharing.vercel" multiline>
                  {"<b>Vercel</b> — website and application hosting."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.sharing.stream" multiline>
                  {"<b>Stream</b> — voice and video chat rooms."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.sharing.google" multiline>
                  {'<b>Google</b> — \u201CSign in with Google\u201D and calendar feeds for events.'}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.sharing.giphy" multiline>
                  {"<b>GIPHY</b> — GIF search (your search terms are sent to GIPHY when you use the picker)."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="privacy.sharing.anthropic" multiline>
                  {"<b>Anthropic</b> — powers our in-app assistant; messages you send to the assistant are processed to generate replies."}
                </EditableText>
              </li>
            </ul>
            <EditableText as="p" id="privacy.sharing.outro" multiline>
              We may also disclose information if required by law, to protect the safety of our members or the public, or in connection with a business transfer. Note that content you post in community channels and your public profile are visible to other signed-in members.
            </EditableText>
          </LegalSection>

          <LegalSection id="cookies" titleId="privacy.cookies.title" title="Cookies &amp; local storage">
            <EditableText as="p" id="privacy.cookies.body" multiline>
              We use cookies and browser local storage to keep you signed in, remember preferences (like theme), and operate core features. We do not use them for third-party advertising. You can clear them in your browser, though some features may stop working if you do.
            </EditableText>
          </LegalSection>

          <LegalSection id="retention" titleId="privacy.retention.title" title="Data retention">
            <EditableText as="p" id="privacy.retention.body" multiline>
              We keep your information for as long as your account is active or as needed to provide the Services. Some records — such as completed travel agreements — may be retained longer where we have a legal or legitimate business reason. When you ask us to delete your account, we remove or anonymize your personal information except where we must keep it by law.
            </EditableText>
          </LegalSection>

          <LegalSection id="your-rights" titleId="privacy.rights.title" title="Your choices &amp; rights">
            <p>
              <EditableText as="span" id="privacy.rights.body" multiline>
                You can review and edit your profile at any time, adjust your location and privacy settings, and unsubscribe from the newsletter. Depending on where you live, you may have the right to access, correct, delete, or export your personal information, or to object to certain processing. To make a request, email us at
              </EditableText>{" "}
              <a
                href={`mailto:${email}`}
                className="text-[#B51760] font-medium underline underline-offset-2"
              >
                {email}
              </a>
              .{" "}
              <EditableText as="span" id="privacy.rights.outro" multiline>
                We will not discriminate against you for exercising these rights.
              </EditableText>
            </p>
          </LegalSection>

          <LegalSection id="security" titleId="privacy.security.title" title="How we protect your information">
            <EditableText as="p" id="privacy.security.body" multiline>
              We protect data in transit with encryption (HTTPS), enforce row-level access rules so members can only reach data they are authorized to see, and keep direct messages restricted to their participants. No method of transmission or storage is perfectly secure, but we work to safeguard your information and review our practices regularly.
            </EditableText>
          </LegalSection>

          <LegalSection id="children" titleId="privacy.children.title" title="Children's privacy">
            <EditableText as="p" id="privacy.children.body" multiline>
              The Services are intended for adults (our trips are for women 21+). They are not directed to children, and we do not knowingly collect personal information from anyone under 16. If you believe a minor has provided us information, contact us and we will delete it.
            </EditableText>
          </LegalSection>

          <LegalSection id="international" titleId="privacy.international.title" title="Where your data is processed">
            <EditableText as="p" id="privacy.international.body" multiline>
              We are based in the United States, and our service providers may process and store your information in the U.S. and other countries. By using the Services, you understand your information may be transferred to and processed in locations with different data-protection laws than your own.
            </EditableText>
          </LegalSection>

          <LegalSection id="changes" titleId="privacy.changes.title" title="Changes to this policy">
            <EditableText as="p" id="privacy.changes.body" multiline>
              {'We may update this Privacy Policy from time to time. When we do, we will revise the \u201CLast updated\u201D date above and, for material changes, provide a more prominent notice. Your continued use of the Services after an update means you accept the revised policy.'}
            </EditableText>
          </LegalSection>

          <LegalSection id="contact" titleId="privacy.contact.title" title="Contact us">
            <p>
              <EditableText as="span" id="privacy.contact.body" multiline>
                Questions about this policy or your information? Reach us at
              </EditableText>{" "}
              <a
                href={`mailto:${email}`}
                className="text-[#B51760] font-medium underline underline-offset-2"
              >
                {email}
              </a>{" "}
              <EditableText as="span" id="privacy.contact.or">or on Instagram</EditableText>{" "}
              <a
                href={`https://www.instagram.com/${settings.instagramHandle}/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#B51760] font-medium underline underline-offset-2"
              >
                @{settings.instagramHandle}
              </a>
              .
            </p>
          </LegalSection>

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
    </>
  );
}
