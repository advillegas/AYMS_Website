"use client";

/**
 * "Amigas you might know" — friend suggestions for the Friends Hub.
 *
 * Pure client-side ranking over the live community members
 * (use-community-members.ts), scored by:
 *   - shared interests[] (weighted heaviest), then
 *   - same location / city, then
 *   - shared languages[].
 *
 * Excludes yourself and anyone you already have a relationship with
 * (friend, incoming, or outgoing) so the list is always actionable.
 * Sending a request emits a `friend-request` notification.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { UserPlus, Sparkles, MapPin, Loader2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import {
  useCommunityMembers,
  type MemberWithStatus,
} from "@/lib/use-community-members";
import { useFriendships, sendFriendRequest } from "@/lib/use-friends";
import { pushNotification } from "@/lib/notify";
import { formatDisplayName } from "@/lib/name-format";
import { AvatarStatusOverlay } from "./status-indicator";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { cn, initials } from "@/lib/utils";

interface Suggestion {
  member: MemberWithStatus;
  score: number;
  sharedInterests: string[];
  sameLocation: boolean;
}

function norm(s: string): string {
  return s.trim().toLowerCase();
}

/** First token of a location string ("Los Angeles, CA" -> "los angeles"). */
function cityOf(location: string | undefined): string {
  if (!location) return "";
  return norm(location.split(",")[0] ?? "");
}

function computeSuggestions(
  me: { interests?: string[]; languages?: string[]; location?: string },
  members: MemberWithStatus[],
  excludeIds: Set<string>,
  max: number,
): Suggestion[] {
  const myInterests = new Set((me.interests ?? []).map(norm));
  const myLanguages = new Set((me.languages ?? []).map(norm));
  const myCity = cityOf(me.location);

  const out: Suggestion[] = [];
  for (const m of members) {
    if (excludeIds.has(m.id)) continue;

    const sharedInterests = (m.interests ?? []).filter((i) =>
      myInterests.has(norm(i)),
    );
    const sharedLanguages = (m.languages ?? []).filter((l) =>
      myLanguages.has(norm(l)),
    );
    const sameLocation = Boolean(myCity) && cityOf(m.location) === myCity;

    const score =
      sharedInterests.length * 3 +
      (sameLocation ? 2 : 0) +
      sharedLanguages.length;

    // Only suggest people with at least one real signal; a community of
    // strangers shouldn't surface random rows.
    if (score <= 0) continue;
    out.push({ member: m, score, sharedInterests, sameLocation });
  }

  out.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break: online first, then name for stability.
    const ao = a.member.status === "online" ? 0 : 1;
    const bo = b.member.status === "online" ? 0 : 1;
    if (ao !== bo) return ao - bo;
    return a.member.name.localeCompare(b.member.name);
  });

  return out.slice(0, Math.max(0, max));
}

