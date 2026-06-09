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

import { getSupabase } from "./supabase";
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

  void fetchNow();

  const channelName = `rt:${table}:${filter ? `${filter.column}=${filter.value}` : "all"}:${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const channel = sb
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
    .subscribe();

  return () => {
    disposed = true;
    if (refetchTimer) clearTimeout(refetchTimer);
    void sb.removeChannel(channel);
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
