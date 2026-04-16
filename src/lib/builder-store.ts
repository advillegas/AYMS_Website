import { create } from "zustand";
import { v4 as uuid } from "uuid";

export type ElementType =
  | "heading"
  | "text"
  | "image"
  | "video"
  | "button"
  | "spacer"
  | "divider"
  | "columns"
  | "card";

export interface BuilderElement {
  id: string;
  type: ElementType;
  props: Record<string, unknown>;
  children?: BuilderElement[];
}

export interface Template {
  id: string;
  name: string;
  elements: BuilderElement[];
  createdAt: string;
  updatedAt: string;
}

interface BuilderState {
  elements: BuilderElement[];
  selectedId: string | null;
  templates: Template[];
  activeTemplateId: string | null;
  publishedElements: BuilderElement[];

  addElement: (type: ElementType, index?: number) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, props: Record<string, unknown>) => void;
  moveElement: (fromIndex: number, toIndex: number) => void;
  duplicateElement: (id: string) => void;
  setSelected: (id: string | null) => void;
  clearCanvas: () => void;

  saveTemplate: (name: string) => void;
  loadTemplate: (id: string) => void;
  deleteTemplate: (id: string) => void;
  renameTemplate: (id: string, name: string) => void;

  publish: () => void;
  loadFromStorage: () => void;
}

function defaultProps(type: ElementType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { text: "Your Heading Here", level: "h2", align: "center", color: "#ffffff" };
    case "text":
      return { text: "Click to edit this text. Add your event details, descriptions, or any content here.", align: "left", color: "#e0e0e0", fontSize: "16" };
    case "image":
      return { src: "", alt: "Image", width: "100%", borderRadius: "12" };
    case "video":
      return { src: "", poster: "", autoplay: false };
    case "button":
      return { text: "Click Here", href: "#", variant: "primary", align: "center" };
    case "spacer":
      return { height: "40" };
    case "divider":
      return { color: "#E8458B", opacity: "0.3", width: "80%" };
    case "columns":
      return { columns: 2, gap: "16" };
    case "card":
      return { title: "Card Title", description: "Card description goes here.", bgColor: "#1f0d16", borderColor: "#E8458B" };
    default:
      return {};
  }
}

const STORAGE_KEY = "ayms-builder-templates";
const PUBLISHED_KEY = "ayms-builder-published";

function loadTemplatesFromLS(): Template[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplatesToLS(templates: Template[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

function loadPublishedFromLS(): BuilderElement[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PUBLISHED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePublishedToLS(elements: BuilderElement[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PUBLISHED_KEY, JSON.stringify(elements));
}

export const useBuilder = create<BuilderState>((set, get) => ({
  elements: [],
  selectedId: null,
  templates: [],
  activeTemplateId: null,
  publishedElements: [],

  addElement: (type, index) => {
    const el: BuilderElement = { id: uuid(), type, props: defaultProps(type) };
    set((s) => {
      const els = [...s.elements];
      if (index !== undefined) {
        els.splice(index, 0, el);
      } else {
        els.push(el);
      }
      return { elements: els, selectedId: el.id };
    });
  },

  removeElement: (id) =>
    set((s) => ({
      elements: s.elements.filter((e) => e.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  updateElement: (id, props) =>
    set((s) => ({
      elements: s.elements.map((e) =>
        e.id === id ? { ...e, props: { ...e.props, ...props } } : e,
      ),
    })),

  moveElement: (fromIndex, toIndex) =>
    set((s) => {
      const els = [...s.elements];
      const [moved] = els.splice(fromIndex, 1);
      els.splice(toIndex, 0, moved);
      return { elements: els };
    }),

  duplicateElement: (id) =>
    set((s) => {
      const idx = s.elements.findIndex((e) => e.id === id);
      if (idx === -1) return s;
      const orig = s.elements[idx];
      const dup: BuilderElement = { ...orig, id: uuid(), props: { ...orig.props } };
      const els = [...s.elements];
      els.splice(idx + 1, 0, dup);
      return { elements: els, selectedId: dup.id };
    }),

  setSelected: (id) => set({ selectedId: id }),

  clearCanvas: () => set({ elements: [], selectedId: null }),

  saveTemplate: (name) => {
    const id = uuid();
    const now = new Date().toISOString();
    const template: Template = {
      id,
      name,
      elements: JSON.parse(JSON.stringify(get().elements)),
      createdAt: now,
      updatedAt: now,
    };
    set((s) => {
      const templates = [...s.templates, template];
      saveTemplatesToLS(templates);
      return { templates, activeTemplateId: id };
    });
  },

  loadTemplate: (id) => {
    const t = get().templates.find((t) => t.id === id);
    if (!t) return;
    set({
      elements: JSON.parse(JSON.stringify(t.elements)),
      selectedId: null,
      activeTemplateId: id,
    });
  },

  deleteTemplate: (id) =>
    set((s) => {
      const templates = s.templates.filter((t) => t.id !== id);
      saveTemplatesToLS(templates);
      return { templates, activeTemplateId: s.activeTemplateId === id ? null : s.activeTemplateId };
    }),

  renameTemplate: (id, name) =>
    set((s) => {
      const templates = s.templates.map((t) =>
        t.id === id ? { ...t, name, updatedAt: new Date().toISOString() } : t,
      );
      saveTemplatesToLS(templates);
      return { templates };
    }),

  publish: () => {
    const els = JSON.parse(JSON.stringify(get().elements));
    savePublishedToLS(els);
    set({ publishedElements: els });
    if (get().activeTemplateId) {
      const tid = get().activeTemplateId!;
      set((s) => {
        const templates = s.templates.map((t) =>
          t.id === tid
            ? { ...t, elements: JSON.parse(JSON.stringify(s.elements)), updatedAt: new Date().toISOString() }
            : t,
        );
        saveTemplatesToLS(templates);
        return { templates };
      });
    }
  },

  loadFromStorage: () => {
    set({
      templates: loadTemplatesFromLS(),
      publishedElements: loadPublishedFromLS(),
    });
  },
}));
