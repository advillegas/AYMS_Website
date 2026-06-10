"use client";

/**
 * Supabase data-layer helpers used by the migrated hooks.
 *
 * `subscribeQuery` mirrors Firestore's onSnapshot contract: it runs an
 * initial fetch, emits the full result set, then re-runs the same query
 * whenever Postgres logical replication reports a change touching the
 * table (optionally narrowed by a column filter). Re-fetching the whole
 * set on each change matches how the existing hooks consumed onSnapshot
 * (they always received the complete list), so downstream logic is
 * unchanged. The app's data volume is small enough that full refetch is
 * cheaper than reconciling per-row deltas, and it's far less bug-prone.
 */

import { getSupabase, getAuthSnapshot, onAuthSnapshotChange } from "./supabase";
import type {
  RealtimePostgresChangesPayload,
  SupabaseClient,
} from "@supabase/supabase-js";

export type QueryBuilder<T> = (
  sb: SupabaseClient,
) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>;

export interface RealtimeFilter {
  /** Column to filter realtime change events on (e.g. "channel_id"). */
  column: string;
  value: string;
}

/**
 * Subscribe to a table with an initial fetch + realtime refetch.
 *
 * @returns an unsubscribe function.
 */
export function subscribeQuery<T>(
  table: string,
  runQuery: QueryBuilder<T>,
  onData: (rows: T[]) => void,
  onError?: (msg: string) => void,
  filter?: RealtimeFilter,
): () => void {
  const sb = getSupabase();
  if (!sb) {
    onData([]);
    return () => {};
  }

  let disposed = false;
  let refetchTimer: ReturnType<typeof setTimeout> | null = null;
  let channel: ReturnType<SupabaseClient["channel"]> | null = null;
  let lastAuthUid: string | null | undefined;

  const fetchNow = async () => {
    try {
      const { data, error } = await runQuery(sb);
      if (disposed) return;
      if (error) {
        onError?.(error.message);
        return;
      }
      onData(data ?? []);
    } catch (e) {
      if (!disposed) onError?.(e instanceof Error ? e.message : "query failed");
    }
  };

  // Coalesce bursts of change events (e.g. a batch write) into one
  // refetch on the next tick.
  const scheduleRefetch = () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(fetchNow, 80);
  };

  const teardownChannel = () => {
    if (channel) {
      void sb.removeChannel(channel);
      channel = null;
    }
  };

  // postgres_changes subscriptions are RLS-checked with the claims held
  // at SUBSCRIBE time — a channel joined before the session resolved (or
  // across a sign-in/out) keeps anon claims and goes silent on
  // authenticated-only tables. So: prime the socket auth before joining,
  // and rejoin whenever the auth identity changes.
  const joinChannel = (accessToken: string | null) => {
    if (disposed) return;
    teardownChannel();
    sb.realtime.setAuth(accessToken);
    const channelName = `rt:${table}:${filter ? `${filter.column}=${filter.value}` : "all"}:${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    channel = sb
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (_payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          scheduleRefetch();
        },
      )
      .subscribe((status) => {
        // On transport trouble the safety-net poll keeps data converging;
        // a refetch on recovery closes any gap the outage opened.
        if (status === "SUBSCRIBED") scheduleRefetch();
      });
  };

  // Start work only once the app-wide auth snapshot is known (the global
  // listener in supabase.ts fires on INITIAL_SESSION). Dozens of these
  // subscriptions mount at once on page load — if each called
  // auth.getSession()/onAuthStateChange itself, the calls pile into
  // auth-js's internal lock queue during the restore-time emission and
  // can freeze the entire data layer. The registry costs nothing to read.
  const start = () => {
    const snap = getAuthSnapshot();
    lastAuthUid = snap.uid;
    void fetchNow();
    joinChannel(snap.token);
  };

  if (getAuthSnapshot().known) {
    start();
  }
  const offAuth = onAuthSnapshotChange(() => {
    const snap = getAuthSnapshot();
    if (lastAuthUid === undefined) {
      // First signal after mount — begin.
      start();
      return;
    }
    if (snap.uid !== lastAuthUid) {
      lastAuthUid = snap.uid;
      // Rejoin with the new identity so postgres_changes re-evaluates RLS.
      setTimeout(() => joinChannel(getAuthSnapshot().token), 0);
      scheduleRefetch();
    }
  });

  // Safety net: realtime can drop or be RLS-silenced without an error
  // surface; a slow visible-tab poll guarantees eventual consistency.
  const pollTimer = setInterval(() => {
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      void fetchNow();
    }
  }, 30_000);

  return () => {
    disposed = true;
    if (refetchTimer) clearTimeout(refetchTimer);
    clearInterval(pollTimer);
    offAuth();
    teardownChannel();
  };
}

/* ------------------------------------------------------------------ */
/* Timestamp helpers — Postgres returns ISO strings already, but we    */
/* normalize null/empty the same way the Firestore tsToIso did.        */
/* ------------------------------------------------------------------ */

export function tsToIso(v: string | null | undefined): string {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

export const nowIso = () => new Date().toISOString();
