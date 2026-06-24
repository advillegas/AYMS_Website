"use client";

/**
 * Supabase persistence for the channels store. Replaces the Firestore
 * config/channels document with the public.channels table when
 * useSupabaseBackend is on. Same diff-write semantics as roles.
 */

import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
import { ensureSupabaseSession } from "./ensure-session";
import type { RichChannel } from "./use-channels-store";

interface ChannelRow {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  type: string;
  restricted_role_ids: string[];
  archived: boolean;
  position: number;
  created_by: string | null;
  geo_locations: RichChannel["geoLocations"] | null;
  geo_radius_miles: number | null;
  is_geo_channel: boolean;
  created_at: string | null;
}

function rowToChannel(r: ChannelRow): RichChannel {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? "",
    icon: r.icon ?? "#",
    category: r.category as RichChannel["category"],
    type: r.type as RichChannel["type"],
    restrictedRoleIds: r.restricted_role_ids ?? [],
    archived: r.archived ?? false,
    position: r.position ?? 0,
    createdAt: r.created_at ? new Date(r.created_at).getTime() : Date.now(),
    createdBy: r.created_by ?? undefined,
    geoLocations: r.geo_locations ?? undefined,
    geoRadiusMiles: r.geo_radius_miles ?? undefined,
    isGeoChannel: r.is_geo_channel ?? false,
  };
}

function channelToRow(c: RichChannel): ChannelRow {
  return {
    id: c.id,
    name: c.name,
    description: c.description ?? "",
    icon: c.icon ?? "#",
    category: c.category,
    type: c.type,
    restricted_role_ids: c.restrictedRoleIds ?? [],
    archived: c.archived ?? false,
    position: c.position ?? 0,
    created_by: c.createdBy ?? null,
    geo_locations: c.geoLocations ?? null,
    geo_radius_miles: c.geoRadiusMiles ?? null,
    is_geo_channel: c.isGeoChannel ?? false,
    created_at: new Date(c.createdAt ?? Date.now()).toISOString(),
  };
}

export async function writeChannelsToSupabase(
  channels: RichChannel[],
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    // Guarantee an authenticated session first — a lapsed token drops the
    // client to `anon` and RLS silently rejects the write, so a newly
    // created channel never persists ("attempts fail and changes aren't saved").
    await ensureSupabaseSession(sb);
    // UPSERT ONLY. We deliberately do NOT prune rows missing from `channels`.
    //
    // A previous version deleted every row whose id wasn't in this list. That
    // turned the channels table into a mirror of whatever list it was handed —
    // so ANY client that wrote a stale/partial list (e.g. a freshly-hydrated
    // browser still holding only the default channels) silently DELETED every
    // admin-created channel for everyone. Deletions now happen one id at a time
    // through deleteChannelFromSupabase, only on an explicit hard delete.
    const { error: upErr } = await sb
      .from("channels")
      .upsert(channels.map(channelToRow));
    if (upErr) {
      console.warn("[channels:sb] upsert failed", upErr.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[channels:sb] write failed", err);
    return false;
  }
}

/**
 * Hard-delete a single channel row. This is the ONLY path that removes a
 * channel from Supabase — called from the store's deleteChannel(id, hard)
 * so a deletion is always an explicit, single-id action, never a side effect
 * of writing the full list.
 */
export async function deleteChannelFromSupabase(id: string): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    await ensureSupabaseSession(sb);
    const { error } = await sb.from("channels").delete().eq("id", id);
    if (error) {
      console.warn("[channels:sb] delete failed", id, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[channels:sb] delete threw", err);
    return false;
  }
}

export async function seedSupabaseChannelsIfEmpty(
  defaults: RichChannel[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data, error } = await sb.from("channels").select("id");
    // CRITICAL: a failed read must NOT be treated as "table is empty". Doing so
    // previously re-seeded defaults over a populated table. Bail on any error.
    if (error) {
      console.warn("[channels:sb] seed read failed; skipping seed", error.message);
      return;
    }
    const existing = new Set((data ?? []).map((r: { id: string }) => r.id));
    const missing = defaults.filter((d) => !existing.has(d.id));
    if (existing.size === 0) {
      // Only seed when the table is genuinely empty (read succeeded, 0 rows).
      await writeChannelsToSupabase(defaults);
    } else if (missing.length > 0) {
      // Merge any newly-added system channels (e.g. #local) without touching
      // existing rows.
      await sb.from("channels").upsert(missing.map(channelToRow));
    }
  } catch (err) {
    console.warn("[channels:sb] seed failed", err);
  }
}

export function useChannelsSyncSupabase(
  setChannels: (channels: RichChannel[]) => void,
  defaults: RichChannel[],
  onSynced?: () => void,
): void {
  useEffect(() => {
    void seedSupabaseChannelsIfEmpty(defaults);
    const unsub = subscribeQuery<ChannelRow>(
      "channels",
      (sb) => sb.from("channels").select("*").order("position", { ascending: true }),
      (rows) => {
        // We've heard the server's truth — unblock local write-through.
        onSynced?.();
        if (rows.length > 0) setChannels(rows.map(rowToChannel));
      },
      (msg) => console.warn("[channels:sb] sync failed", msg),
    );
    return unsub;
    // defaults is a module constant; setChannels is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
