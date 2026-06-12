"use client";

/**
 * Supabase Storage upload helper. Mirrors the Firebase Storage
 * upload-then-getDownloadURL flow used across the profile + post UIs.
 * Uploads into the public `media` bucket and returns the public URL.
 */

import { getSupabase } from "./supabase";
import { useAuth } from "./store";

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
 * Upload media for the site editor (CMS) and return a durable URL.
 *
 * Uploads to the owner-scoped `media/cms/{canonicalUserId}` folder so the
 * hardened storage RLS (which checks the 2nd path segment against
 * current_app_user_id()) accepts it, and returns the public URL —
 * critically NOT a base64 data URL: CMS pages persist their elements as
 * JSONB and stream over realtime, so inlining an image (or worse, a
 * video) would bloat or overflow the row.
 *
 * Fallback: only a SMALL image falls back to a data URL when Storage is
 * unavailable (e.g. local dev without Supabase). Video never inlines —
 * a base64 video would be catastrophic for the row, so the caller is
 * told to use a YouTube/Vimeo embed URL instead.
 */
export async function uploadCmsMedia(file: File): Promise<string> {
  const uid = useAuth.getState().user?.id;
  const folder = uid ? `cms/${uid}` : "cms";
  const url = await uploadToSupabaseStorage(folder, file);
  if (url) return url;

  const isImage = file.type.startsWith("image/");
  if (isImage && file.size <= 2 * 1024 * 1024) {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("file read failed"));
      reader.readAsDataURL(file);
    });
  }
  throw new Error(
    "Storage upload failed. For video, paste a YouTube or Vimeo link instead.",
  );
}

/**
 * Convert a YouTube / Vimeo watch URL into an embeddable iframe URL.
 * Returns null for anything that isn't a recognized embeddable video
 * host (so callers fall back to a direct <video> tag).
 */
export function toVideoEmbedUrl(raw: string): string | null {
  if (!raw) return null;
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\./, "").toLowerCase();
  // YouTube: youtu.be/<id>, youtube.com/watch?v=<id>, /embed/<id>, /shorts/<id>
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (u.pathname === "/watch") {
      const id = u.searchParams.get("v");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const m = u.pathname.match(/^\/(embed|shorts)\/([^/]+)/);
    if (m) return `https://www.youtube.com/embed/${m[2]}`;
    return null;
  }
  // Vimeo: vimeo.com/<id>
  if (host === "vimeo.com") {
    const id = u.pathname.split("/").filter(Boolean)[0];
    return id && /^\d+$/.test(id) ? `https://player.vimeo.com/video/${id}` : null;
  }
  if (host === "player.vimeo.com") return u.toString();
  return null;
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
