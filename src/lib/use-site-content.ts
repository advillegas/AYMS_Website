"use client";

/**
 * Owner-editable site content + global settings for the marketing site.
 *
 * Everything is stored as keyed JSON docs in the existing `cms_config`
 * table (one row per domain: 'settings', 'home', 'gallery', 'faq',
 * 'footer', …). Reads are public; writes require an app admin (same
 * hardened RLS as the rest of the CMS). Coded components read through the
 * typed hooks below and fall back to the built-in DEFAULTS, so the site
 * always renders even before anything is customized — and the admin
 * panels can edit the live values without touching code.
 *
 * Mirrors the realtime + write-through pattern of cms-store.ts.
 */

import { create } from "zustand";
import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { PAST_TRIPS, type PastTrip } from "./trips-data";

/* ----------------------------- domains ----------------------------- */

export interface SiteSettings {
  announcementText: string;
  announcementHref: string;
  announcementEnabled: boolean;
  siteName: string;
  tagline: string;
  contactEmail: string;
  instagramHandle: string;
  brandPrimary: string;
  brandDeep: string;
  brandCoral: string;
  seoTitle: string;
  seoDescription: string;
  logoUrl: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  announcementText: "Featured Event — Check it out",
  announcementHref: "/featured",
  announcementEnabled: true,
  siteName: "Amigas Y Más Social",
  tagline: "The world is better with amigas.",
  contactEmail: "hello@amigasymassocial.com",
  instagramHandle: "amigasymassocial",
  brandPrimary: "#FF0099",
  brandDeep: "#B51760",
  brandCoral: "#FF7F50",
  seoTitle: "Amigas Y Más Social — Latina Travel Community & Group Trips",
  seoDescription:
    "Join Amigas Y Más Social — a Latina travel community and group-trip company. Curated group trips, local meetups, and a sisterhood built on connection, culture, and adventure.",
  logoUrl: "/ayms-wordmark.png",
};

export interface HeroHeadline {
  before: string;
  accent: string;
}
export interface HeroStat {
  value: string;
  label: string;
}
export interface HomeContent {
  headlines: HeroHeadline[];
  stats: HeroStat[];
}

export const DEFAULT_HOME: HomeContent = {
  headlines: [
    { before: "The world is better with ", accent: "amigas" },
    { before: "Create unforgettable ", accent: "experiences" },
    { before: "Chase the horizon with ", accent: "amigas" },
    { before: "Adventure is always better ", accent: "together" },
    { before: "Sisterhood knows no ", accent: "borders" },
    { before: "Your next trip, your new ", accent: "family" },
    { before: "We don't just travel — we ", accent: "belong" },
    { before: "Find your people, find the ", accent: "world" },
    { before: "Every journey starts with an ", accent: "amiga" },
    { before: "Wander far, grow ", accent: "closer" },
    { before: "Explore boldly, never ", accent: "alone" },
    { before: "Bigger adventures, deeper ", accent: "friendships" },
    { before: "Make memories that last a ", accent: "lifetime" },
  ],
  stats: [
    { value: "2k+", label: "amigas" },
    { value: "30+", label: "trips" },
    { value: "12", label: "countries" },
  ],
};

export type { PastTrip };
export interface GalleryContent {
  pastTrips: PastTrip[];
}
export const DEFAULT_GALLERY: GalleryContent = { pastTrips: PAST_TRIPS };

