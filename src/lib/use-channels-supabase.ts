"use client";

/**
 * Supabase persistence for the channels store. Replaces the Firestore
 * config/channels document with the public.channels table when
 * useSupabaseBackend is on. Same diff-write semantics as roles.
 */

import { useEffect } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery } from "./supabase-helpers";
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
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    await sb.from("channels").upsert(channels.map(channelToRow));
    const keep = channels.map((c) => c.id);
    if (keep.length > 0) {
      await sb
        .from("channels")
        .delete()
        .not("id", "in", `(${keep.map((id) => `"${id}"`).join(",")})`);
    }
  } catch (err) {
    console.warn("[channels:sb] write failed", err);
  }
}

export async function seedSupabaseChannelsIfEmpty(
  defaults: RichChannel[],
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  try {
    const { data } = await sb.from("channels").select("id");
    const existing = new Set((data ?? []).map((r: { id: string }) => r.id));
    const missing = defaults.filter((d) => !existing.has(d.id));
    if (existing.size === 0) {
      await writeChannelsToSupabase(defaults);
    } else if (missing.length > 0) {
      // Merge any newly-added system channels (e.g. #local).
      await sb.from("channels").upsert(missing.map(channelToRow));
    }
  } catch (err) {
    console.warn("[channels:sb] seed failed", err);
  }
}

export function useChannelsSyncSupabase(
  setChannels: (channels: RichChannel[]) => void,
  defaults: RichChannel[],
): void {
  useEffect(() => {
    void seedSupabaseChannelsIfEmpty(defaults);
    const unsub = subscribeQuery<ChannelRow>(
      "channels",
      (sb) => sb.from("channels").select("*").order("position", { ascending: true }),
      (rows) => {
        if (rows.length > 0) setChannels(rows.map(rowToChannel));
      },
      (msg) => console.warn("[channels:sb] sync failed", msg),
    );
    return unsub;
    // defaults is a module constant; setChannels is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
