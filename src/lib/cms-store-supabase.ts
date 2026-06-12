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

export function sbWritePage(page: CmsPage): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
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
    )
    .then(({ error }) => {
      if (error) console.warn("[cms:sb] page write failed", page.slug, error.message);
    });
}

export function sbDeletePage(slug: string): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("cms_pages")
    .delete()
    .eq("slug", slug)
    .then(({ error }) => {
      if (error) console.warn("[cms:sb] page delete failed", slug, error.message);
    });
}

export function sbWriteNav(navLinks: NavLink[]): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("cms_config")
    .upsert(
      { key: NAV_KEY, value: { links: navLinks }, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    )
    .then(({ error }) => {
      if (error) console.warn("[cms:sb] nav write failed", error.message);
    });
}

export function sbWriteTemplate(t: Template): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("cms_templates")
    .upsert(
      {
        id: t.id,
        name: t.name,
        elements: t.elements ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    )
    .then(({ error }) => {
      if (error) console.warn("[cms:sb] template write failed", t.id, error.message);
    });
}

export function sbDeleteTemplate(id: string): void {
  const sb = getSupabase();
  if (!sb) return;
  void sb
    .from("cms_templates")
    .delete()
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.warn("[cms:sb] template delete failed", id, error.message);
    });
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
