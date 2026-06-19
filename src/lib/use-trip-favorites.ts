"use client";

/**
 * Trip favorites — the "saved trips" heart on trip cards.
 *
 * A favorite is one row per (user, trip). It doubles as an email-subscription
 * intent: the owner can read trip_favorites to see who wants updates about a
 * trip (price drops, new dates) and email them once an ESP is connected.
 *
 * Saved trips also surface under My Events ("Saved") and fire an in-app
 * notification on save.
 *
 * Dual backend (Supabase primary, Firestore fallback) mirroring
 * use-trip-reservations. Logged-out viewers get an empty list and toggling
 * is a no-op the caller turns into a sign-in prompt.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery, tsToIso, nowIso } from "./supabase-helpers";
import { useAuth } from "./store";
import { pushNotification } from "./notify";
import { getTripById, type Trip } from "./trips-data";

/**
 * Make sure the Supabase client has a live session before an authenticated
 * write. On public marketing pages (e.g. /trips) a signed-in member's token
 * may have lapsed; getSession() refreshes an expired token, and the
 * password-admin's bridge session is silently re-minted (same path as
 * useAdminSessionRecovery). Without this, writes silently run as `anon` and
 * RLS rejects them.
 */
async function ensureSupabaseSession(sb: SupabaseClient): Promise<void> {
  try {
    const { data } = await sb.auth.getSession();
    if (data.session) return;
    if (useAuth.getState().user?.id !== "admin") return;
    const res = await fetch("/api/auth/admin-session", { method: "POST" });
    if (!res.ok) return;
    const j = (await res.json()) as {
      ok?: boolean;
      access_token?: string;
      refresh_token?: string;
    };
    if (j?.ok && j.access_token && j.refresh_token) {
      await sb.auth.setSession({
        access_token: j.access_token,
        refresh_token: j.refresh_token,
      });
    }
  } catch {
    /* best effort — the write below will surface a clear error if still anon */
  }
}

export interface TripFavorite {
  tripId: string;
  /** ISO timestamp; "" until a serverTimestamp resolves. */
  createdAt: string;
}

/** What a favoritable trip needs to provide (cards pass the full Trip). */
type FavTripInput = Pick<Trip, "id" | "title">;

export interface UseTripFavoritesResult {
  favorites: TripFavorite[];
  favoriteIds: Set<string>;
  isFavorited: (tripId: string) => boolean;
  loading: boolean;
  /**
   * Toggle a trip's saved state. Returns the new state (true = saved),
   * or null when there's no signed-in user (caller shows a sign-in prompt).
   */
  toggle: (trip: FavTripInput) => Promise<boolean | null>;
}

function savedNotification(uid: string, title: string) {
  void pushNotification(uid, {
    kind: "system",
    title: `Saved ${title} ❤`,
    body: "Added to My Events. We'll keep you posted on new dates, price drops, and updates.",
    href: "/community/my-events",
  });
}

/* ------------------------------------------------------------------ */
/* Facade                                                              */
/* ------------------------------------------------------------------ */

export function useTripFavorites(): UseTripFavoritesResult {
  return useSupabaseBackend
    ? useTripFavoritesSupabase()
    : useTripFavoritesFirebase();
}

/* ------------------------------------------------------------------ */
/* Supabase                                                           */
/* ------------------------------------------------------------------ */

interface FavoriteRow {
  user_id: string;
  trip_id: string;
  created_at: string | null;
}

