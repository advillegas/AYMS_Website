"use client";

/**
 * Terms of Service content — every heading and paragraph is click-to-edit
 * (admin edit mode), stored as cms_config overrides under "terms.*" ids.
 * Coded defaults mirror the original hardcoded copy, so nothing changes
 * visually until an admin edits. Contact email and Instagram handle come
 * from Site Settings.
 *
 * NOTE FOR OPERATORS: a good-faith Terms of Service reflecting how the
 * service works today. Have counsel review it and confirm the legal entity
 * name and governing law (defaults to California) before relying on it.
 * Bump the "Last updated" date whenever the terms change (click it in edit
 * mode).
 */

import Link from "next/link";
import { ScrollText } from "lucide-react";
import { EditableText } from "@/components/inline/editable-text";
import { useSiteSettings } from "@/lib/use-site-content";
import { LegalSection } from "./legal-section";

export function TermsBody() {
  const settings = useSiteSettings();
  const email = settings.contactEmail || "hello@amigasymassocial.com";

  return (
    <>
      {/* Hero */}
      <section className="grain relative overflow-hidden canvas-editorial py-24">
        <div className="mesh-warm" />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="glass-control mx-auto mb-6 flex h-16 w-16 items-center justify-center">
            <ScrollText className="h-8 w-8 text-[#B51760]" aria-hidden="true" />
          </div>
          <p className="eyebrow text-[#B51760]">
            <EditableText as="span" id="terms.hero.eyebrow">The fine print, made friendly</EditableText>
          </p>
          <h1 className="text-hero font-display text-ink text-balance mt-3">
            <EditableText as="span" id="terms.hero.title">Terms of</EditableText>{" "}
            <span className="font-display-italic marker-swipe text-[#B51760]">
              <EditableText as="span" id="terms.hero.titleAccent">Service</EditableText>
            </span>
          </h1>
          <EditableText
            as="p"
            id="terms.hero.lead"
            multiline
            className="text-lead mx-auto mt-6 max-w-xl text-ink-soft"
          >
            The agreement between you and Amigas Y Más Social when you use our website, community, and trips.
          </EditableText>
          <p className="mt-4 text-sm text-ink-soft/80">
            <EditableText as="span" id="terms.lastUpdated">Last updated: June 10, 2026</EditableText>
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="relative py-16 canvas-editorial">
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="space-y-3 text-ink-soft leading-relaxed">
            <p>
              <EditableText as="span" id="terms.intro" multiline>
                {'Welcome to Amigas Y Más Social (\u201CAYMS,\u201D \u201Cwe,\u201D \u201Cus,\u201D or \u201Cour\u201D). These Terms of Service (\u201CTerms\u201D) govern your access to and use of our websites at <b>amigasymassocial.com</b> and <b>amigasymas.com</b>, our community platform, and the trips and events we offer (these sites share one community and backend; together, the \u201CServices\u201D). By creating an account or using the Services, you agree to these Terms and to our'}
              </EditableText>{" "}
              <Link
                href="/privacy"
                className="text-[#B51760] font-medium underline underline-offset-2"
              >
                Privacy Policy
              </Link>
              .{" "}
              <EditableText as="span" id="terms.intro.outro" multiline>
                {"If you don\u2019t agree, please don\u2019t use the Services."}
              </EditableText>
            </p>
          </div>

          <LegalSection id="eligibility" titleId="terms.eligibility.title" title="Eligibility &amp; membership">
            <EditableText as="p" id="terms.eligibility.p1" multiline>
              Amigas Y Más Social is a private community by and for Latina women. To create an account and take part, you must be a woman who is part of the Latina community and at least 18 years old. Our group trips are for women 21 and older; individual trips may set additional age or other requirements at booking.
            </EditableText>
            <EditableText as="p" id="terms.eligibility.p2" multiline>
                {"This is a women\u2019s space. Men are not eligible for membership and may not create accounts, join the community, or attend members-only trips and events. We may decline, suspend, or remove any account that does not meet these membership criteria, at our discretion."}
            </EditableText>
            <EditableText as="p" id="terms.eligibility.p3" multiline>
              By using the Services, you confirm that you meet these requirements and that the information you provide is accurate.
            </EditableText>
          </LegalSection>

          <LegalSection id="accounts" titleId="terms.accounts.title" title="Your account">
            <EditableText as="p" id="terms.accounts.body" multiline>
              {"You\u2019re responsible for keeping your login credentials secure and for all activity under your account. Let us know right away if you suspect unauthorized use. Please keep your profile information accurate, and don\u2019t impersonate anyone or create an account for someone else without permission."}
            </EditableText>
          </LegalSection>

          <LegalSection id="conduct" titleId="terms.conduct.title" title="Community conduct">
            <EditableText as="p" id="terms.conduct.intro" multiline>
              AYMS is a sisterhood built on respect. When you participate in chat, direct messages, meetups, events, or any community space, you agree not to:
            </EditableText>
            <ul className="list-disc space-y-2 pl-6">
              <li>
                <EditableText as="span" id="terms.conduct.1" multiline>
                  Harass, bully, threaten, or demean others, or post hateful, discriminatory, or violent content.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="terms.conduct.2" multiline>
                  Share content that is illegal, sexually explicit, infringing, deceptive, or spam.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="terms.conduct.3" multiline>
                  Solicit, scam, or use the community primarily to advertise without our permission.
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="terms.conduct.4" multiline>
                  {"Share other members\u2019 private information, or misuse the member directory or messaging."}
                </EditableText>
              </li>
              <li>
                <EditableText as="span" id="terms.conduct.5" multiline>
                  Attempt to disrupt, hack, scrape, or overload the Services.
                </EditableText>
              </li>
            </ul>
            <EditableText as="p" id="terms.conduct.outro" multiline>
              We may moderate, remove content, mute, suspend, or terminate accounts that violate these Terms or harm the community, at our discretion.
            </EditableText>
          </LegalSection>

          <LegalSection id="no-promotion" titleId="terms.promo.title" title="No promotion or solicitation">
            <EditableText as="p" id="terms.promo.body" multiline>
              The community is a personal, social space for amigas — not a marketing channel. Without our prior written permission, you may not use the Services (including chat, direct messages, meetups, your profile, or the member directory) to advertise, promote, or sell products, services, businesses, or events; to recruit for any business, multi-level-marketing program, or other organization; or to solicit, spam, or send unsolicited commercial messages to other members. We may remove promotional content and suspend or remove accounts that use the community to promote.
            </EditableText>
          </LegalSection>

          <LegalSection id="your-content" titleId="terms.content.title" title="Your content">
            <EditableText as="p" id="terms.content.body" multiline>
              {"You keep ownership of the photos, messages, and other content you post. By posting, you grant us a non-exclusive, worldwide, royalty-free license to host, store, display, and share that content within the Services so we can operate the community (for example, showing your profile and messages to other members). You\u2019re responsible for what you post and confirm you have the rights to share it. We may remove content that violates these Terms."}
            </EditableText>
          </LegalSection>

          <LegalSection id="trips" titleId="terms.trips.title" title="Trips, bookings &amp; payments">
            <EditableText as="p" id="terms.trips.p1" multiline>
              {"Reserving a trip on the website holds your spot — no payment is taken online. Our team follows up to arrange your deposit and payment plan. Trip pricing, what\u2019s included, deposits, balances, and cancellation and refund terms are set out in the travel agreement you receive when you book. <b>Deposits are generally non-refundable</b>, and the travel agreement controls if anything in it conflicts with these Terms."}
            </EditableText>
            <EditableText as="p" id="terms.trips.p2" multiline>
              {"Trips involve activities and travel arranged with third-party providers (airlines, hotels, local operators). We select partners carefully, but we don\u2019t control them and aren\u2019t responsible for their acts, omissions, or the inherent risks of travel. Travel insurance is strongly recommended."}
            </EditableText>
          </LegalSection>

          <LegalSection id="agreements" titleId="terms.agreements.title" title="Travel agreements &amp; e-signatures">
            <EditableText as="p" id="terms.agreements.body" multiline>
              {"Some bookings require you to review and electronically sign a travel agreement and related disclosures. When you type your name and submit your signature, you agree it is your legal signature and that the agreement is binding. You\u2019ll always be able to read the full document before signing."}
            </EditableText>
          </LegalSection>

          <LegalSection id="third-parties" titleId="terms.thirdparties.title" title="Third-party services">
            <EditableText as="p" id="terms.thirdparties.body" multiline>
              {"The Services rely on third-party providers (such as our hosting, authentication, video chat, and other vendors) and may link to third-party sites. Your use of those services is subject to their own terms, and we aren\u2019t responsible for third-party content or practices."}
            </EditableText>
          </LegalSection>

          <LegalSection id="ip" titleId="terms.ip.title" title="Our intellectual property">
            <EditableText as="p" id="terms.ip.body" multiline>
              The AYMS name, logo, branding, site design, and content we create are owned by us or our licensors and are protected by intellectual-property laws. You may not copy, modify, or use them without our permission, except as needed to use the Services normally.
            </EditableText>
          </LegalSection>

          <LegalSection id="disclaimers" titleId="terms.disclaimers.title" title="Disclaimers">
            <EditableText as="p" id="terms.disclaimers.body" multiline>
              {'The Services are provided \u201Cas is\u201D and \u201Cas available,\u201D without warranties of any kind, whether express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We don\u2019t guarantee the Services will always be uninterrupted, secure, or error-free, or that any trip or event will meet your expectations.'}
            </EditableText>
          </LegalSection>

          <LegalSection id="liability" titleId="terms.liability.title" title="Limitation of liability">
            <EditableText as="p" id="terms.liability.body" multiline>
              {"To the fullest extent permitted by law, AYMS and its team won\u2019t be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of data, profits, or goodwill, arising from your use of the Services. Our total liability for any claim relating to the Services or a trip is limited to the amount you paid us for that trip (or, for community use, US $100). Some jurisdictions don\u2019t allow these limits, so they may not fully apply to you."}
            </EditableText>
          </LegalSection>

          <LegalSection id="indemnification" titleId="terms.indemnification.title" title="Indemnification">
            <EditableText as="p" id="terms.indemnification.body" multiline>
              You agree to indemnify and hold AYMS harmless from claims, damages, and expenses (including reasonable legal fees) arising from your content, your use of the Services, or your violation of these Terms or the rights of others.
            </EditableText>
          </LegalSection>

          <LegalSection id="termination" titleId="terms.termination.title" title="Termination">
            <EditableText as="p" id="terms.termination.body" multiline>
              You can stop using the Services and delete your account at any time. We may suspend or terminate your access if you violate these Terms or to protect the community. Provisions that by their nature should survive (such as content licenses, disclaimers, liability limits, and indemnification) will continue to apply.
            </EditableText>
          </LegalSection>

          <LegalSection id="governing-law" titleId="terms.law.title" title="Governing law">
            <EditableText as="p" id="terms.law.body" multiline>
              These Terms are governed by the laws of the State of California, United States, without regard to its conflict-of-laws rules. Any disputes will be handled in the courts located there, unless applicable law requires otherwise.
            </EditableText>
          </LegalSection>

          <LegalSection id="changes" titleId="terms.changes.title" title="Changes to these Terms">
            <EditableText as="p" id="terms.changes.body" multiline>
              {'We may update these Terms from time to time. When we do, we\u2019ll revise the \u201CLast updated\u201D date above and, for material changes, give a more prominent notice. Your continued use of the Services after an update means you accept the revised Terms.'}
            </EditableText>
          </LegalSection>

          <LegalSection id="contact" titleId="terms.contact.title" title="Contact us">
            <p>
              <EditableText as="span" id="terms.contact.body" multiline>
                Questions about these Terms? Reach us at
              </EditableText>{" "}
              <a
                href={`mailto:${email}`}
                className="text-[#B51760] font-medium underline underline-offset-2"
              >
                {email}
              </a>{" "}
              <EditableText as="span" id="terms.contact.or">or on Instagram</EditableText>{" "}
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
