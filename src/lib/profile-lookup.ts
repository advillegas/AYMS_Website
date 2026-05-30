"use client";

import { useAuth, useCommunity, type User } from "./store";
import { useCommunityMembers } from "./use-community-members";

/**
 * Snapshot used when we know about a user from a chat message but can't
 * resolve them through the local stores.
 */
export interface ProfileSnapshot {
  name: string;
  avatar?: string;
  role?: string;
}

/**
 * Resolve a profile by user id. Priority order:
 *  1. Live Firestore members (most complete, has all rich profile fields)
 *  2. Static MOCK_USERS
 *  3. Locally-registered users
 *  4. Currently logged-in user
 *  5. Caller-supplied snapshot (last resort)
 */
export function useProfileLookup(
  userId: string | null | undefined,
  snapshot?: ProfileSnapshot,
): User | null {
  const { members: liveMembers } = useCommunityMembers();
  const mockMembers = useCommunity((s) => s.members);
  const registry = useAuth((s) => s.registry);
  const currentUser = useAuth((s) => s.user);

  if (!userId) return null;

  // Firestore-backed members have the richest data (cover photos,
  // interests, social links, etc.)
  const live = liveMembers.find((m) => m.id === userId);
  if (live) return live;

  const mock = mockMembers.find((m) => m.id === userId);
  if (mock) return mock;

  const registered = registry.find((r) => r.id === userId);
  if (registered) {
    const { passwordHash: _ph, ...rest } = registered;
    void _ph;
    return rest;
  }

  if (currentUser?.id === userId) return currentUser;

  if (snapshot) {
    return {
      id: userId,
      name: snapshot.name,
      email: "",
      avatar: snapshot.avatar ?? "",
      bio: "",
      location: "",
      joinedDate: new Date().toISOString().split("T")[0],
      role: (snapshot.role as User["role"]) ?? "amiga",
    };
  }

  return null;
}
