"use client";

/**
 * Shared Draft ↔ Live double-click toggle used by the admin Pages list and
 * the builder toolbars. The optimistic flip (and its revert on a failed
 * backend write) lives in the store's publish/unpublish actions; this hook
 * adds the guard rails and the user-facing toasts:
 *
 *   - a page with no saved content can't go live (it would render the
 *     public "Page Not Found" screen — the shop-merch trap), so the toggle
 *     explains what to do instead of silently "publishing" nothing;
 *   - success/failure is always announced, and failure means the badge
 *     visibly snaps back to its real state.
 */

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useCms, isSystemSlug, systemPageHref } from "./cms-store";

export const TOGGLE_PUBLISH_HINT = "Double-click to switch Draft/Live";

export function useTogglePublish(slug: string): {
  toggling: boolean;
  toggle: () => Promise<void>;
} {
  const [toggling, setToggling] = useState(false);
  const busyRef = useRef(false);

  const toggle = useCallback(async () => {
    if (busyRef.current) return;
    const page = useCms.getState().pages[slug];
    if (!page) {
      toast.error("Nothing to publish yet — open the page in the builder and Save first.");
      return;
    }
    const goingLive = !page.isPublished;
    if (goingLive && page.elements.length === 0) {
      toast.error(
        `“${page.title}” has no saved content yet. Open it, add your sections, and Save — then double-click to go live.`,
      );
      return;
    }
    busyRef.current = true;
    setToggling(true);
    try {
      const ok = goingLive
        ? await useCms.getState().publishPage(slug)
        : await useCms.getState().unpublishPage(slug);
      if (ok) {
        toast.success(
          goingLive
            ? `“${page.title}” is live at ${systemPageHref(slug)}`
            : isSystemSlug(slug)
              ? `“${page.title}” is back to draft — visitors see the original page.`
              : `“${page.title}” is back to draft — hidden from visitors.`,
        );
      } else {
        toast.error("Couldn't update the page — check your connection and try again.");
      }
    } finally {
      busyRef.current = false;
      setToggling(false);
    }
  }, [slug]);

  return { toggling, toggle };
}
