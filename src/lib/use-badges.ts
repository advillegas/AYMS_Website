"use client";

/**
 * Milestones & Badges.
 *
 * Backed by `users/{uid}/badges/{badgeId}` → { earnedAt, seen }.
 *
 * Two responsibilities:
 *  1. Read — live subscription to whichever profile is being viewed, so
 *     both the self page and other members' pages can show a shelf.
 *  2. Earn — for the SIGNED-IN user only, evaluate the pure badge rules
 *     (game-data.ts) against derivable data (tenure, friends, passport,
 *     completeness) and persist any newly-earned badge exactly once.
 *
 * Recognition, never ranking: a badge marks a personal milestone. When
 * one is first earned we fire a single celebratory toast, set `seen`,
 * and push a persistent `badge` notification to the member.
 *
 * Graceful no-op when Firebase isn't configured.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { parseISO, isValid } from "date-fns";
import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { getDb, isFirebaseConfigured } from "./firebase";
import { getSupabase, useSupabaseBackend } from "./supabase";
import { subscribeQuery, nowIso, tsToIso as sbTsToIso } from "./supabase-helpers";
import { useAuth, type User } from "./store";
import { pushNotification } from "./notify";
import { usePassport } from "./use-passport";
import { useFriendships } from "./use-friends";
import {
  getProfileCompleteness,
  type CompletenessResult,
} from "./profile-completeness";
import {
  BADGE_DEFS,
  earnedBadgeIds,
  evaluateBadges,
  type BadgeContext,
  type BadgeDef,
  type EvaluatedBadge,
  type PassportStamp,
} from "./game-data";

export interface EarnedBadgeRecord {
  id: string;
  earnedAt: string;
  seen: boolean;
}

interface FirestoreBadgeDoc {
  earnedAt?: Timestamp;
  seen?: boolean;
}

function tsToIso(ts: Timestamp | undefined): string {
  if (!ts) return "";
  try {
    return ts.toDate().toISOString();
  } catch {
    return "";
  }
}

function docToRecord(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): EarnedBadgeRecord {
  const data = d.data() as FirestoreBadgeDoc;
  return {
    id: d.id,
    earnedAt: tsToIso(data.earnedAt),
    seen: Boolean(data.seen),
  };
}

/* Supabase mirror: user_badges(user_id, badge_id, earned_at, seen). */

interface BadgeRow {
  user_id: string;
  badge_id: string;
  earned_at: string | null;
  seen: boolean | null;
}

function rowToRecord(r: BadgeRow): EarnedBadgeRecord {
  return {
    id: r.badge_id,
    earnedAt: sbTsToIso(r.earned_at),
    seen: Boolean(r.seen),
  };
}

/** A badge def joined with its earned record (if any). */
export interface BadgeShelfItem extends EvaluatedBadge {
  earnedAt?: string;
}

export interface UseBadgesResult {
  /** Every badge def with earned status + timestamp, for the shelf. */
  items: BadgeShelfItem[];
  earnedRecords: EarnedBadgeRecord[];
  earnedCount: number;
  loading: boolean;
  isFirebase: boolean;
}

/**
 * Read-only live subscription to a profile's earned badges, merged with
 * the full badge catalog so the shelf can render earned + locked. Use
 * this on any profile (self or other).
 */
