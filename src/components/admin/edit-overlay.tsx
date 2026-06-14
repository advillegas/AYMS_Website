"use client";

import Link from "next/link";
import { useAuth } from "@/lib/store";
import { useEditMode } from "@/lib/edit-mode";
import { useHasPermission } from "@/lib/use-roles-store";
import { isSystemSlug } from "@/lib/cms-store";
import { Edit3 } from "lucide-react";

interface Props {
  slug: string;
}

export function EditPageOverlay({ slug }: Props) {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const toggleEditMode = useEditMode((s) => s.toggleEditMode);
  const isEditMode = useEditMode((s) => s.isEditMode);
  const canEditContent = useHasPermission("manageContent");

  if (!isAuthenticated || !(canEditContent || user?.role === "admin") || isEditMode) {
    return null;
  }

  const cls =
    "fixed bottom-6 left-6 z-[60] flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--magenta)] to-[var(--brand-pink)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_0_25px_rgb(255_0_153/0.3)] hover:brightness-110 transition-all hover:scale-105 active:scale-95";

  // Coded marketing pages are edited via the Content & Settings dashboard
  // (which mirrors the live site) — not the block canvas, which only builds
  // standalone custom pages and won't reflect this page's real sections.
  if (isSystemSlug(slug)) {
    return (
      <Link href="/admin?tab=content" className={cls}>
        <Edit3 className="h-4 w-4" />
        Edit Site Content
      </Link>
    );
  }

  return (
    <button onClick={() => toggleEditMode(slug)} className={cls}>
      <Edit3 className="h-4 w-4" />
      Edit This Page
    </button>
  );
}
