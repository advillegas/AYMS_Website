import type { Metadata } from "next";

/**
 * Server-side per-page SEO overrides.
 *
 * The owner edits page titles/descriptions in Admin → SEO; they're stored in
 * the `cms_config` table under the single `seo` doc, keyed by page slug:
 *   { home: { title, description }, trips: { … }, … }
 *
 * Page `layout.tsx` files call `seoMetadata()` from their `generateMetadata`,
 * so overrides are rendered server-side (crawlable) and refreshed via ISR.
 * Everything falls back to the coded defaults, so SEO never breaks if nothing
 * is customized or Supabase is unreachable.
 */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SITE_NAME = "Amigas Y Más Social";

export interface PageSeo {
  title?: string;
  description?: string;
}
export type SeoDoc = Record<string, PageSeo>;

/** Page slugs that expose editable SEO (must match the admin SEO panel). */
export const SEO_PAGES: { slug: string; label: string }[] = [
  { slug: "home", label: "Home" },
  { slug: "trips", label: "Trips" },
  { slug: "events", label: "Events" },
  { slug: "gallery", label: "Gallery" },
  { slug: "faq", label: "FAQ" },
  { slug: "featured", label: "Featured Event" },
  { slug: "camp", label: "Summer Camp" },
];

async function fetchSeoDoc(): Promise<SeoDoc> {
  if (!SB_URL || !SB_KEY) return {};
  try {
    const res = await fetch(
      `${SB_URL}/rest/v1/cms_config?key=eq.seo&select=value`,
      {
        headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
        // ISR: edits go live within ~2 min without a redeploy.
        next: { revalidate: 120 },
      },
    );
    if (!res.ok) return {};
    const rows = (await res.json()) as { value: SeoDoc }[];
    return rows?.[0]?.value ?? {};
  } catch {
    return {};
  }
}

export async function getPageSeo(slug: string): Promise<PageSeo> {
  const doc = await fetchSeoDoc();
  return doc?.[slug] ?? {};
}

/**
 * Merge a page's SEO override over its coded defaults into a Next `Metadata`
 * patch (title + description + canonical + OG/Twitter mirrors).
 */
export async function seoMetadata(
  slug: string,
  defaults: { title: string; description: string; canonical: string },
): Promise<Metadata> {
  const o = await getPageSeo(slug);
  const title = o.title?.trim() || defaults.title;
  const description = o.description?.trim() || defaults.description;
  return {
    title,
    description,
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: defaults.canonical,
    },
    twitter: { title: `${title} | ${SITE_NAME}`, description },
    alternates: { canonical: defaults.canonical },
  };
}
