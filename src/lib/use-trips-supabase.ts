"use client";

/**
 * Supabase implementation of useTrips. Delegated to from use-trips.ts
 * when useSupabaseBackend is on. Same return shape as the Firestore
 * version so consumers are untouched.
 */

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso } from "./supabase-helpers";
import { getCurrentUid } from "./firebase";
import { TRIPS_DATA, type Trip } from "./trips-data";
import { sortTrips, type UseTripsResult } from "./use-trips";

interface TripRow {
  id: string;
  title: string;
  destination: string;
  country: string;
  dates: string;
  duration: string;
  price: number;
  deposit: number;
  status: string;
  spots: number;
  spots_left: number;
  description: string;
  highlights: string[] | null;
  includes: string[] | null;
  not_included: string[] | null;
  emoji: string;
  gradient: string;
  image: string;
  published: boolean | null;
  featured: boolean | null;
  sort_order: number | null;
  booking_url: string | null;
  booking_label: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function asArray(v: string[] | null): string[] {
  return Array.isArray(v) ? v : [];
}

function rowToTrip(r: TripRow): Trip {
  return {
    id: r.id,
    title: r.title ?? "",
    destination: r.destination ?? "",
    country: r.country ?? "",
    dates: r.dates ?? "",
    duration: r.duration ?? "",
    price: r.price ?? 0,
    deposit: r.deposit ?? 0,
    status: (r.status as Trip["status"]) ?? "available",
    spots: r.spots ?? 0,
    spotsLeft: r.spots_left ?? 0,
    description: r.description ?? "",
    highlights: asArray(r.highlights),
    includes: asArray(r.includes),
    notIncluded: asArray(r.not_included),
    emoji: r.emoji ?? "",
    gradient: r.gradient ?? "",
    image: r.image ?? "",
    published: r.published ?? undefined,
    featured: r.featured ?? undefined,
    order: r.sort_order ?? undefined,
    bookingUrl: r.booking_url ?? undefined,
    bookingLabel: r.booking_label ?? undefined,
    createdBy: r.created_by ?? undefined,
    createdAt: tsToIso(r.created_at),
    updatedAt: tsToIso(r.updated_at),
  };
}

/** camelCase Trip field → snake_case trips column. */
const COL: Record<string, string> = {
  title: "title",
  destination: "destination",
  country: "country",
  dates: "dates",
  duration: "duration",
  price: "price",
  deposit: "deposit",
  status: "status",
  spots: "spots",
  spotsLeft: "spots_left",
  description: "description",
  highlights: "highlights",
  includes: "includes",
  notIncluded: "not_included",
  emoji: "emoji",
  gradient: "gradient",
  image: "image",
  published: "published",
  featured: "featured",
  order: "sort_order",
  bookingUrl: "booking_url",
  bookingLabel: "booking_label",
  createdBy: "created_by",
};

function tripToRow(t: Partial<Trip>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(t)) {
    const col = COL[k];
    if (col) row[col] = v === undefined ? null : v;
  }
  return row;
}

let seeded = false;
async function seedIfEmpty(): Promise<void> {
  if (seeded) return;
  const sb = getSupabase();
  if (!sb) return;
  seeded = true;
  try {
    const { count } = await sb
      .from("trips")
      .select("id", { count: "exact", head: true });
    if ((count ?? 0) > 0) return;
    const rows = TRIPS_DATA.map((t, i) => ({
      id: t.id,
      ...tripToRow({ ...t, published: true, featured: false, order: i }),
    }));
    await sb.from("trips").upsert(rows);
  } catch (err) {
    console.warn("[trips:sb] seed failed", err);
    seeded = false;
  }
}

export function useTripsSupabase(): UseTripsResult {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void seedIfEmpty();
    const unsub = subscribeQuery<TripRow>(
      "trips",
      (sb) => sb.from("trips").select("*").limit(500),
      (rows) => {
        setTrips(sortTrips(rows.map(rowToTrip)));
        setLoading(false);
      },
      (msg) => {
        console.warn("[trips:sb] query failed", msg);
        setTrips(sortTrips(TRIPS_DATA));
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const addTrip = useCallback(
    async (
      t: Omit<Trip, "id" | "createdAt" | "updatedAt">,
    ): Promise<string | null> => {
      const sb = getSupabase();
      if (!sb) return null;
      const id = `trip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await sb.from("trips").insert({
        id,
        ...tripToRow(t),
        created_by: getCurrentUid() ?? null,
      });
      if (error) {
        console.error("[trips:sb] add failed", error.message);
        return null;
      }
      return id;
    },
    [],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<Trip>): Promise<boolean> => {
      const sb = getSupabase();
      if (!sb) return false;
      const { id: _id, createdAt: _ca, createdBy: _cb, ...rest } = patch;
      void _id;
      void _ca;
      void _cb;
      const row = tripToRow(rest);
      row.updated_at = new Date().toISOString();
      const { error } = await sb.from("trips").update(row).eq("id", id);
      if (error) {
        console.error("[trips:sb] update failed", error.message);
        return false;
      }
      return true;
    },
    [],
  );

  const deleteTrip = useCallback(async (id: string): Promise<boolean> => {
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("trips").delete().eq("id", id);
    if (error) {
      console.error("[trips:sb] delete failed", error.message);
      return false;
    }
    return true;
  }, []);

  return { trips, loading, isFirestore: true, addTrip, updateTrip, deleteTrip };
}
