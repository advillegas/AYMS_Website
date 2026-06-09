import { create } from "zustand";
import { v4 as uuid } from "uuid";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from "firebase/firestore";
import type { BuilderElement, Template } from "./builder-store";
import { STARTER_TEMPLATES } from "./starter-templates";
import { getDb, isFirebaseConfigured } from "./firebase";

export interface CmsPage {
  slug: string;
  title: string;
  elements: BuilderElement[];
  isPublished: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  isVisible: boolean;
}

const DEFAULT_NAV: NavLink[] = [
  { id: "nav-home", label: "Home", href: "/", isVisible: true },
  { id: "nav-trips", label: "Trips", href: "/trips", isVisible: true },
  { id: "nav-events", label: "Events", href: "/events", isVisible: true },
  { id: "nav-gallery", label: "Gallery", href: "/gallery", isVisible: true },
  { id: "nav-play", label: "Play", href: "/play", isVisible: true },
  { id: "nav-faq", label: "FAQ", href: "/faq", isVisible: true },
];

const SYSTEM_PAGES = [
  { slug: "home", title: "Home", href: "/" },
  { slug: "trips", title: "Trips", href: "/trips" },
  { slug: "events", title: "Events", href: "/events" },
  { slug: "gallery", title: "Gallery", href: "/gallery" },
  { slug: "play", title: "Play", href: "/play" },
  { slug: "faq", title: "FAQ", href: "/faq" },
  { slug: "featured", title: "Featured Event", href: "/featured" },
];

interface CmsState {
  pages: Record<string, CmsPage>;
  navLinks: NavLink[];
  editingSlug: string | null;
  templates: Template[];

  // Page CRUD
  createPage: (title: string, slug: string) => void;
  deletePage: (slug: string) => void;
  setPageElements: (slug: string, elements: BuilderElement[]) => void;
  publishPage: (slug: string) => void;
  unpublishPage: (slug: string) => void;
  setEditingSlug: (slug: string | null) => void;
  getPage: (slug: string) => CmsPage | undefined;
  hasPublishedPage: (slug: string) => boolean;

  // Nav CRUD
  addNavLink: (label: string, href: string) => void;
  removeNavLink: (id: string) => void;
  updateNavLink: (id: string, updates: Partial<NavLink>) => void;
  moveNavLink: (fromIndex: number, toIndex: number) => void;

  // Templates
  saveTemplate: (name: string, elements: BuilderElement[]) => void;
  loadTemplate: (id: string) => BuilderElement[];
  deleteTemplate: (id: string) => void;

  // Persistence
  loadFromStorage: () => void;
  persist: () => void;
  /** Async: hydrate pages/nav/templates from Firestore (one-shot). */
  loadFromFirestore: () => Promise<void>;
  /** Realtime: subscribe to Firestore CMS docs; returns an unsubscribe fn. */
  subscribe: () => () => void;
}

const CMS_PAGES_KEY = "ayms-cms-pages";
const CMS_NAV_KEY = "ayms-cms-nav";
const CMS_TEMPLATES_KEY = "ayms-cms-templates";

/* -------------------------------------------------------------------- */
/* Firestore locations                                                  */
/*   pages     → cmsPages/{slug}        (one doc per page)              */
/*   nav       → cmsConfig/nav          (single doc { links: NavLink[] })*/
/*   templates → cmsTemplates/{id}      (one doc per user template)     */
/* Starter (built-in `starter-*`) templates are NEVER written to        */
/* Firestore — they're regenerated locally from STARTER_TEMPLATES.      */
/* -------------------------------------------------------------------- */
const FS_PAGES = "cmsPages";
const FS_CONFIG = "cmsConfig";
const FS_NAV_DOC = "nav";
const FS_TEMPLATES = "cmsTemplates";

function lsGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
}

/* ----------------------------- validation -------------------------- */

/** Lowercase + strip to a safe, Firestore-doc-id-friendly slug. */
function sanitizeSlug(slug: string): string {
  return String(slug)
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** A slug is valid for Firestore if non-empty after sanitization. */
function isValidSlug(slug: string): boolean {
  return typeof slug === "string" && sanitizeSlug(slug).length > 0;
}

function isValidNavLink(l: unknown): l is NavLink {
  if (!l || typeof l !== "object") return false;
  const o = l as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.href === "string" &&
    typeof o.isVisible === "boolean"
  );
}

function isStarterTemplate(id: string): boolean {
  return typeof id === "string" && id.startsWith("starter-");
}

/* --------------------------- FS serializers ------------------------ */

function pageToDoc(p: CmsPage): Record<string, unknown> {
  return {
    slug: p.slug,
    title: p.title,
    // Deep-clone-safe plain JSON; Firestore rejects undefined/class instances.
    elements: JSON.parse(JSON.stringify(p.elements ?? [])),
    isPublished: !!p.isPublished,
    isSystem: !!p.isSystem,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    syncedAt: serverTimestamp(),
  };
}