export function useBadges(uid: string | null | undefined): UseBadgesResult {
  const [records, setRecords] = useState<EarnedBadgeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(
    Boolean(uid) && (isFirebaseConfigured || useSupabaseBackend),
  );

  useEffect(() => {
    if (!uid || !(isFirebaseConfigured || useSupabaseBackend)) {
      setRecords([]);
      setLoading(false);
      return;
    }
    if (useSupabaseBackend) {
      setLoading(true);
      return subscribeQuery<BadgeRow>(
        "user_badges",
        (sb) => sb.from("user_badges").select("*").eq("user_id", uid).limit(200),
        (rows) => {
          setRecords(rows.map(rowToRecord));
          setLoading(false);
        },
        (msg) => {
          console.error("[badges:sb]", msg);
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
    const unsub = onSnapshot(
      collection(db, "users", uid, "badges"),
      (snap) => {
        setRecords(snap.docs.map(docToRecord));
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.error("[badges]", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [uid]);

  const items = useMemo<BadgeShelfItem[]>(() => {
    const byId = new Map(records.map((r) => [r.id, r]));
    return BADGE_DEFS.map((def) => {
      const rec = byId.get(def.id);
      return {
        def,
        // A badge is "earned" for display once it has a persisted
        // record. (The owner's hook persists records as rules pass.)
        earned: Boolean(rec),
        earnedAt: rec?.earnedAt,
      };
    });
  }, [records]);

  return {
    items,
    earnedRecords: records,
    earnedCount: records.length,
    loading,
    isFirebase: isFirebaseConfigured || useSupabaseBackend,
  };
}

/**
 * Owner-side effect: evaluate the badge rules for the SIGNED-IN user and
 * persist any newly-earned badge once. Fires a single celebratory toast
 * + a `badge` notification the first time each badge is earned. Mount
 * this once on the self profile (it no-ops for other people's profiles).
 *
 * Pass the live derivable context. The hook owns the dedupe so callers
 * can re-render freely without spamming toasts.
 */
export function useBadgeEarner(
  ctx: BadgeContext,
  /** Only evaluate when the data behind ctx has actually loaded. */
  ready: boolean,
): void {
  const uid = useAuth((s) => s.user?.id);
  const userName = useAuth((s) => s.user?.name);
  const userAvatar = useAuth((s) => s.user?.avatar);

  // Track which badge ids we've already persisted this session so a
  // burst of re-renders (or the snapshot echo of our own write) doesn't
  // double-toast. Firestore setDoc with merge is also idempotent.
  const persistedRef = useRef<Set<string>>(new Set());
  // Seed the persisted set from existing records so we never re-toast a
  // badge the member earned in a previous session.
  const seededRef = useRef(false);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!uid) return;
    if (useSupabaseBackend) {
      return subscribeQuery<BadgeRow>(
        "user_badges",
        (sb) => sb.from("user_badges").select("*").eq("user_id", uid).limit(200),
        (rows) => {
          const ids = new Set(rows.map((r) => r.badge_id));
          setExistingIds(ids);
          if (!seededRef.current) {
            for (const id of ids) persistedRef.current.add(id);
            seededRef.current = true;
          }
        },
        () => {},
        { column: "user_id", value: uid },
      );
    }
    if (!isFirebaseConfigured) return;
    const db = getDb();
    if (!db) return;
    const unsub = onSnapshot(
      collection(db, "users", uid, "badges"),
      (snap) => {
        const ids = new Set(snap.docs.map((d) => d.id));
        setExistingIds(ids);
        if (!seededRef.current) {
          for (const id of ids) persistedRef.current.add(id);
          seededRef.current = true;
        }
      },
      () => {},
    );
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!ready || !uid || !(isFirebaseConfigured || useSupabaseBackend)) return;
    if (!seededRef.current) return; // wait until we know existing badges
    const db = useSupabaseBackend ? null : getDb();
    if (!useSupabaseBackend && !db) return;

    const earnedNow = earnedBadgeIds(ctx);
    const fresh = earnedNow.filter(
      (id) => !existingIds.has(id) && !persistedRef.current.has(id),
    );
    if (fresh.length === 0) return;

    for (const id of fresh) {
      persistedRef.current.add(id);
      const def: BadgeDef | undefined = BADGE_DEFS.find((b) => b.id === id);
      if (!def) continue;

      void (async () => {
        try {
          if (useSupabaseBackend) {
            const sb = getSupabase();
            if (!sb) throw new Error("Supabase unavailable");
            const { error } = await sb.from("user_badges").upsert({
              user_id: uid,
              badge_id: id,
              earned_at: nowIso(),
              seen: false,
            });
            if (error) throw new Error(error.message);
          } else if (db) {
            await setDoc(
              doc(db, "users", uid, "badges", id),
              { earnedAt: serverTimestamp(), seen: false },
              { merge: true },
            );
          }
          // Celebratory, one-time.
          toast.success(`${def.emoji} Badge earned: ${def.title}`, {
            description: def.description,
            duration: 6000,
          });
          // Mark seen now that we've shown the toast this session.
          if (useSupabaseBackend) {
            const sb = getSupabase();
            void sb
              ?.from("user_badges")
              .update({ seen: true })
              .eq("user_id", uid)
              .eq("badge_id", id)
              .then(() => {});
          } else if (db) {
            void updateDoc(doc(db, "users", uid, "badges", id), {
              seen: true,
            }).catch(() => {});
          }
          // Persistent in-app notification to self.
          void pushNotification(uid, {
            kind: "badge",
            title: `New badge: ${def.title}`,
            body: def.description,
            actorId: uid,
            actorName: userName ?? undefined,
            actorAvatar: userAvatar || undefined,
            href: "/community/profile",
          });
        } catch (err) {
          console.error("[badges] persist failed", err);
          // Allow a retry on a later render.
          persistedRef.current.delete(id);
        }
      })();
    }
  }, [ctx, ready, uid, existingIds, userName, userAvatar]);
}

/** Convenience: evaluate the catalog purely (no persistence). */
export function previewBadges(ctx: BadgeContext): EvaluatedBadge[] {
  return evaluateBadges(ctx);
}

/* ------------------------------------------------------------------ */
/* Profile gamification facade                                         */
/* ------------------------------------------------------------------ */

/** Months since an ISO date, 0 when missing/unparseable. */
function tenureMonthsFrom(joinedDate: string | undefined): number {
  if (!joinedDate) return 0;
  const parsed = parseISO(joinedDate);
  if (!isValid(parsed)) return 0;
  const ms = Date.now() - parsed.getTime();
  return Math.max(0, ms / (1000 * 60 * 60 * 24 * 30.44));
}

export interface ProfileGamification {
  stamps: PassportStamp[];
  countries: string[];
  badgeItems: BadgeShelfItem[];
  earnedCount: number;
  completeness: CompletenessResult;
}

/**
 * One-stop hook for the profile view: subscribes to the viewed
 * profile's passport + badges, computes completeness, and (for the
 * signed-in owner only) runs the badge earner so new milestones are
 * persisted + celebrated. Keeps profile-view.tsx lean.
 *
 * Pass `isOwner` (i.e. isSelf) — the earner is a no-op for other
 * members' profiles.
 */
export function useProfileGamification(
  profile: User,
  isOwner: boolean,
): ProfileGamification {
  const { stamps, countries } = usePassport(profile.id);
  const { items: badgeItems, earnedCount } = useBadges(profile.id);
  const { friends } = useFriendships();
  const completeness = useMemo(
    () => getProfileCompleteness(profile),
    [profile],
  );
  const tenureMonths = useMemo(
    () => tenureMonthsFrom(profile.joinedDate),
    [profile.joinedDate],
  );

  const ctx = useMemo<BadgeContext>(
    () => ({
      tenureMonths,
      friendsCount: friends.length,
      passportCount: stamps.length,
      countriesCount: countries.length,
      completeness: completeness.percent,
    }),
    [tenureMonths, friends.length, stamps.length, countries.length, completeness.percent],
  );

  // Evaluate + persist for the owner only.
  useBadgeEarner(ctx, isOwner);

  return { stamps, countries, badgeItems, earnedCount, completeness };
}
