"use client";

/**
 * Travel Passport — a member's self-declared collection of places they
 * have been. Backed by a Firestore subcollection at
 * `users/{uid}/passport/{stampId}`.
 *
 * There is no attendance/RSVP source of truth in the product, so the
 * passport is an identity artifact rather than a verified ledger: stamps
 * are member-declared (picked from real trips or free-added). This is
 * the most identity-affirming object we can give this community — a map
 * of where they've been, told in their own voice.
 *
 * Mirrors the house data-layer pattern (see use-event-comments.ts):
 * graceful no-op fallback when Firebase isn't configured, onSnapshot
 * without orderBy (sorted client-side, no composite index), bounded
 * subcollection read, serverTimestamp, undefined → null on write.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery, nowIso, tsToIso as sbTsToIso } from "./supabase-helpers";
import type { PassportStamp } from "./game-data";

interface FirestorePassportDoc {
  tripId?: string | null;
  country?: string;
  city?: string | null;
  label?: string;
  emoji?: string;
  year?: number;
  note?: string | null;
  photoUrl?: string | null;
  addedAt?: Timestamp;
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToStamp(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): PassportStamp {
  const data = d.data() as FirestorePassportDoc;
  return {
    id: d.id,
    tripId: data.tripId ?? undefined,
    country: data.country ?? "",
    city: data.city ?? undefined,
    label: data.label ?? data.country ?? "Somewhere wonderful",
    emoji: data.emoji ?? "🌍",
    year: typeof data.year === "number" ? data.year : new Date().getFullYear(),
    note: data.note ?? undefined,
    photoUrl: data.photoUrl ?? undefined,
    addedAt: tsToIso(data.addedAt),
  };
}

/* Supabase mirror: passport_stamps rows keyed by user_id. */

interface StampRow {
  id: string;
  user_id: string;
  trip_id: string | null;
  country: string | null;
  city: string | null;
  label: string | null;
  emoji: string | null;
  year: number | null;
  note: string | null;
  photo_url: string | null;
  added_at: string | null;
}

function rowToStamp(r: StampRow): PassportStamp {
  return {
    id: r.id,
    tripId: r.trip_id ?? undefined,
    country: r.country ?? "",
    city: r.city ?? undefined,
    label: r.label ?? r.country ?? "Somewhere wonderful",
    emoji: r.emoji ?? "🌍",
    year: typeof r.year === "number" ? r.year : new Date().getFullYear(),
    note: r.note ?? undefined,
    photoUrl: r.photo_url ?? undefined,
    addedAt: sbTsToIso(r.added_at),
  };
}

/** A new stamp without server-managed fields. */
export type NewStamp = Omit<PassportStamp, "id" | "addedAt">;

export interface UsePassportResult {
  stamps: PassportStamp[];
  /** Distinct countries, useful for badges + wrapped. */
  countries: string[];
  loading: boolean;
  error: string | null;
  isFirebase: boolean;
  /** Persist a new stamp; resolves to the new id (or null on failure). */
  addStamp: (stamp: NewStamp) => Promise<string | null>;
  removeStamp: (stampId: string) => Promise<boolean>;
}

/**
 * Live subscription to a user's passport. Pass the profile owner's uid
 * so it works on both the self page and other members' pages. Writes
 * are only meaningful for the signed-in user's own passport (enforced
 * by the UI + Firestore rules).
 */
