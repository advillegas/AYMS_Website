"use client";

/**
 * Supabase implementation of useFriendships + the friendship mutations.
 * Delegated to from use-friends.ts when useSupabaseBackend is on.
 */

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "./supabase";
import { subscribeQuery, tsToIso, nowIso } from "./supabase-helpers";
import { useAuth } from "./store";
import {
  friendshipId,
  type Friendship,
  type FriendshipStatus,
  type UseFriendshipsResult,
} from "./use-friends";

interface FriendshipRow {
  id: string;
  participant_ids: string[];
  requester_id: string;
  recipient_id: string;
  status: string;
  created_at: string | null;
  accepted_at: string | null;
}

function rowToFriendship(r: FriendshipRow): Friendship {
  return {
    id: r.id,
    participantIds: r.participant_ids ?? [],
    requesterId: r.requester_id,
    recipientId: r.recipient_id,
    status: r.status as FriendshipStatus,
    createdAt: tsToIso(r.created_at) || nowIso(),
    acceptedAt: r.accepted_at ? tsToIso(r.accepted_at) : undefined,
  };
}

export function useFriendshipsSupabase(): UseFriendshipsResult {
  const userId = useAuth((s) => s.user?.id);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setFriendships([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = subscribeQuery<FriendshipRow>(
      "friendships",
      (sb) =>
        sb.from("friendships").select("*").contains("participant_ids", [userId]),
      (rows) => {
        setFriendships(rows.map(rowToFriendship));
        setLoading(false);
      },
      (msg) => {
        setError(msg);
        setLoading(false);
      },
    );
    return unsub;
  }, [userId]);

  const buckets = useMemo(() => {
    const friends: Friendship[] = [];
    const incomingRequests: Friendship[] = [];
    const outgoingRequests: Friendship[] = [];
    for (const f of friendships) {
      if (f.status === "accepted") friends.push(f);
      else if (f.status === "pending") {
        if (f.recipientId === userId) incomingRequests.push(f);
        else outgoingRequests.push(f);
      }
    }
    incomingRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    outgoingRequests.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    friends.sort((a, b) =>
      (b.acceptedAt ?? b.createdAt).localeCompare(a.acceptedAt ?? a.createdAt),
    );
    return { friends, incomingRequests, outgoingRequests };
  }, [friendships, userId]);

  return {
    friendships,
    friends: buckets.friends,
    incomingRequests: buckets.incomingRequests,
    outgoingRequests: buckets.outgoingRequests,
    loading,
    error,
    isFirebase: true,
  };
}

export async function sendFriendRequestSupabase(
  currentUserId: string,
  otherUserId: string,
): Promise<{ ok: boolean; status?: FriendshipStatus; error?: string }> {
  if (currentUserId === otherUserId) {
    return { ok: false, error: "You can't friend yourself." };
  }
  const sb = getSupabase();
  if (!sb) return { ok: false, error: "Supabase unavailable." };
  const fid = friendshipId(currentUserId, otherUserId);
  try {
    const { data: existing } = await sb
      .from("friendships")
      .select("*")
      .eq("id", fid)
      .maybeSingle();
    if (existing) {
      const row = existing as FriendshipRow;
      if (row.status === "accepted") return { ok: true, status: "accepted" };
      if (row.requester_id === otherUserId) {
        await sb
          .from("friendships")
          .update({ status: "accepted", accepted_at: nowIso() })
          .eq("id", fid);
        return { ok: true, status: "accepted" };
      }
      return { ok: true, status: "pending" };
    }
    const participantIds = [currentUserId, otherUserId].sort();
    const { error } = await sb.from("friendships").insert({
      id: fid,
      participant_ids: participantIds,
      requester_id: currentUserId,
      recipient_id: otherUserId,
      status: "pending",
      created_at: nowIso(),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, status: "pending" };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to send request.",
    };
  }
}

export async function acceptFriendRequestSupabase(
  friendshipDocId: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb
    .from("friendships")
    .update({ status: "accepted", accepted_at: nowIso() })
    .eq("id", friendshipDocId);
  return !error;
}

export async function removeFriendshipSupabase(
  friendshipDocId: string,
): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from("friendships").delete().eq("id", friendshipDocId);
  return !error;
}