function useTripFavoritesSupabase(): UseTripFavoritesResult {
  const uid = useAuth((s) => s.user?.id) ?? null;
  const [favorites, setFavorites] = useState<TripFavorite[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(uid));

  useEffect(() => {
    if (!uid) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<FavoriteRow>(
      "trip_favorites",
      (sb) => sb.from("trip_favorites").select("*").eq("user_id", uid),
      (rows) => {
        setFavorites(
          rows
            .map((r) => ({ tripId: r.trip_id, createdAt: tsToIso(r.created_at) }))
            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
        );
        setLoading(false);
      },
      (msg) => {
        console.warn("[trip-favorites:sb] query failed", msg);
        setLoading(false);
      },
      { column: "user_id", value: uid },
    );
    return unsub;
  }, [uid]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.tripId)),
    [favorites],
  );

  const toggle = useCallback(
    async (trip: FavTripInput): Promise<boolean | null> => {
      if (!uid) return null;
      const sb = getSupabase();
      if (!sb) return null;
      const has = favoriteIds.has(trip.id);
      // Optimistic update so the heart responds instantly; realtime confirms.
      setFavorites((prev) =>
        has
          ? prev.filter((f) => f.tripId !== trip.id)
          : [{ tripId: trip.id, createdAt: nowIso() }, ...prev],
      );
      try {
        await ensureSupabaseSession(sb);
        if (has) {
          const { error } = await sb
            .from("trip_favorites")
            .delete()
            .eq("user_id", uid)
            .eq("trip_id", trip.id);
          if (error) throw new Error(error.message);
        } else {
          // upsert (not insert) so a stale duplicate row never errors.
          const { error } = await sb
            .from("trip_favorites")
            .upsert(
              { user_id: uid, trip_id: trip.id },
              { onConflict: "user_id,trip_id" },
            );
          if (error) throw new Error(error.message);
          savedNotification(uid, trip.title);
        }
        return !has;
      } catch (err) {
        console.error("[trip-favorites:sb] toggle failed", err);
        // Revert the optimistic change and surface the real reason.
        setFavorites((prev) =>
          has
            ? [{ tripId: trip.id, createdAt: nowIso() }, ...prev]
            : prev.filter((f) => f.tripId !== trip.id),
        );
        throw err instanceof Error ? err : new Error("Save failed");
      }
    },
    [uid, favoriteIds],
  );

  return {
    favorites,
    favoriteIds,
    isFavorited: (id: string) => favoriteIds.has(id),
    loading,
    toggle,
  };
}

/* ------------------------------------------------------------------ */
/* Firestore fallback                                                 */
/* ------------------------------------------------------------------ */

interface FavoriteDoc {
  tripId?: string;
  userId?: string;
  createdAt?: Timestamp;
}

function fsTimestampToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToFavorite(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): TripFavorite {
  const data = d.data() as FavoriteDoc;
  return { tripId: data.tripId ?? "", createdAt: fsTimestampToIso(data.createdAt) };
}

function useTripFavoritesFirebase(): UseTripFavoritesResult {
  const uid = useAuth((s) => s.user?.id) ?? null;
  const [favorites, setFavorites] = useState<TripFavorite[]>([]);
  const [loading, setLoading] = useState<boolean>(
    Boolean(uid) && isFirebaseConfigured,
  );

  useEffect(() => {
    if (!uid || !isFirebaseConfigured) {
      setFavorites([]);
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, "tripFavorites"),
      where("userId", "==", uid),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setFavorites(
          snap.docs
            .map(docToFavorite)
            .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
        );
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[trip-favorites] snapshot failed", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((f) => f.tripId)),
    [favorites],
  );

  const toggle = useCallback(
    async (trip: FavTripInput): Promise<boolean | null> => {
      if (!uid || !isFirebaseConfigured) return null;
      const db = getDb();
      if (!db) return null;
      const has = favoriteIds.has(trip.id);
      // Deterministic doc id keeps toggles idempotent.
      const ref = doc(db, "tripFavorites", `${uid}_${trip.id}`);
      try {
        if (has) {
          await deleteDoc(ref);
        } else {
          await setDoc(ref, {
            tripId: trip.id,
            userId: uid,
            createdAt: serverTimestamp(),
          });
          savedNotification(uid, trip.title);
        }
        return !has;
      } catch (err) {
        console.error("[trip-favorites] toggle failed", err);
        throw err instanceof Error ? err : new Error("Save failed");
      }
    },
    [uid, favoriteIds],
  );

  return {
    favorites,
    favoriteIds,
    isFavorited: (id: string) => favoriteIds.has(id),
    loading,
    toggle,
  };
}
