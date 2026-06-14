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
  | "card"
  | "section"
  | "hero"
  | "testimonial"
  | "gallery"
  | "trip-card"
  | "event-card"
  | "pricing"
  | "countdown"
  | "columns-2"
  | "banner"
  | "faq-item"
  | "cta-block";

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

  // Undo / redo for the editing canvas.
  undo: () => void;
  redo: () => void;
  resetHistory: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

// History stacks live at module scope so the subscription below can record
// every `elements` change regardless of which call site made it.
let undoPast: BuilderElement[][] = [];
let undoFuture: BuilderElement[][] = [];
let timeTravel = false;
const HISTORY_LIMIT = 60;

const RV = { revealAnimation: "none", revealDelay: "0" } as const;

function defaultProps(type: ElementType): Record<string, unknown> {
  switch (type) {
    case "heading":
      return { ...RV, text: "Your Heading Here", level: "h2", align: "center", color: "#ffffff", textGlow: false, ambientFloat: false };
    case "text":
      return { ...RV, text: "Click to edit this text. Add your event details, descriptions, or any content here.", align: "left", color: "#e0e0e0", fontSize: "16" };
    case "image":
      return { ...RV, src: "", alt: "Image", width: "100%", align: "center", borderRadius: "12", ambientFloat: false };
    case "video":
      return { ...RV, src: "", poster: "", autoplay: false };
    case "button":
      return { ...RV, text: "Click Here", href: "#", variant: "primary", align: "center", bgColor: "", textColor: "", shimmerEnabled: false };
    case "spacer":
      return { ...RV, height: "40" };
    case "divider":
      return { ...RV, color: "#FF0099", opacity: "0.3", width: "80%" };
    case "columns":
      return { ...RV, columns: 2, gap: "16" };
    case "card":
      return {
        ...RV,
        title: "Card Title", description: "Card description goes here.", bgColor: "#3A0F2A", borderColor: "#FF0099", image: "", emoji: "", href: "", textColor: "#ffffff", descColor: "#ffffff99", gradientFrom: "", gradientTo: "",
        flipEnabled: false, sparkleEnabled: false, glowEnabled: false,
        flipTitle: "", flipDescription: "", flipGradientFrom: "#FF0099", flipGradientTo: "#B51760", flipTextColor: "#ffffff", flipDescColor: "#ffffffd9",
        sparkleColor: "#ffffff", sparkleCount: "10", glowColor: "#FF0099",
        hoverLift: false, borderGlow: false,
      };
    case "section":
      return { ...RV, bgColor: "#1A0814", bgGradient: "", padding: "48", maxWidth: "1200", borderTop: false, patternType: "none", patternOpacity: "15", radialGlow: "0" };
    case "hero":
      return {
        ...RV,
        title: "Welcome to AYMS", subtitle: "Travel. Connect. Celebrate.", ctaText: "Explore Trips", ctaHref: "/trips",
        bgGradient: "linear-gradient(135deg, #3A0F2A 0%, #1A0814 50%, #1a0a12 100%)", bgImage: "", overlayOpacity: "0.4", minHeight: "500", align: "center",
        showBokeh: true, showStars: true, showNoise: true, bokehOpacity: "12",
      };
    case "testimonial":
      return { ...RV, quote: "An unforgettable experience that changed my life!", name: "Maria G.", location: "Miami, FL", tripName: "Tulum Retreat 2025", avatarInitials: "MG", avatarImage: "", gradientFrom: "#FF0099", gradientTo: "#B51760", avatarPulseGlow: false };
    case "gallery":
      return { ...RV, images: ["", "", "", ""], columns: "3", gap: "8", borderRadius: "12" };
    case "trip-card":
      return { ...RV, emoji: "🌴", destination: "Tulum, Mexico", dates: "Mar 15-22, 2026", price: "$1,299", status: "open", description: "7 days of beach, culture & sisterhood", ctaText: "Book Now", ctaHref: "#", image: "", hoverLift: true };
    case "event-card":
      return { ...RV, dateMonth: "APR", dateDay: "20", title: "Spring Social Mixer", location: "Miami, FL", type: "Social", description: "Join us for an evening of connection and celebration.", ctaText: "RSVP", ctaHref: "#", hoverLift: false };
    case "pricing":
      return { ...RV, price: "1,299", currency: "$", period: "per person", title: "Tulum Retreat", features: ["7-night luxury stay", "Daily excursions", "Group meals included", "Airport transfers"], ctaText: "Reserve Your Spot", ctaHref: "#", highlight: true, hoverLift: false };
    case "countdown":
      return { ...RV, targetDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), label: "Next Trip Departing In", bgColor: "#3A0F2A", accentColor: "#FF0099", pulseGlow: false };
    case "columns-2":
      return { ...RV, gap: "24" };
    case "banner":
      return { ...RV, text: "✨ New trips dropping soon — stay tuned! ✨", speed: "30", bgColor: "#FF0099", textColor: "#ffffff", fontSize: "14", shimmerStrip: false };
    case "faq-item":
      return { ...RV, question: "What's included in the trip price?", answer: "Our trips include accommodation, planned excursions, group meals, and airport transfers. Flights are typically booked separately.", open: false };
    case "cta-block":
      return { ...RV, heading: "Ready for Your Next Adventure?", description: "Join our community of 500+ amigas and discover unforgettable travel experiences.", primaryText: "Browse Trips", primaryHref: "/trips", secondaryText: "Join Community", secondaryHref: "/register", bgGradient: "linear-gradient(135deg, #2d1020 0%, #3A0F2A 100%)", primaryShimmer: false, borderGlow: false };
    default:
      return {};
  }
}

export function getDefaultPropsForType(type: ElementType): Record<string, unknown> {
  return defaultProps(type);
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
  canUndo: false,
  canRedo: false,

  undo: () => {
    if (undoPast.length === 0) return;
    const prev = undoPast.pop() as BuilderElement[];
    undoFuture.push(get().elements);
    timeTravel = true;
    set({ elements: prev, selectedId: null, canUndo: undoPast.length > 0, canRedo: true });
    timeTravel = false;
  },

  redo: () => {
    if (undoFuture.length === 0) return;
    const next = undoFuture.pop() as BuilderElement[];
    undoPast.push(get().elements);
    timeTravel = true;
    set({ elements: next, selectedId: null, canUndo: true, canRedo: undoFuture.length > 0 });
    timeTravel = false;
  },

  resetHistory: () => {
    undoPast = [];
    undoFuture = [];
    set({ canUndo: false, canRedo: false });
  },

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

// Record every canvas `elements` change into the undo stack (skips
// changes made BY undo/redo themselves). Captures all call sites,
// including direct useBuilder.setState() from the page wrapper.
useBuilder.subscribe((state, prev) => {
  if (timeTravel) return;
  if (state.elements === prev.elements) return;
  undoPast.push(prev.elements);
  if (undoPast.length > HISTORY_LIMIT) undoPast.shift();
  undoFuture = [];
  if (!state.canUndo || state.canRedo) {
    useBuilder.setState({ canUndo: true, canRedo: false });
  }
});
