"use client";

/**
 * Supabase persistence for the site editor (CMS). Mirrors the Firestore
 * write-through + realtime subscription in cms-store.ts; dispatched to
 * from there when useSupabaseBackend is on.
 *
 *   cms_pages      ← one row per page (slug pk)
 *   cms_config     ← nav lives at key='nav', value = { links }
 *   cms_templates  ← one row per saved template (id pk)
 *
 * Types are imported type-only to avoid a runtime import cycle with
 * cms-store.ts (which imports these functions at runtime).
 */

import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { ensureSupabaseSession } from "./ensure-session";
import type { BuilderElement, Template } from "./builder-store";
import type { CmsPage, NavLink } from "./cms-store";

const NAV_KEY = "nav";

/* ----------------------------- row shapes -------------------------- */

interface PageRow {
  slug: string;
  title: string | null;
  elements: BuilderElement[] | null;
  is_published: boolean | null;
  is_system: boolean | null;
  created_at: string | null;
  updated_at: string | null;
}
interface TemplateRow {
  id: string;
  name: string | null;
  elements: BuilderElement[] | null;
  created_at: string | null;
  updated_at: string | null;
}
interface ConfigRow {
  key: string;
  value: { links?: NavLink[] } | null;
}

function rowToPage(r: PageRow): CmsPage {
  return {
    slug: r.slug,
    title: r.title ?? r.slug,
    elements: Array.isArray(r.elements) ? r.elements : [],
    isPublished: !!r.is_published,
    isSystem: !!r.is_system,
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}
function rowToTemplate(r: TemplateRow): Template {
  return {
    id: r.id,
    name: r.name ?? "",
    elements: Array.isArray(r.elements) ? r.elements : [],
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? new Date().toISOString(),
  };
}

/* ----------------------------- write-through ----------------------- */

export async function sbWritePage(page: CmsPage): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  // Guarantee an authenticated session — a lapsed token makes RLS reject the
  // write, so new pages / edits silently fail to save.
  await ensureSupabaseSession(sb);
  const { error } = await sb
    .from("cms_pages")
    .upsert(
      {
        slug: page.slug,
        title: page.title,
        elements: page.elements ?? [],
        is_published: !!page.isPublished,
        is_system: !!page.isSystem,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slug" },
    );
  if (error) console.warn("[cms:sb] page write failed", page.slug, error.message);
  return !error;
}

export function sbDeletePage(slug: string): void {
  const sb = getSupabase();
  if (!sb) return;
  void (async () => {
    await ensureSupabaseSession(sb);
    const { error } = await sb.from("cms_pages").delete().eq("slug", slug);
    if (error) console.warn("[cms:sb] page delete failed", slug, error.message);
  })();
}

export function sbWriteNav(navLinks: NavLink[]): void {
  const sb = getSupabase();
  if (!sb) return;
  void (async () => {
    await ensureSupabaseSession(sb);
    const { error } = await sb
      .from("cms_config")
      .upsert(
        { key: NAV_KEY, value: { links: navLinks }, updated_at: new Date().toISOString() },
        { onConflict: "key" },
      );
    if (error) console.warn("[cms:sb] nav write failed", error.message);
  })();
}

export function sbWriteTemplate(t: Template): void {
  const sb = getSupabase();
  if (!sb) return;
  void (async () => {
    await ensureSupabaseSession(sb);
    const { error } = await sb
      .from("cms_templates")
      .upsert(
        {
          id: t.id,
          name: t.name,
          elements: t.elements ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    if (error) console.warn("[cms:sb] template write failed", t.id, error.message);
  })();
}

export function sbDeleteTemplate(id: string): void {
  const sb = getSupabase();
  if (!sb) return;
  void (async () => {
    await ensureSupabaseSession(sb);
    const { error } = await sb.from("cms_templates").delete().eq("id", id);
    if (error) console.warn("[cms:sb] template delete failed", id, error.message);
  })();
}

/* ----------------------------- version history --------------------- */

export interface CmsVersion {
  id: string;
  slug: string;
  title: string;
  elements: BuilderElement[];
  createdAt: string;
}

interface VersionRow {
  id: string;
  slug: string;
  title: string | null;
  elements: BuilderElement[] | null;
  created_at: string | null;
}

/** Snapshot a page's elements into history (called on each publish). Keeps the 10 most recent per slug. */
export async function sbWriteVersion(
  slug: string,
  title: string,
  elements: BuilderElement[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const id = `ver-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  try {
    await ensureSupabaseSession(sb);
    const { error } = await sb
      .from("cms_page_versions")
      .insert({ id, slug, title, elements: elements ?? [] });
    if (error) {
      console.warn("[cms:sb] version write failed", slug, error.message);
      return;
    }
    // Prune to the 10 newest snapshots for this page.
    const { data } = await sb
      .from("cms_page_versions")
      .select("id")
      .eq("slug", slug)
      .order("created_at", { ascending: false });
    if (Array.isArray(data) && data.length > 10) {
      const stale = data.slice(10).map((r) => (r as { id: string }).id);
      if (stale.length) await sb.from("cms_page_versions").delete().in("id", stale);
    }
  } catch (e) {
    console.warn("[cms:sb] version write threw", e);
  }
}

/** Most-recent-first version snapshots for a page (max 10). */
export async function sbListVersions(slug: string): Promise<CmsVersion[]> {
  const sb = getSupabase();
  if (!sb) return [];
  try {
    const { data, error } = await sb
      .from("cms_page_versions")
      .select("*")
      .eq("slug", slug)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !Array.isArray(data)) return [];
    return (data as VersionRow[]).map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title ?? "",
      elements: Array.isArray(r.elements) ? r.elements : [],
      createdAt: r.created_at ?? "",
    }));
  } catch {
    return [];
  }
}

/* ----------------------------- one-shot load ----------------------- */

export async function sbLoadCms(): Promise<{
  pages: Record<string, CmsPage>;
  navLinks: NavLink[] | null;
  templates: Template[];
} | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const [pagesRes, navRes, tplRes] = await Promise.all([
      sb.from("cms_pages").select("*").limit(500),
      sb.from("cms_config").select("*").eq("key", NAV_KEY).maybeSingle(),
      sb.from("cms_templates").select("*").limit(200),
    ]);
    const pages: Record<string, CmsPage> = {};
    for (const r of (pagesRes.data ?? []) as PageRow[]) {
      pages[r.slug] = rowToPage(r);
    }
    const navRow = navRes.data as ConfigRow | null;
    const navLinks =
      navRow?.value?.links && Array.isArray(navRow.value.links)
        ? navRow.value.links
        : null;
    const templates = ((tplRes.data ?? []) as TemplateRow[]).map(rowToTemplate);
    return { pages, navLinks, templates };
  } catch (e) {
    console.warn("[cms:sb] load failed", e);
    return null;
  }
}

/* ----------------------------- realtime ---------------------------- */

export function sbSubscribeCms(handlers: {
  onPages: (pages: Record<string, CmsPage>) => void;
  onNav: (navLinks: NavLink[]) => void;
  onTemplates: (templates: Template[]) => void;
}): () => void {
  const unsubPages = subscribeQuery<PageRow>(
    "cms_pages",
    (sb) => sb.from("cms_pages").select("*").limit(500),
    (rows) => {
      const pages: Record<string, CmsPage> = {};
      for (const r of rows) pages[r.slug] = rowToPage(r);
      handlers.onPages(pages);
    },
  );
  const unsubNav = subscribeQuery<ConfigRow>(
    "cms_config",
    (sb) => sb.from("cms_config").select("*").eq("key", NAV_KEY),
    (rows) => {
      const links = rows[0]?.value?.links;
      if (Array.isArray(links) && links.length > 0) handlers.onNav(links);
    },
  );
  const unsubTpl = subscribeQuery<TemplateRow>(
    "cms_templates",
    (sb) => sb.from("cms_templates").select("*").limit(200),
    (rows) => handlers.onTemplates(rows.map(rowToTemplate)),
  );
  return () => {
    unsubPages();
    unsubNav();
    unsubTpl();
  };
}