export interface FaqItem {
  q: string;
  a: string;
}
export interface FaqCategory {
  category: string;
  items: FaqItem[];
}
export interface FaqContent {
  categories: FaqCategory[];
}
export const DEFAULT_FAQ: FaqContent = {
  categories: [
    {
      category: "Trips & Booking",
      items: [
        { q: "Do you offer payment plans?", a: "Sí! All of our tours are available with a payment plan option. Reserving a trip simply holds your spot — no payment is taken online. Our team then follows up with you directly to walk through the deposit and the payment options for the balance before the trip." },
        { q: "Are flights included?", a: "International flights are not included in the trip price. You will book your own flight from your home airport and we will meet up at the destination airport. Domestic flights within the trip itinerary are included when specified." },
        { q: "What if I need to cancel?", a: "We understand plans change. Deposits are non-refundable but may be transferable to a future trip depending on timing. Full cancellation details are provided in our travel agreement when you book." },
        { q: "How many Amigas come on a tour?", a: "On average our groups have 12–20 amigas plus the group tour leader. We keep groups intimate to ensure everyone bonds and has an amazing experience. Popular trips may add additional spots." },
        { q: "What ages come on the tours?", a: "We welcome women 21+ but typically our groups are made up of women in their late 20s to mid 50s. All ages are welcome — what matters is the vibes!" },
      ],
    },
    {
      category: "Travel & Logistics",
      items: [
        { q: "Do I have to live in California to join?", a: "Not at all! We have amigas joining us from all over — CA, NY, TX, FL, IL, NV, AZ, GA, and many more states. We've even had amigas join from other countries. Everyone is welcome!" },
        { q: "Do I need travel insurance?", a: "Travel insurance is not required but highly recommended. We suggest coverage for trip cancellation, luggage loss, and healthcare costs abroad. We can recommend providers during our group Zoom call." },
        { q: "What if I'm a solo traveler?", a: "Most of our amigas travel solo — that's the whole point! You'll be matched with a roommate or can opt for a single supplement. By the time you land, you'll already feel like you've known everyone for years." },
        { q: "What's included in the trip price?", a: "Each trip varies, but generally: accommodations, most meals, all excursions and activities, local transportation, and airport transfers. Check each trip's detail page for the full breakdown." },
      ],
    },
    {
      category: "Community & Membership",
      items: [
        { q: "How do I join the AYMS community?", a: "Just create an account on our website! Membership is free and gives you access to our community portal with chat channels, event calendar, member directory, and exclusive content." },
        { q: "Do I have to go on a trip to be part of the community?", a: "Absolutely not! Many of our amigas are active community members who attend local events, join online chats, and connect with others before ever booking a trip. All are welcome." },
        { q: "What are Coffee & Cuties events?", a: "Coffee & Cuties are our monthly local meetups where amigas gather for coffee, brunch, or activities in a casual setting. It's a great way to meet other amigas in person, especially if you're new!" },
        { q: "How do I stay updated on new trips and events?", a: "Follow us on Instagram @amigasymassocial, join our newsletter from the homepage, and keep your community portal notifications on. We announce new trips and events across all channels." },
      ],
    },
    {
      category: "Safety & Support",
      items: [
        { q: "Is it safe to travel with a group?", a: "Safety is our top priority. All destinations are thoroughly vetted, we use trusted local partners, and our trip leaders are experienced travelers. We also have a mandatory pre-trip Zoom call to cover safety guidelines." },
        { q: "What if I have dietary restrictions?", a: "We accommodate all dietary needs! Just let us know when you book and we'll make sure every meal works for you. Our local partners are always prepared for vegetarian, vegan, gluten-free, and allergy requirements." },
        { q: "What happens in case of an emergency during a trip?", a: "Our trip leaders carry emergency contacts, local hospital info, and embassy details for every destination. We also share an emergency protocol during our pre-trip Zoom call. You're never alone with AYMS." },
      ],
    },
  ],
};

export interface ExperienceItem {
  title: string;
  location: string;
  emoji: string;
  gradient: string;
  image: string;
}
export interface ExperiencesContent {
  items: ExperienceItem[];
}
export const DEFAULT_EXPERIENCES: ExperiencesContent = {
  items: [
    { title: "Cenote Swimming in the Yucatán", location: "Mexico", emoji: "🏊‍♀️", gradient: "from-[#2D8B6F] to-[#1a5c4a]", image: "/trips/cancun-aug-26.jpg" },
    { title: "Cooking Class in Cartagena", location: "Colombia", emoji: "🍳", gradient: "from-[#DAA520] to-[#8B6914]", image: "/trips/colombia-dec-26.jpg" },
    { title: "Sunrise Safari Drive", location: "Kenya", emoji: "🦒", gradient: "from-[#C44B3F] to-[#8B3029]", image: "/trips/safari-jul-26.jpg" },
    { title: "Wine Tasting in Napa Valley", location: "California", emoji: "🍷", gradient: "from-[#9B2C8A] to-[#6B1D5E]", image: "/trips/napa-oct-26.jpg" },
    { title: "Salsa Night in Medellín", location: "Colombia", emoji: "💃", gradient: "from-[#FF0099] to-[#B8306A]", image: "/trips/colombia-dec-26.jpg" },
    { title: "Temple Visit in Kyoto", location: "Japan", emoji: "⛩️", gradient: "from-[#B51760] to-[#9B2C8A]", image: "/trips/japan-nov-26.jpg" },
  ],
};

export interface MarqueeContent {
  words: string[];
}
export const DEFAULT_MARQUEE: MarqueeContent = {
  words: [
    "connect", "empower", "celebrate", "latina travel", "amigas y más social",
    "sisterhood", "group trips", "latina community", "memories", "growth",
    "family", "cultura", "aventura", "hermandad",
  ],
};

/* ----------------------------- store ------------------------------- */

interface ConfigRow {
  key: string;
  value: unknown;
}

interface SiteContentState {
  values: Record<string, unknown>;
  loaded: boolean;
  subscribe: () => () => void;
  /** Optimistic local update + admin write-through to cms_config. */
  setKey: (key: string, value: unknown) => Promise<boolean>;
}

// Ref-count so only ONE realtime channel exists no matter how many
// components subscribe (navbar, footer, layout, every landing section).
let subCount = 0;
let teardown: (() => void) | null = null;

