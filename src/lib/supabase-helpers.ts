"use client";

/**
 * Supabase data-layer helpers used by the migrated hooks.
 *
 * `subscribeQuery` mirrors Firestore's onSnapshot contract: initial fetch,
 * emit the full set, then keep it live. Live updates come from a SINGLE
 * shared realtime channel (see the multiplexer below) — postgres_changes
 * delivery degrades sharply when a client opens many channels, so every
 * subscription shares one channel with one binding per table and filters
 * client-side. Change events are applied as deltas from the payload
 * (no REST round-trip), so updates land at realtime latency (~200ms);
 * a slow visible-tab poll reconciles anything the socket ever drops.
 */

import { getSupabase, getAuthSnapshot, onAuthSnapshotChange } from "./supabase";
import type {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
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

type ChangePayload = RealtimePostgresChangesPayload<Record<string, unknown>>;
type ChangeHandler = (payload: ChangePayload) => void;

/* ================================================================== */
/* Shared realtime multiplexer                                         */
/*                                                                     */
/* Supabase Realtime postgres_changes becomes laggy/unreliable once a  */
/* client opens many channels on one socket (measured: a lone channel  */
/* delivers in ~200-460ms; ~8 channels drop events). So the whole app  */
/* shares ONE channel with one binding per table; subscribers register */
/* a handler per table and filter client-side. The set of tables is    */
/* rebuilt (debounced) as subscribers come and go, and re-subscribed   */
/* when the auth identity changes so RLS re-evaluates.                 */
/* ================================================================== */

const tableHandlers = new Map<string, Set<ChangeHandler>>();
let sharedChannel: RealtimeChannel | null = null;
let subscribedTables: string[] = [];
let rebuildTimer: ReturnType<typeof setTimeout> | null = null;
let muxAuthUid: string | null | undefined;
let muxAuthWired = false;

function activeTables(): string[] {
  const out: string[] = [];
  for (const [t, set] of tableHandlers) if (set.size > 0) out.push(t);
  return out.sort();
}

function sameTables(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((t, i) => t === b[i]);
}

function rebuildSharedChannel(): void {
  const sb = getSupabase();
  if (!sb) return;
  const active = activeTables();
  if (sharedChannel && sameTables(active, subscribedTables)) return;
  if (sharedChannel) {
    void sb.removeChannel(sharedChannel);
    sharedChannel = null;
  }
  subscribedTables = active;
  if (active.length === 0) return;
  let ch = sb.channel("app-rt");
  for (const table of active) {
    ch = ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table },
      (payload: ChangePayload) => {
        const hs = tableHandlers.get(table);
        if (!hs) return;
        for (const h of [...hs]) {
          try {
            h(payload);
          } catch {
            /* one bad handler must not break the others */
          }
        }
      },
    );
  }
  sharedChannel = ch.subscribe();
}

function scheduleRebuild(): void {
  if (rebuildTimer) clearTimeout(rebuildTimer);
  rebuildTimer = setTimeout(rebuildSharedChannel, 60);
}

function wireMuxAuth(): void {
  if (muxAuthWired) return;
  muxAuthWired = true;
  muxAuthUid = getAuthSnapshot().uid;
  onAuthSnapshotChange(() => {
    const uid = getAuthSnapshot().uid;
    if (uid === muxAuthUid) return;
    muxAuthUid = uid;
    // Identity changed: tear down so the channel re-subscribes under the
    // new token (the global listener has already applied it to the socket).
    const sb = getSupabase();
    if (sb && sharedChannel) {
      void sb.removeChannel(sharedChannel);
      sharedChannel = null;
      subscribedTables = [];
    }
    scheduleRebuild();
  });
}

/** Register a change handler for a table on the shared channel. */
function registerRealtime(table: string, handler: ChangeHandler): () => void {
  wireMuxAuth();
  let set = tableHandlers.get(table);
  if (!set) {
    set = new Set();
    tableHandlers.set(table, set);
  }
  set.add(handler);
  scheduleRebuild(); // rebuild only if this added a new table to the set
  return () => {
    const s = tableHandlers.get(table);
    if (s) {
      s.delete(handler);
      if (s.size === 0) tableHandlers.delete(table);
    }
    scheduleRebuild();
  };
}