export function usePassport(uid: string | null | undefined): UsePassportResult {
  const [stamps, setStamps] = useState<PassportStamp[]>([]);
  const [loading, setLoading] = useState<boolean>(
    Boolean(uid) && (isFirebaseConfigured || useSupabaseBackend),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!uid || !(isFirebaseConfigured || useSupabaseBackend)) {
      setStamps([]);
      setLoading(false);
      setError(null);
      return;
    }
    if (useSupabaseBackend) {
      setLoading(true);
      setError(null);
      return subscribeQuery<StampRow>(
        "passport_stamps",
        (sb) =>
          sb.from("passport_stamps").select("*").eq("user_id", uid).limit(200),
        (rows) => {
          const list = rows.map(rowToStamp).sort((a, b) => {
            // Newest year first; within a year, most-recently-added first.
            if (b.year !== a.year) return b.year - a.year;
            return (b.addedAt || "").localeCompare(a.addedAt || "");
          });
          setStamps(list);
          setLoading(false);
        },
        (msg) => {
          console.error("[passport:sb]", msg);
          setError(msg);
          setLoading(false);
        },
        { column: "user_id", value: uid },
      );
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    // No orderBy → no composite index. The subcollection is keyed by
    // uid so the read is naturally bounded; limit() is a backstop.
    const q = query(collection(db, "users", uid, "passport"), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map(docToStamp).sort((a, b) => {
          // Newest year first; within a year, most-recently-added first.
          if (b.year !== a.year) return b.year - a.year;
          const ta = a.addedAt || "";
          const tb = b.addedAt || "";
          return tb.localeCompare(ta);
        });
        setStamps(list);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[passport]", err);
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  const countries = useMemo(
    () => Array.from(new Set(stamps.map((s) => s.country).filter(Boolean))),
    [stamps],
  );

  const addStamp = useCallback(
    async (stamp: NewStamp): Promise<string | null> => {
      if (!uid || !(isFirebaseConfigured || useSupabaseBackend)) return null;
      // Validate at the boundary: a stamp must name a place.
      const country = stamp.country?.trim();
      const label = stamp.label?.trim();
      if (!country && !label) return null;
      if (useSupabaseBackend) {
        const sb = getSupabase();
        if (!sb) return null;
        const id = `stamp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const { error: e } = await sb.from("passport_stamps").insert({
          id,
          user_id: uid,
          trip_id: stamp.tripId ?? null,
          country: country ?? "",
          city: stamp.city?.trim() || null,
          label: label || country || "Somewhere wonderful",
          emoji: stamp.emoji || "🌍",
          year: stamp.year ?? new Date().getFullYear(),
          note: stamp.note?.trim() || null,
          photo_url: stamp.photoUrl?.trim() || null,
          added_at: nowIso(),
        });
        if (e) {
          console.error("[passport:sb] add failed", e.message);
          setError(e.message);
          return null;
        }
        return id;
      }
      const db = getDb();
      if (!db) return null;
      try {
        const ref = await addDoc(collection(db, "users", uid, "passport"), {
          tripId: stamp.tripId ?? null,
          country: country ?? "",
          city: stamp.city?.trim() || null,
          label: label || country || "Somewhere wonderful",
          emoji: stamp.emoji || "🌍",
          year: stamp.year ?? new Date().getFullYear(),
          note: stamp.note?.trim() || null,
          photoUrl: stamp.photoUrl?.trim() || null,
          addedAt: serverTimestamp(),
        });
        return ref.id;
      } catch (err) {
        console.error("[passport] add failed", err);
        setError(err instanceof Error ? err.message : "Couldn't add stamp");
        return null;
      }
    },
    [uid],
  );

  const removeStamp = useCallback(
    async (stampId: string): Promise<boolean> => {
      if (!uid || !(isFirebaseConfigured || useSupabaseBackend) || !stampId)
        return false;
      if (useSupabaseBackend) {
        const sb = getSupabase();
        if (!sb) return false;
        const { error: e } = await sb
          .from("passport_stamps")
          .delete()
          .eq("id", stampId)
          .eq("user_id", uid);
        if (e) {
          console.error("[passport:sb] remove failed", e.message);
          return false;
        }
        return true;
      }
      const db = getDb();
      if (!db) return false;
      try {
        await deleteDoc(doc(db, "users", uid, "passport", stampId));
        return true;
      } catch (err) {
        console.error("[passport] remove failed", err);
        return false;
      }
    },
    [uid],
  );

  return {
    stamps,
    countries,
    loading,
    error,
    isFirebase: isFirebaseConfigured || useSupabaseBackend,
    addStamp,
    removeStamp,
  };
}
