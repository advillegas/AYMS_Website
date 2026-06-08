"use client";

/**
 * "New amigas this week ♡" welcome-wagon card.
 *
 * Surfaces members who joined within the last 7 days
 * (use-new-members.ts) and gives a one-tap "Say hi" that:
 *   1. opens (or reuses) a DM via getOrCreateDM,
 *   2. posts a warm first message into that conversation,
 *   3. emits a `welcome` notification to the new amiga,
 *   4. navigates the sender to the conversation.
 *
 * Writes follow the house Firestore pattern (serverTimestamp, no
 * undefined). Everything degrades gracefully when Firebase isn't
 * configured — the card simply renders its empty state.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { toast } from "sonner";
import { Sparkles, MapPin, HeartHandshake, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/store";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { getOrCreateDM } from "@/lib/use-conversations";
import { useFriendIdSet } from "@/lib/use-friends";
import { useNewMembers } from "@/lib/use-new-members";
import { pushNotification } from "@/lib/notify";
import { formatDisplayName } from "@/lib/name-format";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { cn, initials } from "@/lib/utils";
import type { MemberWithStatus } from "@/lib/use-community-members";

/**
 * Post a first DM message into an existing conversation. Mirrors the
 * shape `useConversationMessages.sendMessage` writes (message doc +
 * conversation lastMessage/updatedAt bump) so the thread and the
 * Messages sidebar render it immediately.
 */
async function sendFirstMessage(
  conversationId: string,
  sender: { id: string; name: string; avatar?: string },
  content: string,
): Promise<boolean> {
  const db = getDb();
  if (!db) return false;
  try {
    await addDoc(collection(db, "conversations", conversationId, "messages"), {
      userId: sender.id,
      userName: sender.name,
      userAvatar: sender.avatar ?? "",
      content,
      attachments: [],
      reactions: {},
      threadParentId: null,
      threadCount: 0,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "conversations", conversationId), {
      updatedAt: serverTimestamp(),
      lastMessage: {
        content,
        userId: sender.id,
        userName: sender.name,
        createdAt: serverTimestamp(),
      },
      [`readAt.${sender.id}`]: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("[welcome-wagon] first message failed", err);
    return false;
  }
}

function WelcomeRow({ member }: { member: MemberWithStatus }) {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const friendIds = useFriendIdSet();
  const [busy, setBusy] = useState(false);

  const displayName = formatDisplayName(member.name, member.nameDisplay);
  const firstName = displayName.split(/\s+/)[0] || displayName;

  async function handleSayHi() {
    if (!currentUser || busy) return;
    if (!isFirebaseConfigured) {
      toast.error(
        "Saying hi needs Firebase. Add NEXT_PUBLIC_FIREBASE_* env vars and reload.",
      );
      return;
    }
    setBusy(true);
    try {
      const result = await getOrCreateDM(currentUser.id, member.id, {
        friendIds,
        otherEmail: member.email,
      });
      if (!result.id) {
        toast.error(result.error?.reason ?? "Couldn't open a DM right now.");
        return;
      }
      const greeting = `Hi ${firstName}! Welcome to Amigas Y Más — so happy you're here ♡`;
      await sendFirstMessage(
        result.id,
        { id: currentUser.id, name: currentUser.name, avatar: currentUser.avatar },
        greeting,
      );
      await pushNotification(member.id, {
        kind: "welcome",
        title: `${currentUser.name} said hi 👋`,
        body: "Tap to say hello back and start chatting.",
        actorId: currentUser.id,
        actorName: currentUser.name,
        actorAvatar: currentUser.avatar,
        href: `/community/messages?c=${encodeURIComponent(result.id)}`,
      });
      toast.success(`Said hi to ${firstName} ♡`);
      router.push(`/community/messages?c=${encodeURIComponent(result.id)}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center gap-3 rounded-xl border border-rosa/25 bg-card/70 px-3 py-2.5">
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
            className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
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
          {member.location ? (
            <>
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{member.location}</span>
            </>
          ) : (
            <span className="truncate">Just joined the community</span>
          )}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        onClick={handleSayHi}
        disabled={busy}
        className="h-8 shrink-0 bg-primary px-3 text-xs text-primary-foreground hover:bg-magenta"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <HeartHandshake className="h-3.5 w-3.5 sm:mr-1" />
            <span className="hidden sm:inline">Say hi</span>
          </>
        )}
      </Button>
    </li>
  );
}

export function WelcomeWagon() {
  const { newMembers, loading } = useNewMembers(7, 6);
  const currentUser = useAuth((s) => s.user);

  // Don't render the whole card during the brief loading window if we
  // have nothing yet — but once loaded, always show it (the empty
  // state is part of the warmth: it tells members the door's open).
  if (loading && newMembers.length === 0) {
    return (
      <Card className="border-rosa/30">
        <CardContent className="pt-5">
          <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-xl bg-muted/60"
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden border-rosa/30", "elevate-2")}>
      <div className="bg-gradient-to-r from-rosa/30 to-blush/20 px-5 py-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          New amigas this week ♡
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Be the first to make them feel at home.
        </p>
      </div>
      <CardContent className="pt-4">
        {newMembers.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 py-6 text-center">
            <HeartHandshake className="h-8 w-8 text-primary/30" />
            <p className="text-sm text-foreground/80">
              No new amigas joined this week — yet.
            </p>
            <p className="max-w-[280px] text-xs text-muted-foreground">
              When someone new joins, they&apos;ll show up here so you can
              welcome them with a hello.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {newMembers.map((m) => (
              <WelcomeRow key={m.id} member={m} />
            ))}
          </ul>
        )}
        {!currentUser && (
          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Sign in to say hi.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
