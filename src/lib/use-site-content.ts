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

/** Persist a domain doc (admin only). */
export function saveSiteContent(key: string, value: unknown): Promise<boolean> {
  return useSiteContentStore.getState().setKey(key, value);
}
