"use client";

/**
 * Friends Hub — the in-page "Friends" view inside the community members
 * directory (NOT a separate route, NOT the Messages sidebar panel).
 *
 * Surfaces the fully-built friends graph (use-friends.ts) with a richer,
 * light-theme layout:
 *   - Incoming requests (Accept / Decline)
 *   - Outgoing requests (Cancel)
 *   - Accepted friends (Message / Remove)
 *   - Friend suggestions (shared interests / location)
 *
 * Accepting or sending requests emits friend-accept / friend-request
 * notifications via pushNotification so the bell + notification center
 * light up for the other amiga.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Check,
  X,
  MessageCircle,
  Clock,
  Loader2,
  Heart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/store";
import { useProfileLookup } from "@/lib/profile-lookup";
import {
  useFriendships,
  useFriendIdSet,
  acceptFriendRequest,
  removeFriendship,
} from "@/lib/use-friends";
import { getOrCreateDM } from "@/lib/use-conversations";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useSupabaseBackend } from "@/lib/supabase";
import { pushNotification } from "@/lib/notify";
import { formatDisplayName } from "@/lib/name-format";
import { AvatarStatusOverlay } from "./status-indicator";
import { useMemberStatus } from "@/lib/use-community-members";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { FriendSuggestions } from "./friend-suggestions";
import { cn, initials } from "@/lib/utils";

type RowKind = "incoming" | "outgoing" | "friend";

interface FriendRowProps {
  userId: string;
  friendshipId: string;
  kind: RowKind;
}

function FriendRow({ userId, friendshipId, kind }: FriendRowProps) {
  const router = useRouter();
  const confirm = useConfirm();
  const currentUser = useAuth((s) => s.user);
  const profile = useProfileLookup(userId);
  const { status } = useMemberStatus(userId);
  const friendIds = useFriendIdSet();
  const [busy, setBusy] = useState(false);

  if (!profile) return null;
  const displayName = formatDisplayName(profile.name, profile.nameDisplay);

  async function handleAccept() {
    if (!currentUser) return;
    setBusy(true);
    try {
      const ok = await acceptFriendRequest(friendshipId);
      if (ok) {
        // Tell the original requester their request was accepted.
        await pushNotification(userId, {
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
        toast.error("Couldn't accept request.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (kind === "friend") {
      const ok = await confirm({
        title: `Remove ${displayName}?`,
        description:
          "You'll need to send a new friend request to reconnect later.",
        confirmText: "Remove",
        destructive: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const ok = await removeFriendship(friendshipId);
      if (ok) {
        if (kind === "incoming") toast.success("Request declined.");
        else if (kind === "outgoing") toast.success("Request cancelled.");
        else toast.success(`Removed ${displayName}.`);
      } else {
        toast.error("Couldn't complete that.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleMessage() {
    if (!currentUser) return;
    if (!(isFirebaseConfigured || useSupabaseBackend)) {
      toast.error("Direct messages need a live backend to be configured.");
      return;
    }
    setBusy(true);
    try {
      const result = await getOrCreateDM(currentUser.id, userId, {
        friendIds,
        otherEmail: profile?.email,
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
    <li className="flex items-center gap-3 rounded-xl border border-rosa/20 bg-card/70 px-3 py-2.5">
      <ProfileMiniTrigger
        userId={userId}
        snapshot={{ name: profile.name, avatar: profile.avatar }}
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
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rosa/40 text-primary text-sm font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={status}
              size="sm"
              borderClass="border-card"
            />
          </button>
        )}
      </ProfileMiniTrigger>

      <div className="min-w-0 flex-1">
        <ProfileMiniTrigger
          userId={userId}
          snapshot={{ name: profile.name, avatar: profile.avatar }}
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
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {profile.location || "Member"}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {kind === "friend" && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleMessage}
              disabled={busy}
              className="h-8 border-rosa/30 px-2 text-xs"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Message</span>
            </Button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={`Remove ${displayName}`}
              title="Remove friend"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {kind === "incoming" && (
          <>
            <Button
              type="button"
              size="sm"
              onClick={handleAccept}
              disabled={busy}
              className="h-8 bg-primary px-2 text-xs text-primary-foreground hover:bg-magenta"
            >
              <Check className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Accept</span>
            </Button>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Decline"
              title="Decline"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        )}
        {kind === "outgoing" && (
          <>
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="hidden sm:inline">Pending</span>
            </span>
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
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

function SectionHeading({
  icon: Icon,
  label,
  count,
  tone = "primary",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  tone?: "primary" | "coral";
}) {
  return (
    <h3
      className={cn(
        "mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider",
        tone === "coral" ? "text-coral" : "text-primary/80",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <span className="text-muted-foreground/70">· {count}</span>
    </h3>
  );
}

export function FriendsHub() {
  const currentUserId = useAuth((s) => s.user?.id);
  const { friends, incomingRequests, outgoingRequests, loading, isFirebase } =
    useFriendships();

  if (!isFirebase) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-6 py-12 text-center">
        <Users className="h-8 w-8 text-primary/30" />
        <p className="text-sm text-foreground/80">
          Friends need Firebase to be configured.
        </p>
        <p className="max-w-[320px] text-xs text-muted-foreground">
          Add your NEXT_PUBLIC_FIREBASE_* env vars and reload to connect with
          amigas.
        </p>
      </div>
    );
  }

  if (loading && friends.length === 0 && incomingRequests.length === 0) {
    return (
      <div className="space-y-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
        ))}
      </div>
    );
  }

  const hasNothing =
    friends.length === 0 &&
    incomingRequests.length === 0 &&
    outgoingRequests.length === 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Left column: requests + friends */}
      <div className="space-y-6">
        {incomingRequests.length > 0 && (
          <section>
            <SectionHeading
              icon={UserPlus}
              label="Friend requests"
              count={incomingRequests.length}
              tone="coral"
            />
            <ul className="space-y-2">
              {incomingRequests.map((f) => (
                <FriendRow
                  key={f.id}
                  userId={f.requesterId}
                  friendshipId={f.id}
                  kind="incoming"
                />
              ))}
            </ul>
          </section>
        )}

        {outgoingRequests.length > 0 && (
          <section>
            <SectionHeading
              icon={Clock}
              label="Sent"
              count={outgoingRequests.length}
            />
            <ul className="space-y-2">
              {outgoingRequests.map((f) => (
                <FriendRow
                  key={f.id}
                  userId={f.recipientId}
                  friendshipId={f.id}
                  kind="outgoing"
                />
              ))}
            </ul>
          </section>
        )}

        <section>
          <SectionHeading icon={Heart} label="Your amigas" count={friends.length} />
          {friends.length > 0 ? (
            <ul className="space-y-2">
              {friends.map((f) => {
                const otherId = f.participantIds.find(
                  (p) => p !== currentUserId,
                );
                if (!otherId) return null;
                return (
                  <FriendRow
                    key={f.id}
                    userId={otherId}
                    friendshipId={f.id}
                    kind="friend"
                  />
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-4 py-8 text-center">
              <UserPlus className="h-8 w-8 text-primary/30" />
              <p className="text-sm text-foreground/80">No amigas added yet</p>
              <p className="max-w-[280px] text-xs text-muted-foreground">
                Tap any member&apos;s avatar to connect, or add someone from the
                suggestions ♡
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Right column: suggestions */}
      <div>
        <SectionHeading icon={Users} label="Amigas you might know" count={0} />
        <FriendSuggestions max={8} />
        {hasNothing && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Suggestions are based on shared interests and where you live.
          </p>
        )}
      </div>
    </div>
  );
}
