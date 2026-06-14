"use client";

/**
 * Media library — a reusable catalog of every image/GIF/video uploaded
 * through the site editor. CMS uploads record a row (see uploadCmsMedia);
 * the editor's media picker reads them back so the owner can re-use a file
 * instead of re-uploading. Mirrors the realtime/ref-count pattern of the
 * other content stores.
 */

import { create } from "zustand";
import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";

export interface MediaAsset {
  id: string;
  url: string;
  name: string | null;
  kind: string;
  created_at: string;
}

interface State {
  assets: MediaAsset[];
  loaded: boolean;
  subscribe: () => () => void;
}

let subCount = 0;
let teardown: (() => void) | null = null;

export const useMediaLibraryStore = create<State>((set) => ({
  assets: [],
  loaded: false,
  subscribe: () => {
    subCount += 1;
    if (!teardown) {
      teardown = subscribeQuery<MediaAsset>(
        "media_assets",
        (sb) =>
          sb
            .from("media_assets")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(300),
        (rows) => set({ assets: rows, loaded: true }),
        () => set({ loaded: true }),
      );
    }
    return () => {
      subCount -= 1;
      if (subCount <= 0 && teardown) {
        teardown();
        teardown = null;
      }
    };
  },
}));

export function useMediaAssets(): { assets: MediaAsset[]; loaded: boolean } {
  const assets = useMediaLibraryStore((s) => s.assets);
  const loaded = useMediaLibraryStore((s) => s.loaded);
  useEffect(() => useMediaLibraryStore.getState().subscribe(), []);
  return { assets, loaded };
}

/** Derive a library "kind" from a file's MIME type. */
export function kindFromMime(type: string): string {
  if (type.startsWith("video/")) return "video";
  if (type === "image/gif") return "gif";
  return "image";
}

/** Record an uploaded file in the library (best-effort; skips data URLs). */
export async function recordMediaAsset(
  url: string,
  name: string,
  kind = "image",
): Promise<void> {
  if (!url || url.startsWith("data:")) return;
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("media_assets").insert({ url, name, kind });
  } catch {
    /* best effort — never block the upload it accompanies */
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("media_assets").delete().eq("id", id);
  } catch {
    /* best effort */
  }
}