function docToPage(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): CmsPage | null {
  const data = d.data() as Partial<CmsPage>;
  if (!isValidSlug(d.id)) return null;
  return {
    slug: d.id,
    title: typeof data.title === "string" ? data.title : d.id,
    elements: Array.isArray(data.elements) ? (data.elements as BuilderElement[]) : [],
    isPublished: !!data.isPublished,
    isSystem: !!data.isSystem,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

function templateToDoc(t: Template): Record<string, unknown> {
  return {
    name: t.name,
    elements: JSON.parse(JSON.stringify(t.elements ?? [])),
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    syncedAt: serverTimestamp(),
  };
}

function docToTemplate(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Template | null {
  const data = d.data() as Partial<Template>;
  if (typeof data.name !== "string") return null;
  return {
    id: d.id,
    name: data.name,
    elements: Array.isArray(data.elements) ? (data.elements as BuilderElement[]) : [],
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

/* ------------------------- FS write-through ------------------------ */
/* All writes are best-effort + fire-and-forget: local/optimistic state */
/* and the localStorage mirror are the source of truth for the editing  */
/* session; Firestore failures are logged, never thrown. Writes are     */
/* admin-only at the rules layer (see firestore.rules → cmsPages /      */
/* cmsConfig / cmsTemplates) and run client-side as the signed-in admin.*/

function fsWritePage(page: CmsPage): void {
  if (!isFirebaseConfigured || !isValidSlug(page.slug)) return;
  const db = getDb();
  if (!db) return;
  void setDoc(doc(db, FS_PAGES, page.slug), pageToDoc(page)).catch((e) =>
    console.warn("[cms] page write failed", page.slug, e),
  );
}

function fsDeletePage(slug: string): void {
  if (!isFirebaseConfigured || !isValidSlug(slug)) return;
  const db = getDb();
  if (!db) return;
  void deleteDoc(doc(db, FS_PAGES, slug)).catch((e) =>
    console.warn("[cms] page delete failed", slug, e),
  );
}

function fsWriteNav(navLinks: NavLink[]): void {
  if (!isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  const links = navLinks.filter(isValidNavLink);
  void setDoc(doc(db, FS_CONFIG, FS_NAV_DOC), {
    links,
    updatedAt: serverTimestamp(),
  }).catch((e) => console.warn("[cms] nav write failed", e));
}

function fsWriteTemplate(t: Template): void {
  // Starter templates are local-only seeds — never persisted to Firestore.
  if (!isFirebaseConfigured || isStarterTemplate(t.id)) return;
  const db = getDb();
  if (!db) return;
  void setDoc(doc(db, FS_TEMPLATES, t.id), templateToDoc(t)).catch((e) =>
    console.warn("[cms] template write failed", t.id, e),
  );
}

function fsDeleteTemplate(id: string): void {
  if (!isFirebaseConfigured || isStarterTemplate(id)) return;
  const db = getDb();
  if (!db) return;
  void deleteDoc(doc(db, FS_TEMPLATES, id)).catch((e) =>
    console.warn("[cms] template delete failed", id, e),
  );
}

/** Toggle a page's published flag (optimistic local + FS write-through). */
function setPublished(
  set: (fn: (s: CmsState) => Partial<CmsState> | CmsState) => void,
  get: () => CmsState,
  slug: string,
  isPublished: boolean,
): void {
  set((s) => {
    const page = s.pages[slug];
    if (!page) return s;
    const pages = {
      ...s.pages,
      [slug]: { ...page, isPublished, updatedAt: new Date().toISOString() },
    };
    lsSet(CMS_PAGES_KEY, pages);
    return { pages };
  });
  const p = get().pages[slug];
  if (p) fsWritePage(p);
}

/* --------------------- starter-template merge ---------------------- */

/** Rebuild the local starter templates that aren't already overridden. */
function withStarters(saved: Template[]): Template[] {
  const savedNames = new Set(saved.map((t) => t.name));
  const starters: Template[] = STARTER_TEMPLATES.filter(
    (s) => !savedNames.has(s.name),
  ).map((s) => ({
    id: `starter-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
    name: s.name,
    elements: s.elements,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  }));
  return [...starters, ...saved];
}

/* --------------------- FS snapshot → state ------------------------- */
/* Shared by both the one-shot loader and the realtime subscription so  */
/* the parse/validate logic lives in exactly one place.                 */

function parsePages(snap: QuerySnapshot<DocumentData>): Record<string, CmsPage> {
  const pages: Record<string, CmsPage> = {};
  snap.forEach((d) => {
    const p = docToPage(d);
    if (p) pages[p.slug] = p;
  });
  return pages;
}

function parseTemplates(snap: QuerySnapshot<DocumentData>): Template[] {
  const saved: Template[] = [];
  snap.forEach((d) => {
    const t = docToTemplate(d);
    if (t) saved.push(t);
  });
  return saved;
}

/** Extract a valid NavLink[] from a nav doc's data, or null if absent. */
function parseNavData(data: { links?: unknown } | undefined): NavLink[] | null {
  if (!data || !Array.isArray(data.links)) return null;
  const valid = data.links.filter(isValidNavLink);
  return valid.length > 0 ? valid : null;
}

/* ----------------------- shared subscription ----------------------- */
/* subscribe() is called by several mounted components at once (navbar,  */
/* the page wrapper, /p/[slug], featured, admin). Ref-count so only ONE  */
/* set of Firestore listeners is ever live no matter how many components */
/* subscribe; tear the listeners down only when the LAST caller          */
/* unsubscribes.                                                         */
let fsSubscriberCount = 0;
let fsTeardown: (() => void) | null = null;

export const useCms = create<CmsState>((set, get) => ({
  pages: {},
  navLinks: DEFAULT_NAV,
  editingSlug: null,
  templates: [],

  createPage: (title, slug) => {
    const sanitized = sanitizeSlug(slug);
    if (!sanitized) return;
    const now = new Date().toISOString();
    const page: CmsPage = {
      slug: sanitized,
      title: typeof title === "string" ? title : sanitized,
      elements: [],
      isPublished: false,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const pages = { ...s.pages, [sanitized]: page };
      lsSet(CMS_PAGES_KEY, pages);
      return { pages, editingSlug: sanitized };
    });
    fsWritePage(page);
  },

  deletePage: (slug) => {
    let removed = false;
    set((s) => {
      const pages = { ...s.pages };
      if (pages[slug]?.isSystem) return s;
      delete pages[slug];
      removed = true;
      lsSet(CMS_PAGES_KEY, pages);
      const navLinks = s.navLinks.filter((l) => l.href !== `/p/${slug}`);
      lsSet(CMS_NAV_KEY, navLinks);
      return {
        pages,
        navLinks,
        editingSlug: s.editingSlug === slug ? null : s.editingSlug,
      };
    });
    if (removed) {
      fsDeletePage(slug);
      fsWriteNav(get().navLinks);
    }
  },

  setPageElements: (slug, elements) => {
    const sanitized = sanitizeSlug(slug);
    if (!sanitized) return;
    set((s) => {
      const existing = s.pages[sanitized];
      const now = new Date().toISOString();
      const page: CmsPage = existing
        ? { ...existing, elements: JSON.parse(JSON.stringify(elements)), updatedAt: now }
        : {
            slug: sanitized,
            title: sanitized,
            elements: JSON.parse(JSON.stringify(elements)),
            isPublished: false,
            isSystem: SYSTEM_PAGES.some((sp) => sp.slug === sanitized),
            createdAt: now,
            updatedAt: now,
          };
      const pages = { ...s.pages, [sanitized]: page };
      lsSet(CMS_PAGES_KEY, pages);
      return { pages };
    });
    const p = get().pages[sanitized];
    if (p) fsWritePage(p);
  },

  publishPage: (slug) => setPublished(set, get, slug, true),
  unpublishPage: (slug) => setPublished(set, get, slug, false),

  setEditingSlug: (slug) => set({ editingSlug: slug }),

  getPage: (slug) => get().pages[slug],

  hasPublishedPage: (slug) => {
    const page = get().pages[slug];
    return !!page && page.isPublished && page.elements.length > 0;
  },

  addNavLink: (label, href) => {
    if (typeof label !== "string" || typeof href !== "string") return;
    const link: NavLink = { id: uuid(), label, href, isVisible: true };
    set((s) => {
      const navLinks = [...s.navLinks, link];
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
    fsWriteNav(get().navLinks);
  },

  removeNavLink: (id) => {
    set((s) => {
      const navLinks = s.navLinks.filter((l) => l.id !== id);
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
    fsWriteNav(get().navLinks);
  },

  updateNavLink: (id, updates) => {
    set((s) => {
      const navLinks = s.navLinks.map((l) => (l.id === id ? { ...l, ...updates } : l));
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
    fsWriteNav(get().navLinks);
  },

  moveNavLink: (fromIndex, toIndex) => {
    set((s) => {
      const navLinks = [...s.navLinks];
      const [moved] = navLinks.splice(fromIndex, 1);
      if (moved === undefined) return s;
      navLinks.splice(toIndex, 0, moved);
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
    fsWriteNav(get().navLinks);
  },

  saveTemplate: (name, elements) => {
    if (typeof name !== "string") return;
    const t: Template = {
      id: uuid(),
      name,
      elements: JSON.parse(JSON.stringify(elements)),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set((s) => {
      const templates = [...s.templates, t];
      // Persist only non-starter templates to localStorage (parity with FS).
      lsSet(CMS_TEMPLATES_KEY, templates.filter((x) => !isStarterTemplate(x.id)));
      return { templates };
    });
    fsWriteTemplate(t);
  },

  loadTemplate: (id) => {
    const t = get().templates.find((t) => t.id === id);
    return t ? JSON.parse(JSON.stringify(t.elements)) : [];
  },

  deleteTemplate: (id) => {
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      lsSet(CMS_TEMPLATES_KEY, templates.filter((x) => !isStarterTemplate(x.id)));
      return { templates };
    });
    fsDeleteTemplate(id);
  },

  loadFromStorage: () => {
    const savedTemplates = lsGet<Template[]>(CMS_TEMPLATES_KEY, []);
    set({
      pages: lsGet<Record<string, CmsPage>>(CMS_PAGES_KEY, {}),
      navLinks: lsGet<NavLink[]>(CMS_NAV_KEY, DEFAULT_NAV),
      templates: withStarters(savedTemplates),
    });
  },

  persist: () => {
    const { pages, navLinks, templates } = get();
    lsSet(CMS_PAGES_KEY, pages);
    lsSet(CMS_NAV_KEY, navLinks);
    lsSet(CMS_TEMPLATES_KEY, templates.filter((x) => !isStarterTemplate(x.id)));
  },

  loadFromFirestore: async () => {
    // Local dev / unconfigured Firebase → keep the localStorage flow.
    if (!isFirebaseConfigured) {
      get().loadFromStorage();
      return;
    }
    const db = getDb();
    if (!db) {
      get().loadFromStorage();
      return;
    }
    try {
      const [pagesSnap, navSnap, templatesSnap] = await Promise.all([
        getDocs(collection(db, FS_PAGES)),
        getDoc(doc(db, FS_CONFIG, FS_NAV_DOC)),
        getDocs(collection(db, FS_TEMPLATES)),
      ]);

      const pages = parsePages(pagesSnap);
      const navLinks =
        (navSnap.exists() && parseNavData(navSnap.data() as { links?: unknown })) ||
        DEFAULT_NAV;
      const savedTemplates = parseTemplates(templatesSnap);

      // Mirror the loaded state into localStorage for offline parity.
      lsSet(CMS_PAGES_KEY, pages);
      lsSet(CMS_NAV_KEY, navLinks);
      lsSet(CMS_TEMPLATES_KEY, savedTemplates);

      set({ pages, navLinks, templates: withStarters(savedTemplates) });
    } catch (e) {
      console.warn("[cms] loadFromFirestore failed; using localStorage", e);
      get().loadFromStorage();
    }
  },

  subscribe: () => {
    if (!isFirebaseConfigured) {
      get().loadFromStorage();
      return () => {};
    }
    const db = getDb();
    if (!db) {
      get().loadFromStorage();
      return () => {};
    }

    // Open the real Firestore listeners only for the FIRST subscriber; later
    // callers just bump the ref-count and share the same live snapshots.
    fsSubscriberCount += 1;
    if (!fsTeardown) {
      const onErr = (label: string) => (err: FirestoreError) =>
        console.warn(`[cms] ${label} subscription failed`, err);

      const unsubPages = onSnapshot(
        collection(db, FS_PAGES),
        (snap) => {
          const pages = parsePages(snap);
          lsSet(CMS_PAGES_KEY, pages);
          set({ pages });
        },
        onErr("pages"),
      );

      const unsubNav = onSnapshot(
        doc(db, FS_CONFIG, FS_NAV_DOC),
        (snap) => {
          const navLinks = snap.exists()
            ? parseNavData(snap.data() as { links?: unknown })
            : null;
          if (!navLinks) return;
          lsSet(CMS_NAV_KEY, navLinks);
          set({ navLinks });
        },
        onErr("nav"),
      );

      const unsubTemplates = onSnapshot(
        collection(db, FS_TEMPLATES),
        (snap) => {
          const saved = parseTemplates(snap);
          lsSet(CMS_TEMPLATES_KEY, saved);
          set({ templates: withStarters(saved) });
        },
        onErr("templates"),
      );

      fsTeardown = () => {
        unsubPages();
        unsubNav();
        unsubTemplates();
      };
    }

    // Each caller gets its own unsubscribe; the shared listeners close only
    // when the last subscriber releases.
    return () => {
      fsSubscriberCount -= 1;
      if (fsSubscriberCount <= 0) {
        fsSubscriberCount = 0;
        fsTeardown?.();
        fsTeardown = null;
      }
    };
  },
}));
