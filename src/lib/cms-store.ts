import { create } from "zustand";
import { v4 as uuid } from "uuid";
import type { BuilderElement, ElementType, Template } from "./builder-store";
import { STARTER_TEMPLATES } from "./starter-templates";

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
}

const CMS_PAGES_KEY = "ayms-cms-pages";
const CMS_NAV_KEY = "ayms-cms-nav";
const CMS_TEMPLATES_KEY = "ayms-cms-templates";

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

export const useCms = create<CmsState>((set, get) => ({
  pages: {},
  navLinks: DEFAULT_NAV,
  editingSlug: null,
  templates: [],

  createPage: (title, slug) => {
    const sanitized = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    const now = new Date().toISOString();
    const page: CmsPage = {
      slug: sanitized,
      title,
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
  },

  deletePage: (slug) => {
    set((s) => {
      const pages = { ...s.pages };
      if (pages[slug]?.isSystem) return s;
      delete pages[slug];
      lsSet(CMS_PAGES_KEY, pages);
      const navLinks = s.navLinks.filter((l) => l.href !== `/p/${slug}`);
      lsSet(CMS_NAV_KEY, navLinks);
      return {
        pages,
        navLinks,
        editingSlug: s.editingSlug === slug ? null : s.editingSlug,
      };
    });
  },

  setPageElements: (slug, elements) => {
    set((s) => {
      const existing = s.pages[slug];
      const now = new Date().toISOString();
      const page: CmsPage = existing
        ? { ...existing, elements: JSON.parse(JSON.stringify(elements)), updatedAt: now }
        : { slug, title: slug, elements: JSON.parse(JSON.stringify(elements)), isPublished: false, isSystem: SYSTEM_PAGES.some((sp) => sp.slug === slug), createdAt: now, updatedAt: now };
      const pages = { ...s.pages, [slug]: page };
      lsSet(CMS_PAGES_KEY, pages);
      return { pages };
    });
  },

  publishPage: (slug) => {
    set((s) => {
      const page = s.pages[slug];
      if (!page) return s;
      const pages = { ...s.pages, [slug]: { ...page, isPublished: true, updatedAt: new Date().toISOString() } };
      lsSet(CMS_PAGES_KEY, pages);
      return { pages };
    });
  },

  unpublishPage: (slug) => {
    set((s) => {
      const page = s.pages[slug];
      if (!page) return s;
      const pages = { ...s.pages, [slug]: { ...page, isPublished: false, updatedAt: new Date().toISOString() } };
      lsSet(CMS_PAGES_KEY, pages);
      return { pages };
    });
  },

  setEditingSlug: (slug) => set({ editingSlug: slug }),

  getPage: (slug) => get().pages[slug],

  hasPublishedPage: (slug) => {
    const page = get().pages[slug];
    return !!page && page.isPublished && page.elements.length > 0;
  },

  addNavLink: (label, href) => {
    const link: NavLink = { id: uuid(), label, href, isVisible: true };
    set((s) => {
      const navLinks = [...s.navLinks, link];
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
  },

  removeNavLink: (id) => {
    set((s) => {
      const navLinks = s.navLinks.filter((l) => l.id !== id);
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
  },

  updateNavLink: (id, updates) => {
    set((s) => {
      const navLinks = s.navLinks.map((l) => (l.id === id ? { ...l, ...updates } : l));
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
  },

  moveNavLink: (fromIndex, toIndex) => {
    set((s) => {
      const navLinks = [...s.navLinks];
      const [moved] = navLinks.splice(fromIndex, 1);
      navLinks.splice(toIndex, 0, moved);
      lsSet(CMS_NAV_KEY, navLinks);
      return { navLinks };
    });
  },

  saveTemplate: (name, elements) => {
    const t: Template = { id: uuid(), name, elements: JSON.parse(JSON.stringify(elements)), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    set((s) => {
      const templates = [...s.templates, t];
      lsSet(CMS_TEMPLATES_KEY, templates);
      return { templates };
    });
  },

  loadTemplate: (id) => {
    const t = get().templates.find((t) => t.id === id);
    return t ? JSON.parse(JSON.stringify(t.elements)) : [];
  },

  deleteTemplate: (id) => {
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      lsSet(CMS_TEMPLATES_KEY, templates);
      return { templates };
    });
  },

  loadFromStorage: () => {
    const savedTemplates = lsGet<Template[]>(CMS_TEMPLATES_KEY, []);
    const starterIds = new Set(savedTemplates.map((t) => t.name));
    const starters: Template[] = STARTER_TEMPLATES
      .filter((s) => !starterIds.has(s.name))
      .map((s) => ({
        id: `starter-${s.name.toLowerCase().replace(/\s+/g, "-")}`,
        name: s.name,
        elements: s.elements,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      }));
    set({
      pages: lsGet<Record<string, CmsPage>>(CMS_PAGES_KEY, {}),
      navLinks: lsGet<NavLink[]>(CMS_NAV_KEY, DEFAULT_NAV),
      templates: [...starters, ...savedTemplates],
    });
  },

  persist: () => {
    const { pages, navLinks, templates } = get();
    lsSet(CMS_PAGES_KEY, pages);
    lsSet(CMS_NAV_KEY, navLinks);
    lsSet(CMS_TEMPLATES_KEY, templates);
  },
}));
