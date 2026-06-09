/**
 * Supabase client for the AYMS community backend.
 *
 * Mirrors the shape of src/lib/firebase.ts so the data layer can be
 * migrated hook-by-hook during the Firebase -> Supabase transition.
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY; when
 * absent, isSupabaseConfigured is false and callers fall back to the
 * existing Firebase path (dual-run).
 *
 * Postgres schema lives in supabase/schema.sql. Data is migrated via
 * scripts/migrate-firestore-to-supabase.mjs (idempotent upserts).
 */

import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Master switch for the migration. While false, all hooks keep using
 * Firebase. Flip NEXT_PUBLIC_USE_SUPABASE=true (with the URL + anon key
 * set) to route the rewritten hooks at Supabase. Lets us cut over
 * atomically once parity is verified, and roll back instantly.
 */
export const useSupabaseBackend =
  isSupabaseConfigured && process.env.NEXT_PUBLIC_USE_SUPABASE === "true";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (client) return client;
  client = createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: { params: { eventsPerSecond: 10 } },
  });
  return client;
}
