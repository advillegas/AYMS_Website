import { create } from "zustand";

interface EditModeState {
  isEditMode: boolean;
  pageSlug: string | null;
  selectedElementId: string | null;
  toggleEditMode: (slug?: string) => void;
  exitEditMode: () => void;
  setSelectedElement: (id: string | null) => void;
}

export const useEditMode = create<EditModeState>((set) => ({
  isEditMode: false,
  pageSlug: null,
  selectedElementId: null,
  toggleEditMode: (slug) =>
    set((s) => ({
      isEditMode: !s.isEditMode,
      pageSlug: !s.isEditMode ? (slug ?? s.pageSlug) : null,
      selectedElementId: null,
    })),
  exitEditMode: () =>
    set({ isEditMode: false, pageSlug: null, selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
}));
