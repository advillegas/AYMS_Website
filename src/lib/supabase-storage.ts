"use client";

/**
 * Supabase Storage upload helper. Mirrors the Firebase Storage
 * upload-then-getDownloadURL flow used across the profile + post UIs.
 * Uploads into the public `media` bucket and returns the public URL.
 */

import { getSupabase } from "./supabase";

/**
 * Upload a file to the `media` bucket under `<folder>/<unique-name>`
 * and return its public URL, or null on failure.
 *
 * Callers pass owner-scoped folders (`avatars/{userId}`, `posts/{userId}`,
 * `covers/{userId}`, `gallery/{userId}`) so storage RLS can verify the
 * second path segment against the canonical app user id.
 */
export async function uploadToSupabaseStorage(
  folder: string,
  file: File,
): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const safeName = file.name.replace(/[^a-zA-Z0-9.]/g, "_");
  const path = `${folder}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}-${safeName}`;
  try {
    const { error } = await sb.storage.from("media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || undefined,
    });
    if (error) {
      console.error("[supabase-storage] upload failed", error.message);
      return null;
    }
    const { data } = sb.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  } catch (e) {
    console.error("[supabase-storage] upload threw", e);
    return null;
  }
}

/**
 * Derive the bucket-relative object path from a `media` bucket public
 * URL (`…/storage/v1/object/public/media/<path>`). Returns null for
 * anything else (Firebase Storage URLs, GIPHY, other buckets) so
 * callers can safely feed it any stored URL.
 */
export function pathFromPublicUrl(publicUrl: string): string | null {
  const marker = "/storage/v1/object/public/media/";
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  const path = publicUrl.slice(idx + marker.length).split(/[?#]/)[0];
  if (!path) return null;
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * Best-effort removal of a previously-uploaded object by its public
 * URL. Failures are warn-swallowed — cleanup must never block or fail
 * the user-facing action that triggered it.
 */
export async function removeFromSupabaseStorage(
  publicUrl: string,
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const path = pathFromPublicUrl(publicUrl);
  if (!path) return;
  try {
    const { error } = await sb.storage.from("media").remove([path]);
    if (error) {
      console.warn("[supabase-storage] remove failed", error.message);
    }
  } catch (e) {
    console.warn("[supabase-storage] remove threw", e);
  }
}
