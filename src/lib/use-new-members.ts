"use client";

/**
 * "New amigas this week" — members who joined within the last N days.
 *
 * Derived entirely from the live community-members subscription
 * (use-community-members.ts), so it needs no extra Firestore listener
 * and gracefully returns an empty list when Firebase isn't configured
 * (the singleton subscription falls back to the seed members, none of
 * which are recent).
 *
 * `joinedDate` is stored as either a plain date string ("2024-09-01")
 * or an ISO timestamp. We parse defensively and ignore unparseable or
 * future-dated values rather than surfacing "Invalid Date" rows.
 */

import { useMemo } from "react";
import {
  useCommunityMembers,
  type MemberWithStatus,
} from "./use-community-members";
import { useAuth } from "./store";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since a joinedDate, or null when it can't be parsed. */
function daysSinceJoined(joinedDate: string | undefined): number | null {
  if (!joinedDate) return null;
  const t = new Date(joinedDate).getTime();
  if (!Number.isFinite(t)) return null;
  const diff = Date.now() - t;
  // Guard against clock-skew / future dates producing negative ages.
  if (diff < -DAY_MS) return null;
  return diff / DAY_MS;
}

export interface UseNewMembersResult {
  /** Members who joined within `withinDays`, newest join first. */
  newMembers: MemberWithStatus[];
  loading: boolean;
}

/**
 * @param withinDays  Recency window. Defaults to 7 (this week).
 * @param max         Cap on returned members. Defaults to 8.
 */
export function useNewMembers(withinDays = 7, max = 8): UseNewMembersResult {
  const { members, loading } = useCommunityMembers();
  const currentUserId = useAuth((s) => s.user?.id);

  const newMembers = useMemo(() => {
    const scored: Array<{ member: MemberWithStatus; age: number }> = [];
    for (const m of members) {
      // Don't welcome yourself.
      if (m.id === currentUserId) continue;
      const age = daysSinceJoined(m.joinedDate);
      if (age === null) continue;
      if (age > withinDays) continue;
      scored.push({ member: m, age });
    }
    // Most-recently-joined first.
    scored.sort((a, b) => a.age - b.age);
    return scored.slice(0, Math.max(0, max)).map((s) => s.member);
  }, [members, currentUserId, withinDays, max]);

  return { newMembers, loading };
}
