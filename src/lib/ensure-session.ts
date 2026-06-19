"use client";

/**
 * Make sure the Supabase client has a live, authenticated session before an
 * RLS-protected write. Without this, a lapsed token silently drops the client
 * to `anon` and every insert/update is rejected by row-level security — the
 * write "succeeds" locally but never reaches the database.
 *
 *   - Refreshes an expired access token via getSession().
 *   - For the password-admin, silently re-mints the bridge session via
 *     /api/auth/admin-session (same path as useAdminSessionRecovery).
 *
 * Returns true when a usable session is present after the attempt.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { useAuth } from "./store";

export async function ensureSupabaseSession(
  sb?: SupabaseClient | null,
): Promise<boolean> {
  const client = sb ?? getSupabase();
  if (!client) return false;
  try {
    const { data } = await client.auth.getSession();
    if (data.session) return true;

    // Only the password-admin can self-re-mint; regular members must
    // already hold a Supabase session from sign-in.
    if (useAuth.getState().user?.id !== "admin") return false;

    const res = await fetch("/api/auth/admin-session", { method: "POST" });
    if (!res.ok) return false;
    const j = (await res.json()) as {
      ok?: boolean;
      access_token?: string;
      refresh_token?: string;
    };
    if (j?.ok && j.access_token && j.refresh_token) {
      await client.auth.setSession({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
      });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
