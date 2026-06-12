"use client";

import { useAuth } from "@/lib/store";
import { useEditMode } from "@/lib/edit-mode";
import { Edit3 } from "lucide-react";

interface Props {
  slug: string;
}

export function EditPageOverlay({ slug }: Props) {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const toggleEditMode = useEditMode((s) => s.toggleEditMode);
  const isEditMode = useEditMode((s) => s.isEditMode);

  if (!isAuthenticated || user?.role !== "admin" || isEditMode) return null;

  return (
    <button
      onClick={() => toggleEditMode(slug)}
      className="fixed bottom-6 left-6 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgb(255_0_153/0.3)] hover:brightness-110 transition-all hover:scale-105 active:scale-95"
    >
      <Edit3 className="h-4 w-4" />
      Edit This Page
    </button>
  );
}
