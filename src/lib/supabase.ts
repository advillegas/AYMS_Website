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
  // ONE auth listener for the whole app (subscriptions must not each
  // register their own — auth-js awaits every callback under its internal
  // lock during the restore-time INITIAL_SESSION emission, and a listener
  // storm there freezes the data layer). It keeps the realtime socket's
  // claims current — without setAuth, channels negotiate with the anon
  // key and RLS silently filters every postgres_changes event on
  // authenticated-only tables (chat messages "send" but never confirm) —
  // and feeds the auth registry that subscribeQuery reads synchronously.
  client.auth.onAuthStateChange((_event, session) => {
    authState.token = session?.access_token ?? null;
    authState.uid = session?.user?.id ?? null;
    authState.known = true;
    client?.realtime.setAuth(authState.token);
    for (const fn of authListeners) fn();
  });
  return client;
}

/* ------------------------------------------------------------------ */
/* Auth registry — a synchronous snapshot of the session for the data  */
/* layer. subscribeQuery (mounted dozens of times) reads this instead  */
/* of each calling auth.getSession(), which at restore time piles into */
/* auth-js's internal lock queue and can deadlock the page.            */
/* ------------------------------------------------------------------ */

const authState: { token: string | null; uid: string | null; known: boolean } =
  { token: null, uid: null, known: false };
const authListeners = new Set<() => void>();

/** Current session snapshot (synchronous; `known` is false until the
 * first auth event after page load has fired). */
export function getAuthSnapshot(): {
  token: string | null;
  uid: string | null;
  known: boolean;
} {
  return authState;
}

/** Subscribe to auth identity changes. Returns an unsubscribe fn. */
export function onAuthSnapshotChange(fn: () => void): () => void {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
}
