"use client";

/**
 * Supabase implementation of useRsvps + useMyRsvpRefs. Delegated to
 * from use-rsvps.ts when useSupabaseBackend is on. RSVPs live in the
 * flat `rsvps` table keyed by (target_type, target_id, user_id) — the
 * composite PK plays the role the per-uid Firestore doc id did, so the
 * toggle stays idempotent (upsert flips status, delete clears it).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso, nowIso } from "./supabase-helpers";
import { useAuth } from "./store";
import type {
  MyRsvpRef,
  Rsvp,
  RsvpStatus,
  RsvpTargetType,
  UseRsvpsResult,
} from "./use-rsvps";

interface RsvpRow {
  target_type: string;
  target_id: string;
  user_id: string;
  user_name: string | null;
  user_avatar: string | null;
  status: string | null;
  created_at: string | null;
}

function rowToRsvp(r: RsvpRow): Rsvp {
  return {
    userId: r.user_id,
    userName: r.user_name ?? "Amiga",
    userAvatar: r.user_avatar ?? undefined,
    status: r.status === "interested" ? "interested" : "going",
    createdAt: tsToIso(r.created_at),
  };
}

export function useRsvpsSupabase(
  targetType: RsvpTargetType,
  targetId: string | null | undefined,
): UseRsvpsResult {
  const user = useAuth((s) => s.user);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!targetId) {
      setRsvps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<RsvpRow>(
      "rsvps",
      (sb) =>
        sb
          .from("rsvps")
          .select("*")
          .eq("target_type", targetType)
          .eq("target_id", targetId),
      (rows) => {
        setRsvps(
          rows
            .map(rowToRsvp)
            .sort((a, b) =>
              (a.createdAt || "￿").localeCompare(b.createdAt || "￿"),
            ),
        );
        setLoading(false);
      },
      (msg) => {
        console.warn("[rsvps:sb] query failed", msg);
        setLoading(false);
      },
      { column: "target_id", value: targetId },
    );
    return unsub;
  }, [targetType, targetId]);

  const going = useMemo(() => rsvps.filter((r) => r.status === "going"), [rsvps]);
  const interested = useMemo(
    () => rsvps.filter((r) => r.status === "interested"),
    [rsvps],
  );

  // Rows carry the canonical users.id (store id) — RLS maps the JWT to
  // it, so the store id is the right key to match my own rsvp by.
  const myRsvp = useMemo(() => {
    if (!user) return null;
    return rsvps.find((r) => r.userId === user.id) ?? null;
  }, [rsvps, user]);

  const toggle = useCallback(
    async (status: RsvpStatus): Promise<RsvpStatus | null> => {
      if (!targetId || !user) return null;
      const sb = getSupabase();
      if (!sb) return null;
      const key = {
        target_type: targetType,
        target_id: targetId,
        user_id: user.id,
      };
      try {
        // Tapping the status you already hold clears the RSVP.
        if (myRsvp?.status === status) {
          const { error } = await sb.from("rsvps").delete().match(key);
          if (error) throw new Error(error.message);
          return null;
        }
        const { error } = await sb.from("rsvps").upsert(
          {
            ...key,
            user_name: user.name,
            user_avatar: user.avatar ?? null,
            status,
            created_at: nowIso(),
          },
          { onConflict: "target_type,target_id,user_id" },
        );
        if (error) throw new Error(error.message);
        return status;
      } catch (err) {
        console.error("[rsvps:sb] toggle failed", err);
        return null;
      }
    },
    [targetType, targetId, user, myRsvp],
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!targetId || !user) return false;
    const sb = getSupabase();
    if (!sb) return false;
    const { error } = await sb.from("rsvps").delete().match({
      target_type: targetType,
      target_id: targetId,
      user_id: user.id,
    });
    if (error) {
      console.error("[rsvps:sb] remove failed", error.message);
      return false;
    }
    return true;
  }, [targetType, targetId, user]);

  return {
    rsvps,
    going,
    interested,
    goingCount: going.length,
    interestedCount: interested.length,
    myRsvp,
    loading,
    isFirebase: true,
    toggle,
    remove,
  };
}

/* ------------------------------------------------------------------ */
/* Cross-target lookup (My Upcoming)                                   */
/* ------------------------------------------------------------------ */

/**
 * Supabase variant of useMyRsvpRefs: one subscription over all of the
 * current user's rsvps (filtered server-side by user_id), intersected
 * with the caller's known target set client-side.
 */
export function useMyRsvpRefsSupabase(
  targets: Array<{ type: RsvpTargetType; id: string }>,
): { refs: MyRsvpRef[]; loading: boolean } {
  const uid = useAuth((s) => s.user?.id);
  const [rows, setRows] = useState<RsvpRow[]>([]);
  const [loading, setLoading] = useState(false);

  // Stable signature so the effect only re-subscribes when the actual
  // set of targets changes (not on every render's new array identity).
  const sig = useMemo(
    () => targets.map((t) => `${t.type}:${t.id}`).sort().join("|"),
    [targets],
  );

  useEffect(() => {
    if (!uid || !sig) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<RsvpRow>(
      "rsvps",
      (sb) => sb.from("rsvps").select("*").eq("user_id", uid),
      (data) => {
        setRows(data);
        setLoading(false);
      },
      (msg) => {
        console.warn("[rsvps:sb] my-refs query failed", msg);
        setLoading(false);
      },
      { column: "user_id", value: uid },
    );
    return unsub;
  }, [uid, sig]);

  const refs = useMemo<MyRsvpRef[]>(() => {
    const wanted = new Set(sig ? sig.split("|") : []);
    return rows
      .filter((r) => wanted.has(`${r.target_type}:${r.target_id}`))
      .map((r) => ({
        targetType: r.target_type === "meetup" ? "meetup" : "event",
        targetId: r.target_id,
        status: r.status === "interested" ? "interested" : "going",
        createdAt: tsToIso(r.created_at),
      }));
  }, [rows, sig]);

  return { refs, loading };
}