function SuggestionRow({ suggestion }: { suggestion: Suggestion }) {
  const { member, sharedInterests, sameLocation } = suggestion;
  const currentUser = useAuth((s) => s.user);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const displayName = formatDisplayName(member.name, member.nameDisplay);

  // Build a short, human "why" string.
  const reason =
    sharedInterests.length > 0
      ? `Both into ${sharedInterests.slice(0, 2).join(" & ")}${
          sharedInterests.length > 2 ? ` +${sharedInterests.length - 2}` : ""
        }`
      : sameLocation
        ? `Near you in ${member.location?.split(",")[0] ?? "your area"}`
        : "You might get along";

  async function handleAdd() {
    if (!currentUser || busy || sent) return;
    setBusy(true);
    try {
      const r = await sendFriendRequest(currentUser.id, member.id);
      if (!r.ok) {
        toast.error(r.error ?? "Couldn't send request.");
        return;
      }
      // Notify the recipient. For a brand-new pending request this is a
      // "friend-request"; if it auto-accepted (they'd already requested
      // you), tell both that they're now friends.
      if (r.status === "accepted") {
        await pushNotification(member.id, {
          kind: "friend-accept",
          title: `${currentUser.name} accepted your friend request`,
          body: "You're now amigas — say hi!",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorAvatar: currentUser.avatar,
          href: "/community/members",
        });
        toast.success(`${displayName} is now your friend!`);
      } else {
        await pushNotification(member.id, {
          kind: "friend-request",
          title: `${currentUser.name} sent you a friend request`,
          body: "Tap to accept and connect.",
          actorId: currentUser.id,
          actorName: currentUser.name,
          actorAvatar: currentUser.avatar,
          href: "/community/members",
        });
        toast.success("Friend request sent.");
      }
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-rosa/20 bg-card/70 px-3 py-2.5">
      <ProfileMiniTrigger
        userId={member.id}
        snapshot={{ name: member.name, avatar: member.avatar }}
        placement="top-start"
      >
        {({ triggerRef, onClick }) => (
          <button
            type="button"
            ref={triggerRef as React.RefObject<HTMLButtonElement>}
            onClick={onClick}
            className="relative shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            aria-label={`View ${displayName}`}
          >
            <Avatar className="h-11 w-11">
              {member.avatar && (
                <AvatarImage src={member.avatar} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rosa/40 text-primary text-sm font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={member.status}
              size="sm"
              borderClass="border-card"
            />
          </button>
        )}
      </ProfileMiniTrigger>

      <div className="min-w-0 flex-1">
        <ProfileMiniTrigger
          userId={member.id}
          snapshot={{ name: member.name, avatar: member.avatar }}
          placement="top-start"
        >
          {({ triggerRef, onClick }) => (
            <button
              type="button"
              ref={triggerRef as React.RefObject<HTMLButtonElement>}
              onClick={onClick}
              className="block max-w-full truncate text-left text-sm font-semibold hover:underline focus:outline-none"
            >
              {displayName}
            </button>
          )}
        </ProfileMiniTrigger>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          {sharedInterests.length > 0 ? (
            <Sparkles className="h-3 w-3 shrink-0 text-primary/60" />
          ) : (
            <MapPin className="h-3 w-3 shrink-0 text-primary/60" />
          )}
          <span className="truncate">{reason}</span>
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        variant={sent ? "outline" : "default"}
        onClick={handleAdd}
        disabled={busy || sent}
        className={cn(
          "h-8 shrink-0 px-3 text-xs",
          sent
            ? "border-rosa/30 text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-magenta",
        )}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : sent ? (
          <>
            <Check className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Sent</span>
          </>
        ) : (
          <>
            <UserPlus className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Add</span>
          </>
        )}
      </Button>
    </li>
  );
}

export function FriendSuggestions({ max = 6 }: { max?: number }) {
  const currentUser = useAuth((s) => s.user);
  const { members, loading } = useCommunityMembers();
  const { friendships } = useFriendships();

  // Everyone we already have any relationship with (friend / pending in
  // either direction) plus ourselves — suggestions must be fresh.
  const excludeIds = useMemo(() => {
    const set = new Set<string>();
    if (currentUser) set.add(currentUser.id);
    for (const f of friendships) {
      for (const id of f.participantIds) set.add(id);
    }
    return set;
  }, [currentUser, friendships]);

  const suggestions = useMemo(() => {
    if (!currentUser) return [];
    return computeSuggestions(
      {
        interests: currentUser.interests,
        languages: currentUser.languages,
        location: currentUser.location,
      },
      members,
      excludeIds,
      max,
    );
  }, [currentUser, members, excludeIds, max]);

  if (loading && members.length === 0) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  if (suggestions.length === 0) {
    const noSignals =
      !currentUser?.interests?.length && !currentUser?.location;
    return (
      <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-4 py-8 text-center">
        <Sparkles className="h-8 w-8 text-primary/30" />
        <p className="text-sm text-foreground/80">
          No suggestions just yet.
        </p>
        <p className="max-w-[300px] text-xs text-muted-foreground">
          {noSignals
            ? "Add a few interests and your city to your profile and we'll match you with amigas who share them."
            : "We'll surface amigas who share your interests or are near you as the community grows."}
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {suggestions.map((s) => (
        <SuggestionRow key={s.member.id} suggestion={s} />
      ))}
    </ul>
  );
}
