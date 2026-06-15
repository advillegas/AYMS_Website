import { create } from "zustand";

interface EditModeState {
  isEditMode: boolean;
  pageSlug: string | null;
  selectedElementId: string | null;
  /** Preview-as-visitor: render the canvas with no edit chrome. */
  isPreview: boolean;
  toggleEditMode: (slug?: string) => void;
  /** Switch the editor to another page without leaving edit mode. */
  setEditPage: (slug: string) => void;
  exitEditMode: () => void;
  setSelectedElement: (id: string | null) => void;
  setPreview: (on: boolean) => void;
}

export const useEditMode = create<EditModeState>((set) => ({
  isEditMode: false,
  pageSlug: null,
  selectedElementId: null,
  isPreview: false,
  toggleEditMode: (slug) =>
    set((s) => ({
      isEditMode: !s.isEditMode,
      pageSlug: !s.isEditMode ? (slug ?? s.pageSlug) : null,
      selectedElementId: null,
      isPreview: false,
    })),
  setEditPage: (slug) =>
    set({ isEditMode: true, pageSlug: slug, selectedElementId: null, isPreview: false }),
  exitEditMode: () =>
    set({ isEditMode: false, pageSlug: null, selectedElementId: null, isPreview: false }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setPreview: (on) => set({ isPreview: on, selectedElementId: null }),
}));