/**
 * Subscribe to a table: initial fetch + live updates via the shared
 * channel. Returns an unsubscribe function.
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
  let lastAuthUid: string | null | undefined;
  let offRealtime: (() => void) | null = null;
  // Local mirror so realtime events apply as deltas (instant) rather than
  // forcing a full re-query.
  let lastRows: T[] = [];

  const rowId = (r: unknown): string | undefined => {
    if (r && typeof r === "object" && "id" in r) {
      const v = (r as { id?: unknown }).id;
      return typeof v === "string" ? v : undefined;
    }
    return undefined;
  };

  const fetchNow = async () => {
    try {
      const { data, error } = await runQuery(sb);
      if (disposed) return;
      if (error) {
        onError?.(error.message);
        return;
      }
      lastRows = data ?? [];
      onData(lastRows);
    } catch (e) {
      if (!disposed) onError?.(e instanceof Error ? e.message : "query failed");
    }
  };

  // Fallback for composite-PK tables (no single `id` to delta-apply) and
  // for the visible-tab reconcile poll.
  const scheduleRefetch = () => {
    if (refetchTimer) clearTimeout(refetchTimer);
    refetchTimer = setTimeout(fetchNow, 80);
  };

  // Fast path: apply the change payload directly to the local mirror and
  // emit immediately — no REST round-trip. Needs a string `id`; composite
  // PKs return false and fall back to a debounced refetch.
  const applyDelta = (payload: ChangePayload): boolean => {
    const fresh = payload.new as T | undefined;
    const stale = payload.old as T | undefined;
    if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
      const id = rowId(fresh);
      if (id === undefined || !fresh) return false;
      const idx = lastRows.findIndex((r) => rowId(r) === id);
      lastRows =
        idx >= 0
          ? lastRows.map((r) => (rowId(r) === id ? fresh : r))
          : [...lastRows, fresh];
      onData(lastRows);
      return true;
    }
    if (payload.eventType === "DELETE") {
      const id = rowId(stale);
      if (id === undefined) return false;
      lastRows = lastRows.filter((r) => rowId(r) !== id);
      onData(lastRows);
      return true;
    }
    return false;
  };

  // The shared channel binds whole tables (no server-side filter), so each
  // subscriber filters its events client-side on the configured column.
  const matchesFilter = (payload: ChangePayload): boolean => {
    if (!filter) return true;
    const fresh = payload.new as Record<string, unknown> | undefined;
    const stale = payload.old as Record<string, unknown> | undefined;
    const row =
      fresh && Object.keys(fresh).length ? fresh : stale; // DELETE → old row
    return !!row && row[filter.column] === filter.value;
  };

  const onEvent = (payload: ChangePayload) => {
    if (disposed || !matchesFilter(payload)) return;
    if (!applyDelta(payload)) scheduleRefetch();
  };

  // Begin only once the auth snapshot is known (token already applied to
  // the socket globally), so the shared channel joins authenticated.
  const start = () => {
    const snap = getAuthSnapshot();
    lastAuthUid = snap.uid;
    void fetchNow();
    offRealtime = registerRealtime(table, onEvent);
  };

  if (getAuthSnapshot().known) start();

  const offAuth = onAuthSnapshotChange(() => {
    const snap = getAuthSnapshot();
    if (lastAuthUid === undefined) {
      start();
      return;
    }
    if (snap.uid !== lastAuthUid) {
      lastAuthUid = snap.uid;
      // Identity changed — the shared channel re-subscribes itself; just
      // re-fetch the baseline under the new identity.
      scheduleRefetch();
    }
  });

  // Safety net: realtime is the primary path; a visible-tab poll bounds
  // worst-case staleness if the socket ever drops an event, and trims the
  // local mirror back to the query's window.
  const pollTimer = setInterval(() => {
    if (typeof document === "undefined" || document.visibilityState === "visible") {
      void fetchNow();
    }
  }, 12_000);

  return () => {
    disposed = true;
    if (refetchTimer) clearTimeout(refetchTimer);
    clearInterval(pollTimer);
    offAuth();
    offRealtime?.();
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