export const useSiteContentStore = create<SiteContentState>((set) => ({
  values: {},
  loaded: false,
  subscribe: () => {
    subCount += 1;
    if (!teardown) {
      teardown = subscribeQuery<ConfigRow>(
        "cms_config",
        (sb) => sb.from("cms_config").select("*").limit(100),
        (rows) => {
          const v: Record<string, unknown> = {};
          for (const r of rows) v[r.key] = r.value;
          set({ values: v, loaded: true });
        },
        () => set({ loaded: true }),
      );
    }
    return () => {
      subCount -= 1;
      if (subCount <= 0 && teardown) {
        teardown();
        teardown = null;
      }
    };
  },
  setKey: async (key, value) => {
    set((s) => ({ values: { ...s.values, [key]: value } }));
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb
      .from("cms_config")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) {
      console.warn("[site-content] save failed", key, error.message);
      return false;
    }
    return true;
  },
}));

/* --------------------------- typed hooks --------------------------- */

/**
 * Read an object-shaped content domain merged over its defaults, and
 * auto-subscribe to realtime updates. New default fields always fill in
 * even if the stored doc predates them.
 */
function useDomain<T extends object>(key: string, fallback: T): T {
  const raw = useSiteContentStore((s) => s.values[key]);
  useEffect(() => useSiteContentStore.getState().subscribe(), []);
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...fallback, ...(raw as Partial<T>) };
  }
  return fallback;
}

export function useSiteSettings(): SiteSettings {
  return useDomain<SiteSettings>("settings", DEFAULT_SETTINGS);
}

export function useHomeContent(): HomeContent {
  const c = useDomain<HomeContent>("home", DEFAULT_HOME);
  // Never let an empty saved array blank out the hero.
  return {
    headlines: c.headlines.length ? c.headlines : DEFAULT_HOME.headlines,
    stats: c.stats.length ? c.stats : DEFAULT_HOME.stats,
  };
}

export function useGalleryContent(): GalleryContent {
  const c = useDomain<GalleryContent>("gallery", DEFAULT_GALLERY);
  return { pastTrips: c.pastTrips.length ? c.pastTrips : DEFAULT_GALLERY.pastTrips };
}

export function useFaqContent(): FaqContent {
  const c = useDomain<FaqContent>("faq", DEFAULT_FAQ);
  return { categories: c.categories.length ? c.categories : DEFAULT_FAQ.categories };
}

export function useExperiencesContent(): ExperiencesContent {
  const c = useDomain<ExperiencesContent>("experiences", DEFAULT_EXPERIENCES);
  return { items: c.items.length ? c.items : DEFAULT_EXPERIENCES.items };
}

export function useMarqueeContent(): MarqueeContent {
  const c = useDomain<MarqueeContent>("marquee", DEFAULT_MARQUEE);
  return { words: c.words.length ? c.words : DEFAULT_MARQUEE.words };
}

/** Persist a domain doc (admin only). */
export function saveSiteContent(key: string, value: unknown): Promise<boolean> {
  return useSiteContentStore.getState().setKey(key, value);
}

/* --------------------- in-place text/image overrides --------------- */
/* Powers the click-to-edit editor: every wrapped element has a stable   */
/* id; its override (if any) wins over the coded default. All overrides  */
/* live in one realtime-synced cms_config doc.                           */

export interface OverridesContent {
  text: Record<string, string>;
  media: Record<string, string>;
}
const DEFAULT_OVERRIDES: OverridesContent = { text: {}, media: {} };

export function useOverrides(): OverridesContent {
  return useDomain<OverridesContent>("overrides", DEFAULT_OVERRIDES);
}

/** Reactive override value for one text id (falls back to the coded default). */
export function useOverrideText(id: string, fallback: string): string {
  const v = useSiteContentStore((s) => {
    const o = s.values["overrides"] as OverridesContent | undefined;
    return o?.text?.[id];
  });
  useEffect(() => useSiteContentStore.getState().subscribe(), []);
  return v ?? fallback;
}

/** Reactive override value for one image id (falls back to the coded default). */
export function useOverrideImage(id: string, fallback: string): string {
  const v = useSiteContentStore((s) => {
    const o = s.values["overrides"] as OverridesContent | undefined;
    return o?.media?.[id];
  });
  useEffect(() => useSiteContentStore.getState().subscribe(), []);
  return v ?? fallback;
}

function currentOverrides(): OverridesContent {
  const o = useSiteContentStore.getState().values["overrides"] as
    | OverridesContent
    | undefined;
  return {
    text: { ...(o?.text ?? {}) },
    media: { ...(o?.media ?? {}) },
  };
}

export function saveOverrideText(id: string, value: string): Promise<boolean> {
  const next = currentOverrides();
  next.text[id] = value;
  return saveSiteContent("overrides", next);
}

export function saveOverrideImage(id: string, url: string): Promise<boolean> {
  const next = currentOverrides();
  next.media[id] = url;
  return saveSiteContent("overrides", next);
}
