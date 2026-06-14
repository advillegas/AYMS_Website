"use client";

import { create } from "zustand";

/**
 * Global toggle for the in-place "click to edit" mode. Only admins/content
 * managers can flip it on (the floating bar is permission-gated); when on,
 * every <EditableText> / <EditableImage> on the page becomes editable.
 */
interface InlineEditState {
  enabled: boolean;
  toggle: () => void;
  set: (on: boolean) => void;
}

export const useInlineEdit = create<InlineEditState>((set) => ({
  enabled: false,
  toggle: () => set((s) => ({ enabled: !s.enabled })),
  set: (on) => set({ enabled: on }),
}));
