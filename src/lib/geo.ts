"use client";

/**
 * Geo utilities: haversine distance, Nominatim geocoding, and a
 * browser geolocation hook that writes lat/lng to the user's
 * Firestore profile.
 */

import { useEffect, useRef } from "react";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { useAuth } from "./store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface GeoCoord {
  lat: number;
  lng: number;
}

export interface ManualLocation extends GeoCoord {
  label: string;
}

export type LocalChatVisibility = "everyone" | "radius";

/* ------------------------------------------------------------------ */
/* Haversine distance (miles)                                          */
/* ------------------------------------------------------------------ */

const R_MILES = 3958.8;

export function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R_MILES * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ------------------------------------------------------------------ */
/* Nominatim geocoding                                                 */
/* ------------------------------------------------------------------ */

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocode a city name, zip code, or address to lat/lng using the
 * free OpenStreetMap Nominatim API. Returns null if nothing matched.
 */
export async function geocodeLocation(
  query: string,
): Promise<{ lat: number; lng: number; label: string } | null> {
  if (!query.trim()) return null;
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: "json",
      limit: "1",
    });
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        headers: { "User-Agent": "AYMS-Community/1.0" },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    if (data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      label: data[0].display_name.split(",").slice(0, 3).join(",").trim(),
    };
  } catch (err) {
    console.warn("[geocode] failed", err);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Browser geolocation hook                                            */
/* ------------------------------------------------------------------ */

const GEO_REFRESH_MS = 30 * 60 * 1000; // 30 min

/**
 * Requests browser geolocation on mount, writes to Firestore, and
 * refreshes every 30 minutes. Falls back silently if denied.
 *
 * Also stores lat/lng in the Zustand auth store for immediate
 * client-side use (distance filtering).
 */
export function useGeoLocation(): void {
  const user = useAuth((s) => s.user);
  const lastWriteRef = useRef<number>(0);

  useEffect(() => {
    if (!user || typeof window === "undefined" || !("geolocation" in navigator))
      return;

    function writePosition(pos: GeolocationPosition) {
      const now = Date.now();
      if (now - lastWriteRef.current < GEO_REFRESH_MS) return;
      lastWriteRef.current = now;

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      // Update Zustand immediately so filters work without waiting
      // for the Firestore round-trip.
      useAuth.setState((s) => ({
        user: s.user ? { ...s.user, geoLat: lat, geoLng: lng } : s.user,
      }));

      // Persist to Firestore
      if (!isFirebaseConfigured || !user) return;
      const db = getDb();
      if (!db) return;
      void updateDoc(doc(db, "users", user.id), {
        geoLat: lat,
        geoLng: lng,
        geoUpdatedAt: serverTimestamp(),
      }).catch((err) =>
        console.warn("[geo] Firestore write failed", err),
      );
    }

    function requestPosition() {
      navigator.geolocation.getCurrentPosition(
        writePosition,
        () => {
          // Denied or error — silently fall back to manual locations
        },
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: GEO_REFRESH_MS },
      );
    }

    requestPosition();
    const interval = setInterval(requestPosition, GEO_REFRESH_MS);
    return () => clearInterval(interval);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Get the best available coordinates for the current user.
 * Priority: browser geo > first manual location > null.
 */
export function getUserCoords(user: {
  geoLat?: number;
  geoLng?: number;
  manualLocations?: ManualLocation[];
} | null): GeoCoord | null {
  if (!user) return null;
  if (user.geoLat != null && user.geoLng != null) {
    return { lat: user.geoLat, lng: user.geoLng };
  }
  if (user.manualLocations && user.manualLocations.length > 0) {
    return { lat: user.manualLocations[0].lat, lng: user.manualLocations[0].lng };
  }
  return null;
}

/**
 * Check if a coordinate is within a radius of any of the user's
 * known locations (browser geo + all manual locations).
 */
export function isWithinRadius(
  user: {
    geoLat?: number;
    geoLng?: number;
    manualLocations?: ManualLocation[];
    localRadiusMiles?: number;
  } | null,
  targetLat: number,
  targetLng: number,
  radiusOverride?: number,
): boolean {
  if (!user) return true; // no location = show everything
  const radius = radiusOverride ?? user.localRadiusMiles ?? 50;
  if (radius <= 0) return true;

  const locations: GeoCoord[] = [];
  if (user.geoLat != null && user.geoLng != null) {
    locations.push({ lat: user.geoLat, lng: user.geoLng });
  }
  if (user.manualLocations) {
    for (const ml of user.manualLocations) {
      locations.push({ lat: ml.lat, lng: ml.lng });
    }
  }
  if (locations.length === 0) return true; // no location = show everything

  return locations.some(
    (loc) => haversineDistance(loc.lat, loc.lng, targetLat, targetLng) <= radius,
  );
}
