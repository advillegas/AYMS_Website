"use client";

/**
 * Social / contact platform registry for the editable "Contact" tiles.
 *
 * Each platform carries its own brand glyph + brand-tinted icon well so a
 * tile "inherits" the look of the social network it links to. An admin can
 * also upload a custom image per tile (handled by the contact component),
 * which overrides the glyph entirely.
 *
 * Brand glyphs are inline SVGs (simple-icons path data) so we don't depend
 * on any icon package shipping a given brand mark. Generic ones (email,
 * phone, website, join) reuse lucide.
 */

import type { ComponentType } from "react";
import { Mail, Phone, Globe, Heart, Link2 } from "lucide-react";

type IconProps = { className?: string };

/* --------------------------- brand glyphs -------------------------- */

function InstagramIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function FacebookIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

function YouTubeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function XIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function LinkedInIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.693.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.885-9.885 9.885M20.52 3.449C18.24 1.245 15.24 0 12.045 0 5.463 0 .104 5.358.101 11.892c0 2.096.546 4.142 1.588 5.945L0 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.582 0 11.94-5.358 11.943-11.893a11.821 11.821 0 0 0-3.416-8.452z" />
    </svg>
  );
}

/* --------------------------- registry ------------------------------ */

export interface SocialPlatform {
  key: string;
  label: string;
  Icon: ComponentType<IconProps>;
  /** Soft brand-tinted icon-well background (Tailwind gradient). */
  gradient: string;
  /** Brand glyph tint (Tailwind text color). */
  iconColor: string;
  /** Whether links of this type open in a new tab by default. */
  external: boolean;
  /** Hint shown in the editor's URL field. */
  placeholder: string;
}

export const SOCIAL_PLATFORMS: Record<string, SocialPlatform> = {
  instagram: { key: "instagram", label: "Instagram", Icon: InstagramIcon, gradient: "from-[#F58529]/20 to-[#DD2A7B]/15", iconColor: "text-[#C13584]", external: true, placeholder: "https://instagram.com/yourhandle" },
  facebook: { key: "facebook", label: "Facebook", Icon: FacebookIcon, gradient: "from-[#1877F2]/20 to-[#0A53BE]/12", iconColor: "text-[#1877F2]", external: true, placeholder: "https://facebook.com/yourpage" },
  tiktok: { key: "tiktok", label: "TikTok", Icon: TikTokIcon, gradient: "from-[#25F4EE]/20 to-[#FE2C55]/15", iconColor: "text-[#FE2C55]", external: true, placeholder: "https://tiktok.com/@yourhandle" },
  youtube: { key: "youtube", label: "YouTube", Icon: YouTubeIcon, gradient: "from-[#FF0000]/15 to-[#CC0000]/10", iconColor: "text-[#FF0000]", external: true, placeholder: "https://youtube.com/@yourchannel" },
  x: { key: "x", label: "X (Twitter)", Icon: XIcon, gradient: "from-ink/15 to-ink/10", iconColor: "text-ink", external: true, placeholder: "https://x.com/yourhandle" },
  linkedin: { key: "linkedin", label: "LinkedIn", Icon: LinkedInIcon, gradient: "from-[#0A66C2]/20 to-[#084c91]/12", iconColor: "text-[#0A66C2]", external: true, placeholder: "https://linkedin.com/company/you" },
  whatsapp: { key: "whatsapp", label: "WhatsApp", Icon: WhatsAppIcon, gradient: "from-[#25D366]/20 to-[#128C7E]/12", iconColor: "text-[#25D366]", external: true, placeholder: "https://wa.me/15551234567" },
  email: { key: "email", label: "Email", Icon: Mail, gradient: "from-coral/20 to-brand-pink/15", iconColor: "text-coral", external: false, placeholder: "hello@yourdomain.com" },
  phone: { key: "phone", label: "Phone", Icon: Phone, gradient: "from-primary/20 to-magenta/15", iconColor: "text-primary", external: false, placeholder: "+1 555 123 4567" },
  website: { key: "website", label: "Website", Icon: Globe, gradient: "from-primary/15 to-magenta/10", iconColor: "text-primary", external: true, placeholder: "https://yourdomain.com" },
  join: { key: "join", label: "Join / Sign up", Icon: Heart, gradient: "from-rosa/20 to-primary/15", iconColor: "text-magenta", external: false, placeholder: "/register" },
  custom: { key: "custom", label: "Custom / Other", Icon: Link2, gradient: "from-primary/15 to-magenta/10", iconColor: "text-primary", external: true, placeholder: "https://…" },
};

export const PLATFORM_CHOICES: { key: string; label: string }[] = Object.values(
  SOCIAL_PLATFORMS,
).map((p) => ({ key: p.key, label: p.label }));

export function getPlatform(key: string | undefined): SocialPlatform {
  return (key && SOCIAL_PLATFORMS[key]) || SOCIAL_PLATFORMS.custom;
}

/** Build the real href for a contact tile from its platform + raw value. */
export function resolveContactHref(platform: string, href: string): string {
  const raw = (href ?? "").trim();
  if (!raw) return "";
  if (platform === "email") {
    return raw.startsWith("mailto:") ? raw : `mailto:${raw}`;
  }
  if (platform === "phone") {
    return raw.startsWith("tel:") ? raw : `tel:${raw.replace(/[^\d+]/g, "")}`;
  }
  // Internal routes, anchors, and already-qualified URLs pass through.
  if (
    raw.startsWith("/") ||
    raw.startsWith("#") ||
    /^(https?:|mailto:|tel:)/i.test(raw)
  ) {
    return raw;
  }
  return `https://${raw}`;
}
