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
