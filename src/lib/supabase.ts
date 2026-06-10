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
  // ONE auth listener for the whole app, and the ONLY place that calls
  // realtime.setAuth. This matters twice over:
  //  • auth-js awaits every onAuthStateChange callback under its internal
  //    lock, so a per-subscription listener storm freezes the data layer.
  //  • realtime.setAuth re-pushes the token to EVERY open channel, so
  //    calling it per-subscription (as each of ~15 channels mounts) churns
  //    the whole socket and drops postgres_changes events — the cause of
  //    laggy/missed live updates. Applying it once keeps delivery instant.
  // The snapshot is marked `known` only AFTER the socket token is set, so
  // subscriptions (which gate on `known`) always join authenticated and
  // pass RLS on postgres_changes. Deferred off auth-js's lock.
  client.auth.onAuthStateChange((_event, session) => {
    const token = session?.access_token ?? null;
    const uid = session?.user?.id ?? null;
    setTimeout(() => {
      void (async () => {
        try {
          await client?.realtime.setAuth(token);
        } catch {
          /* socket keeps its prior token; the visible-tab poll still converges */
        }
        authState.token = token;
        authState.uid = uid;
        authState.known = true;
        for (const fn of authListeners) fn();
      })();
    }, 0);
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
