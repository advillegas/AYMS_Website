"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { useEditMode } from "@/lib/edit-mode";
import { Pencil, Check, SlidersHorizontal } from "lucide-react";

/** Routes wired for in-place click-to-edit. Expand as pages get wrapped. */
const INPLACE_ROUTES = ["/", "/camp"];

/**
 * For pages not wired for in-place editing, send the owner straight to the
 * structured editor for THAT page (not a generic dashboard) so "Edit" always
 * lands somewhere useful.
 */
const EDIT_DESTINATION: Record<string, string> = {
  "/gallery": "/admin?tab=content&section=gallery",
  "/faq": "/admin?tab=content&section=faq",
  "/trips": "/community/admin/trips",
  "/events": "/community/admin/calendar",
  "/featured": "/community/admin/calendar",
};

/**
 * Floating editor control shown to admins/content-managers on the marketing
 * site. Toggles in-place "click to edit" mode; when on, a top banner explains
 * it and links to the structured Content/Settings dashboard for lists.
 */
export function InlineEditBar() {
  const user = useAuth((s) => s.user);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);
  const canEditContent = useHasPermission("manageContent");
  const enabled = useInlineEdit((s) => s.enabled);
  const toggle = useInlineEdit((s) => s.toggle);
  const isEditMode = useEditMode((s) => s.isEditMode);
  const pathname = usePathname();

  if (!isAuthenticated || !(canEditContent || user?.role === "admin")) return null;
  // Hide entirely inside the community app + the block editor dashboard.
  if (pathname.startsWith("/community") || pathname.startsWith("/admin")) return null;
  // Hide while the full section builder is active (it owns the editing UI).
  if (isEditMode) return null;

  // On pages not yet wired for in-place editing, the button just opens the
  // structured Content/Settings dashboard instead of a no-op edit mode.
  if (!INPLACE_ROUTES.includes(pathname)) {
    const dest = EDIT_DESTINATION[pathname] ?? "/admin?tab=content";
    return (
      <Link
        href={dest}
        className="fixed bottom-6 left-6 z-[120] flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgb(34_16_25/0.35)] transition-all hover:scale-105 active:scale-95"
        style={{ background: "linear-gradient(to right, var(--magenta), var(--brand-pink))" }}
      >
        <SlidersHorizontal className="h-4 w-4" /> Edit this page
      </Link>
    );
  }

  return (
    <>
      {enabled && (
        <div className="fixed left-0 right-0 top-0 z-[120] flex items-center justify-center gap-3 bg-[#221019] px-4 py-2 text-center text-xs font-medium text-white sm:text-sm">
          <span>
            <strong className="text-[var(--blush)]">Editing this page</strong> — click any text or photo to change it. Saves automatically.
          </span>
          <Link
            href="/admin?tab=content"
            className="hidden items-center gap-1 rounded-full border border-white/20 px-3 py-1 text-[11px] hover:bg-white/10 sm:inline-flex"
          >
            <SlidersHorizontal className="h-3 w-3" /> Lists &amp; settings
          </Link>
        </div>
      )}
      <button
        type="button"
        onClick={toggle}
        className="fixed bottom-6 left-6 z-[120] flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_28px_rgb(34_16_25/0.35)] transition-all hover:scale-105 active:scale-95"
        style={{ background: enabled ? "#16a34a" : "linear-gradient(to right, var(--magenta), var(--brand-pink))" }}
      >
        {enabled ? (
          <>
            <Check className="h-4 w-4" /> Done editing
          </>
        ) : (
          <>
            <Pencil className="h-4 w-4" /> Edit page
          </>
        )}
      </button>
    </>
  );
}
