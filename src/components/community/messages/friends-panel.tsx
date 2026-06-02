"use client";

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useProfileLookup } from "@/lib/profile-lookup";
import {
  useFriendships,
  useFriendIdSet,
  acceptFriendRequest,
  removeFriendship,
} from "@/lib/use-friends";
import { getOrCreateDM } from "@/lib/use-conversations";
import { formatDisplayName } from "@/lib/name-format";
import {
  Users,
  UserPlus,
  Check,
  X,
  MessageCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ProfileMiniTrigger } from "../profile-mini-card";
import { AvatarStatusOverlay } from "../status-indicator";
import { useMemberStatus } from "@/lib/use-community-members";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface FriendRowProps {
  userId: string;
  /** When set, renders the Accept / Decline pair instead of Message. */
  incomingFriendshipId?: string;
  /** When set, renders Cancel for an outgoing pending request. */
  outgoingFriendshipId?: string;
  /** When set, renders Message + Remove for an accepted friendship. */
  acceptedFriendshipId?: string;
}

function FriendRow({
  userId,
  incomingFriendshipId,
  outgoingFriendshipId,
  acceptedFriendshipId,
}: FriendRowProps) {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const profile = useProfileLookup(userId);
  const { status } = useMemberStatus(userId);
  const friendIds = useFriendIdSet();
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const displayName = formatDisplayName(profile.name, profile.nameDisplay);

  async function handleAccept() {
    if (!incomingFriendshipId) return;
    setBusy(true);
    try {
      const ok = await acceptFriendRequest(incomingFriendshipId);
      if (ok) toast.success(`${displayName} is now your friend!`);
      else toast.error("Couldn't accept request.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(label: string) {
    const fid =
      incomingFriendshipId ?? outgoingFriendshipId ?? acceptedFriendshipId;
    if (!fid) return;
    if (acceptedFriendshipId && !window.confirm(`${label} ${displayName}?`)) {
      return;
    }
    setBusy(true);
    try {
      const ok = await removeFriendship(fid);
      if (ok) {
        if (incomingFriendshipId) toast.success("Request declined.");
        else if (outgoingFriendshipId) toast.success("Request cancelled.");
        else toast.success(`Removed ${displayName}.`);
      } else {
        toast.error("Couldn't complete that.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleMessage() {
    if (!currentUser || !profile) return;
    const email = profile.email;
    setBusy(true);
    try {
      const result = await getOrCreateDM(currentUser.id, userId, {
        friendIds,
        otherEmail: email,
      });
      if (!result.id) {
        toast.error(result.error?.reason ?? "Couldn't open a DM right now.");
        return;
      }
      router.push(`/community/messages?c=${encodeURIComponent(result.id)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-primary/5 transition-colors">
      <ProfileMiniTrigger userId={userId} placement="top-start">
        {({ triggerRef, onClick }) => (
          <button
            type="button"
            ref={triggerRef as React.RefObject<HTMLButtonElement>}
            onClick={onClick}
            className="relative inline-flex shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            aria-label={`View ${displayName}`}
          >
            <Avatar className="h-9 w-9">
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-xs font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={status}
              size="sm"
              borderClass="border-card"
              className="bottom-0 right-0"
            />
          </button>
        )}
      </ProfileMiniTrigger>

      <div className="min-w-0 flex-1">
        <ProfileMiniTrigger userId={userId} placement="top-start">
          {({ triggerRef, onClick }) => (
            <button
              type="button"
              ref={triggerRef as React.RefObject<HTMLButtonElement>}
              onClick={onClick}
              className="block text-left text-sm font-semibold hover:underline focus:outline-none truncate"
            >
              {displayName}
            </button>
          )}
        </ProfileMiniTrigger>
        <p className="text-[10px] text-muted-foreground truncate">
          {profile.location || profile.email || "Member"}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {acceptedFriendshipId && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMessage}
              disabled={busy}
              className="h-8 px-2 text-xs border-rosa/30"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Message</span>
            </Button>
            <button
              type="button"
              onClick={() => handleRemove("Remove")}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label={`Remove ${displayName}`}
              title="Remove friend"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {incomingFriendshipId && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              disabled={busy}
              className="h-8 px-2 text-xs bg-primary text-primary-foreground hover:bg-magenta"
            >
              <Check className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Accept</span>
            </Button>
            <button
              type="button"
              onClick={() => handleRemove("Decline")}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Decline"
              title="Decline"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {outgoingFriendshipId && (
          <>
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Pending</span>
            </span>
            <button
              type="button"
              onClick={() => handleRemove("Cancel")}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
              aria-label="Cancel request"
              title="Cancel request"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin opacity-50" />}
      </div>
    </li>
  );
}

interface FriendsPanelProps {
  /** Mobile slide-out flag - if false, renders inline. */
  className?: string;
}

export function FriendsPanel({ className }: FriendsPanelProps) {
  const currentUserId = useAuth((s) => s.user?.id);
  const { friends, incomingRequests, outgoingRequests, loading } =
    useFriendships();
  const { members } = useCommunityMembers();

  // Online friends bubble to the top.
  const sortedFriends = useMemo(() => {
    const statusFor = (uid: string) =>
      members.find((m) => m.id === uid)?.status ?? "offline";
    return [...friends].sort((a, b) => {
      const aOther = a.participantIds.find((p) => p !== a.requesterId) ?? a.recipientId;
      const bOther = b.participantIds.find((p) => p !== b.requesterId) ?? b.recipientId;
      const sa = statusFor(aOther) === "online" ? 0 : 1;
      const sb = statusFor(bOther) === "online" ? 0 : 1;
      return sa - sb;
    });
  }, [friends, members]);

  return (
    <div className={cn("flex h-full flex-col", className)}>
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-rosa/20 px-3 bg-card/80">
        <Users className="h-3.5 w-3.5 text-primary/70" />
        <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">
          Friends
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {friends.length} {friends.length === 1 ? "friend" : "friends"}
        </span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4">
        {loading && friends.length === 0 && incomingRequests.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Incoming requests */}
            {incomingRequests.length > 0 && (
              <section>
                <h3 className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-coral">
                  Friend requests · {incomingRequests.length}
                </h3>
                <ul className="space-y-1">
                  {incomingRequests.map((f) => (
                    <FriendRow
                      key={f.id}
                      userId={f.requesterId}
                      incomingFriendshipId={f.id}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Outgoing pending */}
            {outgoingRequests.length > 0 && (
              <section>
                <h3 className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Sent · {outgoingRequests.length}
                </h3>
                <ul className="space-y-1">
                  {outgoingRequests.map((f) => (
                    <FriendRow
                      key={f.id}
                      userId={f.recipientId}
                      outgoingFriendshipId={f.id}
                    />
                  ))}
                </ul>
              </section>
            )}

            {/* Accepted friends */}
            {sortedFriends.length > 0 ? (
              <section>
                <h3 className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary/70">
                  All friends · {sortedFriends.length}
                </h3>
                <ul className="space-y-1">
                  {sortedFriends.map((f) => {
                    const otherId = f.participantIds.find(
                      (p) => p !== currentUserId,
                    );
                    if (!otherId) return null;
                    return (
                      <FriendRow
                        key={f.id}
                        userId={otherId}
                        acceptedFriendshipId={f.id}
                      />
                    );
                  })}
                </ul>
              </section>
            ) : incomingRequests.length === 0 &&
              outgoingRequests.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center px-6 py-12 text-xs text-muted-foreground gap-2">
                <UserPlus className="h-8 w-8 opacity-30" />
                <p>No amigas added yet</p>
                <p className="text-[10px]">
                  Tap any member&apos;s avatar to connect ♡
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
