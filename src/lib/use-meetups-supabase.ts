"use client";

/**
 * Supabase implementation of useMeetups. Delegated to from
 * use-meetups.ts when useSupabaseBackend is on. Same return shape as
 * the Firestore version so consumers are untouched.
 *
 * Meetups live in the flat `meetups` table; attendees stay in the
 * shared `rsvps` table (see use-rsvps-supabase.ts with targetType
 * "meetup"), preserving the one-attendee-model design.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso, nowIso } from "./supabase-helpers";
import { ensureSupabaseSession } from "./ensure-session";
import { useAuth } from "./store";
import { geocodeLocation } from "./geo";
import type { Meetup, MeetupInput, UseMeetupsResult } from "./use-meetups";

interface MeetupRow {
  id: string;
  title: string;
  description: string;
  date: string | null;
  start_time: string | null;
  location: string;
  lat: number | null;
  lng: number | null;
  host_id: string;
  host_name: string | null;
  host_avatar: string | null;
  capacity: number | null;
  link: string | null;
  link_label: string | null;
  created_at: string | null;
}

function rowToMeetup(r: MeetupRow): Meetup {
  return {
    id: r.id,
    title: r.title ?? "",
    description: r.description ?? "",
    date: r.date ?? "",
    startTime: r.start_time ?? undefined,
    location: r.location ?? "",
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    hostId: r.host_id ?? "",
    hostName: r.host_name ?? "Amiga",
    hostAvatar: r.host_avatar ?? undefined,
    capacity: r.capacity ?? undefined,
    link: r.link ?? undefined,
    linkLabel: r.link_label ?? undefined,
    createdAt: tsToIso(r.created_at),
  };
}

export function useMeetupsSupabase(): UseMeetupsResult {
  const user = useAuth((s) => s.user);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeQuery<MeetupRow>(
      "meetups",
      (sb) => sb.from("meetups").select("*").limit(500),
      (rows) => {
        setMeetups(
          rows
            .map(rowToMeetup)
            .filter((m) => m.date)
            .sort((a, b) => a.date.localeCompare(b.date)),
        );
        setLoading(false);
      },
      (msg) => {
        console.warn("[meetups:sb] query failed", msg);
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const createMeetup = useCallback(
    async (input: MeetupInput): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb || !user) return null;
      await ensureSupabaseSession(sb);

      // Resolve coordinates: use supplied lat/lng, else geocode the
      // free-text location. A failed geocode still creates the meetup
      // (lat/lng null) so the listing never silently swallows it — it
      // just won't participate in distance sorting.
      let lat = input.lat ?? null;
      let lng = input.lng ?? null;
      if ((lat == null || lng == null) && input.location.trim()) {
        const geo = await geocodeLocation(input.location);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      // host_id carries the canonical users.id (store id) — RLS maps
      // the JWT to it, so never substitute the Supabase auth uid here.
      const id = `mu-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await sb.from("meetups").insert({
        id,
        title: input.title.trim(),
        description: input.description.trim(),
        date: input.date,
        start_time: input.startTime?.trim() || null,
        location: input.location.trim(),
        lat,
        lng,
        host_id: user.id,
        host_name: user.name,
        host_avatar: user.avatar ?? null,
        capacity: input.capacity ?? null,
        link: input.link?.trim() || null,
        link_label: input.linkLabel?.trim() || null,
        created_at: nowIso(),
      });
      if (error) {
        console.error("[meetups:sb] create failed", error.message);
        return null;
      }
      return id;
    },
    [user],
  );

  const updateMeetup = useCallback(
    async (id: string, patch: Partial<MeetupInput>): Promise<boolean> => {
      const sb = getSupabase();
      if (!sb) return false;
      await ensureSupabaseSession(sb);
      // Presence-based (`in`) checks so an explicit `undefined` CLEARS an
      // optional field (start time, capacity, link) — the admin edit dialog
      // sends blanked fields as undefined and expects them to unset.
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title.trim();
      if (patch.description !== undefined)
        row.description = patch.description.trim();
      if (patch.date !== undefined) row.date = patch.date;
      if ("startTime" in patch)
        row.start_time = patch.startTime?.trim() || null;
      if ("capacity" in patch) row.capacity = patch.capacity ?? null;
      if ("link" in patch) row.link = patch.link?.trim() || null;
      if ("linkLabel" in patch)
        row.link_label = patch.linkLabel?.trim() || null;
      // Re-geocode when the location changes.
      if (patch.location !== undefined) {
        row.location = patch.location.trim();
        const geo = patch.location.trim()
          ? await geocodeLocation(patch.location)
          : null;
        row.lat = geo?.lat ?? null;
        row.lng = geo?.lng ?? null;
      }
      // `.select("id")` makes RLS rejections observable: a filtered update
      // affects 0 rows with NO error, which used to read as success while
      // the change silently never persisted.
      const { data, error } = await sb
        .from("meetups")
        .update(row)
        .eq("id", id)
        .select("id");
      if (error) {
        console.error("[meetups:sb] update failed", error.message);
        return false;
      }
      if (!data || data.length === 0) {
        console.error("[meetups:sb] update matched no rows (RLS or missing id)", id);
        return false;
      }
      return true;
    },
    [],
  );

  const deleteMeetup = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    await ensureSupabaseSession(sb);
    // `.select("id")` so an RLS-filtered delete (0 rows, no error) reads as
    // the failure it is — without it the admin saw "Deleted" while the row
    // survived and reappeared on the next poll.
    const { data, error } = await sb
      .from("meetups")
      .delete()
      .eq("id", id)
      .select("id");
    if (error) {
      console.error("[meetups:sb] delete failed", error.message);
      return false;
    }
    if (!data || data.length === 0) {
      console.error("[meetups:sb] delete matched no rows (RLS or missing id)", id);
      return false;
    }
    return true;
  }, []);

  return {
    meetups,
    loading,
    isFirebase: true,
    createMeetup,
    updateMeetup,
    deleteMeetup,
  };
}
