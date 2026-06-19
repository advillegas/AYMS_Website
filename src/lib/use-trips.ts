"use client";

/**
 * Firestore-backed travel trips with realtime subscription, CRUD
 * mutations, and automatic seed migration from the static TRIPS_DATA
 * array.
 *
 * This is the live source of truth for every trip on the site. The
 * marketing /trips page, homepage spotlight, reservation flow and the
 * admin CRM all read from here, so a trip an admin creates/edits/
 * publishes shows up everywhere instantly — there are no standalone
 * hardcoded trips anymore. When Firestore isn't configured the hook
 * falls back to the static seed so the marketing site still renders.
 *
 * Mirrors the architecture of use-events.ts (Firebase hook + Supabase
 * mirror + dual-run dispatch).
 */

import { useEffect, useState, useCallback } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, getCurrentUid, isFirebaseConfigured } from "./firebase";
import { useSupabaseBackend } from "./supabase";
import { useTripsSupabase } from "./use-trips-supabase";
import { TRIPS_DATA, type Trip } from "./trips-data";

export type { Trip };

/* ------------------------------------------------------------------ */
/* Firestore schema                                                    */
/* ------------------------------------------------------------------ */

interface FirestoreTripDoc {
  title?: string;
  destination?: string;
  country?: string;
  dates?: string;
  duration?: string;
  price?: number;
  deposit?: number;
  status?: string;
  spots?: number;
  spotsLeft?: number;
  description?: string;
  highlights?: string[];
  includes?: string[];
  notIncluded?: string[];
  emoji?: string;
  gradient?: string;
  image?: string;
  published?: boolean;
  featured?: boolean;
  order?: number;
  bookingUrl?: string;
  bookingLabel?: string;
  createdBy?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

function tsToIso(t: Timestamp | undefined | null): string {
  if (!t) return "";
  try {
    return t.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToTrip(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): Trip {
  const data = d.data() as FirestoreTripDoc;
  return {
    id: d.id,
    title: data.title ?? "",
    destination: data.destination ?? "",
    country: data.country ?? "",
    dates: data.dates ?? "",
    duration: data.duration ?? "",
    price: data.price ?? 0,
    deposit: data.deposit ?? 0,
    status: (data.status as Trip["status"]) ?? "available",
    spots: data.spots ?? 0,
    spotsLeft: data.spotsLeft ?? 0,
    description: data.description ?? "",
    highlights: Array.isArray(data.highlights) ? data.highlights : [],
    includes: Array.isArray(data.includes) ? data.includes : [],
    notIncluded: Array.isArray(data.notIncluded) ? data.notIncluded : [],
    emoji: data.emoji ?? "",
    gradient: data.gradient ?? "",
    image: data.image ?? "",
    published: data.published ?? undefined,
    featured: data.featured ?? undefined,
    order: data.order ?? undefined,
    bookingUrl: data.bookingUrl ?? undefined,
    bookingLabel: data.bookingLabel ?? undefined,
    createdBy: data.createdBy,
    createdAt: tsToIso(data.createdAt),
    updatedAt: tsToIso(data.updatedAt),
  };
}

/** Build the Firestore field map for a trip (shared by seed + add). */
function tripToDoc(t: Partial<Trip>): Record<string, unknown> {
  return {
    title: t.title ?? "",
    destination: t.destination ?? "",
    country: t.country ?? "",
    dates: t.dates ?? "",
    duration: t.duration ?? "",
    price: t.price ?? 0,
    deposit: t.deposit ?? 0,
    status: t.status ?? "available",
    spots: t.spots ?? 0,
    spotsLeft: t.spotsLeft ?? 0,
    description: t.description ?? "",
    highlights: t.highlights ?? [],
    includes: t.includes ?? [],
    notIncluded: t.notIncluded ?? [],
    emoji: t.emoji ?? "",
    gradient: t.gradient ?? "",
    image: t.image ?? "",
    published: t.published ?? true,
    featured: t.featured ?? false,
    order: t.order ?? 0,
    ...(t.bookingUrl !== undefined ? { bookingUrl: t.bookingUrl } : {}),
    ...(t.bookingLabel !== undefined ? { bookingLabel: t.bookingLabel } : {}),
  };
}

/** Stable public ordering: explicit `order` asc, then title. */
export function sortTrips(list: Trip[]): Trip[] {
  return [...list].sort((a, b) => {
    const ao = a.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return a.title.localeCompare(b.title);
  });
}

/* ------------------------------------------------------------------ */
/* Seed migration                                                      */
/* ------------------------------------------------------------------ */

let seeded = false;

async function seedIfEmpty(): Promise<void> {
  if (seeded || !isFirebaseConfigured) return;
  const db = getDb();
  if (!db) return;
  seeded = true;
  try {
    const snap = await getDocs(query(collection(db, "trips"), limit(1)));
    if (!snap.empty) return;
    let i = 0;
    for (const t of TRIPS_DATA) {
      await setDoc(doc(db, "trips", t.id), {
        ...tripToDoc({ ...t, published: true, featured: false, order: i }),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      i += 1;
    }
    console.debug("[trips] seeded Firestore with TRIPS_DATA");
  } catch (err) {
    console.warn("[trips] seed failed", err);
    seeded = false;
  }
}

/* ------------------------------------------------------------------ */
/* Public hook                                                         */
/* ------------------------------------------------------------------ */

export interface UseTripsResult {
  trips: Trip[];
  loading: boolean;
  isFirestore: boolean;
  addTrip: (t: Omit<Trip, "id" | "createdAt" | "updatedAt">) => Promise<string | null>;
  updateTrip: (id: string, patch: Partial<Trip>) => Promise<boolean>;
  deleteTrip: (id: string) => Promise<boolean>;
}

export function useTrips(): UseTripsResult {
  return useSupabaseBackend ? useTripsSupabase() : useTripsFirebase();
}

function useTripsFirebase(): UseTripsResult {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const isFirestore = isFirebaseConfigured;

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setTrips(sortTrips(TRIPS_DATA));
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setTrips(sortTrips(TRIPS_DATA));
      setLoading(false);
      return;
    }
    void seedIfEmpty();
    const q = query(collection(db, "trips"), limit(500));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTrips(sortTrips(snap.docs.map(docToTrip)));
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[trips] snapshot failed", err);
        setTrips(sortTrips(TRIPS_DATA));
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  const addTrip = useCallback(
    async (
      t: Omit<Trip, "id" | "createdAt" | "updatedAt">,
    ): Promise<string | null> => {
      if (!isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      try {
        const ref = await addDoc(collection(db, "trips"), {
          ...tripToDoc(t),
          createdBy: getCurrentUid() ?? null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[trips] add failed", err);
        return null;
      }
    },
    [],
  );

  const updateTrip = useCallback(
    async (id: string, patch: Partial<Trip>): Promise<boolean> => {
      if (!isFirebaseConfigured) return false;
      const db = getDb();
      if (!db) return false;
      try {
        const { id: _id, createdAt: _ca, createdBy: _cb, ...rest } = patch;
        void _id;
        void _ca;
        void _cb;
        // Firestore rejects `undefined` — convert to null so the field is
        // explicitly cleared instead of skipped.
        const cleaned: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(rest)) {
          cleaned[k] = v === undefined ? null : v;
        }
        cleaned.updatedAt = serverTimestamp();
        await updateDoc(doc(db, "trips", id), cleaned);
        return true;
      } catch (err) {
        console.error("[trips] update failed", err);
        return false;
      }
    },
    [],
  );

  const deleteTrip = useCallback(async (id: string): Promise<boolean> => {
    if (!isFirebaseConfigured) return false;
    const db = getDb();
    if (!db) return false;
    try {
      await deleteDoc(doc(db, "trips", id));
      return true;
    } catch (err) {
      console.error("[trips] delete failed", err);
      return false;
    }
  }, []);

  return { trips, loading, isFirestore, addTrip, updateTrip, deleteTrip };
}
