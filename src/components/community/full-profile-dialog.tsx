"use client";

/**
 * Modal "view full profile" surface.
 *
 * The mini-card popover gives a Discord-style compact view; this is
 * the larger Dialog that opens when the user clicks "View full
 * profile" from the popover overflow menu. Renders the same data
 * the right-rail MemberDetailCard uses, but in a centered dialog
 * so it's discoverable on every page (the rail is suppressed on
 * /community/messages and /community/calendar).
 */

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MapPin,
  Mail,
  CalendarDays,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useProfileLookup } from "@/lib/profile-lookup";
import { useUserRoles } from "@/lib/use-roles-store";
import {
  useMemberStatus,
  useCommunityMembers,
} from "@/lib/use-community-members";
import { getOrCreateDM } from "@/lib/use-conversations";
import { useFriendships, useFriendIdSet } from "@/lib/use-friends";
import { formatDisplayName } from "@/lib/name-format";
import { AvatarStatusOverlay, statusLabel } from "./status-indicator";
import { format, parseISO } from "date-fns";
import { isFirebaseConfigured } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface FullProfileDialogProps {
  userId: string | null;
  open: boolean;
  onOpenChange: (next: boolean) => void;
}

export function FullProfileDialog({
  userId,
  open,
  onOpenChange,
}: FullProfileDialogProps) {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const profile = useProfileLookup(userId ?? undefined);
  const { status } = useMemberStatus(userId);
  const roles = useUserRoles(userId);
  const friendIds = useFriendIdSet();

  const { friends } = useFriendships();
  const { members } = useCommunityMembers();
  const isSelf = currentUser?.id === userId;
  const displayName = profile
    ? formatDisplayName(profile.name, profile.nameDisplay)
    : "";
  const primaryColor = roles[0]?.color;

  // Top Friends — MySpace-style. Shows the current user's friends
  // (when viewing your own profile) or mutual friends (when viewing
  // someone else's). Capped at 8 for the grid layout.
  const topFriends = useMemo(() => {
    if (!userId) return [];
    const myFriendUids = new Set<string>();
    for (const f of friends) {
      if (f.status !== "accepted") continue;
      for (const id of f.participantIds) {
        if (id !== currentUser?.id) myFriendUids.add(id);
      }
    }
    // For own profile: show all friends. For others: show mutual.
    const pool = isSelf
      ? Array.from(myFriendUids)
      : Array.from(myFriendUids).filter((id) => friendIds.has(id));
    return pool
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean)
      .slice(0, 8) as typeof members;
  }, [friends, members, userId, currentUser?.id, isSelf, friendIds]);

  let joinedLabel = "";
  if (profile?.joinedDate) {
    try {
      joinedLabel = format(parseISO(profile.joinedDate), "MMM d, yyyy");
    } catch {
      joinedLabel = profile.joinedDate;
    }
  }

  async function handleSendMessage() {
    if (!currentUser || !profile || isSelf) return;
    if (!isFirebaseConfigured) {
      toast.error("Direct messages need Firebase to be configured.");
      return;
    }
    const result = await getOrCreateDM(currentUser.id, profile.id, {
      friendIds,
      otherEmail: profile.email,
    });
    if (!result.id) {
      toast.error(result.error?.reason ?? "Couldn't open a DM right now.");
      return;
    }
    onOpenChange(false);
    router.push(`/community/messages?c=${encodeURIComponent(result.id)}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        {/* Banner tinted by the user's primary role color. */}
        <div
          className="h-20 w-full bg-gradient-to-r from-[#FF0099]/50 via-[#B51760]/30 to-[#FACDE8]/20"
          style={
            primaryColor
              ? {
                  background: `linear-gradient(110deg, ${primaryColor}66, ${primaryColor}22 70%, transparent)`,
                }
              : undefined
          }
          aria-hidden
        />

        <DialogHeader className="sr-only">
          <DialogTitle>{displayName || "Profile"}</DialogTitle>
        </DialogHeader>

        {!profile ? (
          <div className="px-6 py-8 text-center text-sm text-muted-foreground">
            Couldn&apos;t load that profile.
          </div>
        ) : (
          <div className="px-6 pb-5">
            {/* Avatar overlapping the banner. */}
            <div className="-mt-12 flex items-end gap-3">
              <span className="relative inline-flex">
                <Avatar className="h-24 w-24 ring-4 ring-[#FF0099]/30 shadow-[0_0_24px_rgb(255_0_153/0.2)] elevate-3">
                  {profile.avatar && (
                    <AvatarImage src={profile.avatar} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-2xl font-bold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <AvatarStatusOverlay
                  status={status}
                  size="lg"
                  borderClass="border-card"
                  className="bottom-1 right-1"
                />
              </span>
            </div>

            <div className="mt-3">
              <h2
                className="text-title font-bold leading-tight font-[family-name:var(--font-heading)]"
                style={primaryColor ? { color: primaryColor } : { color: "#B51760" }}
              >
                {displayName}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {isSelf ? "You" : statusLabel(status)}
              </p>
            </div>

            {roles.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border"
                    style={{
                      borderColor: `${r.color}55`,
                      backgroundColor: `${r.color}1A`,
                      color: r.color,
                    }}
                  >
                    <span
                      className="mr-1 h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: r.color }}
                    />
                    {r.name}
                  </span>
                ))}
              </div>
            )}

            {profile.bio && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    About
                  </p>
                  <p className="text-sm leading-relaxed text-foreground/80">
                    {profile.bio}
                  </p>
                </div>
              </>
            )}

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              {profile.location && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground/85">{profile.location}</span>
                </div>
              )}
              {profile.email && (
                <div className="flex items-start gap-2">
                  <Mail className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground/85 break-all">
                    {profile.email}
                  </span>
                </div>
              )}
              {joinedLabel && (
                <div className="flex items-start gap-2">
                  <CalendarDays className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <span className="text-foreground/85">
                    Joined {joinedLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Top Friends — MySpace-style grid */}
            {topFriends.length > 0 && (
              <>
                <Separator className="my-4" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gradient-brand mb-2">
                    {isSelf ? "Your Friends" : "Mutual Friends"} ({topFriends.length})
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {topFriends.map((f) => {
                      const fname = formatDisplayName(f.name, f.nameDisplay);
                      return (
                        <div
                          key={f.id}
                          className="flex flex-col items-center gap-1 text-center"
                        >
                          <Avatar className="h-10 w-10">
                            {f.avatar && (
                              <AvatarImage src={f.avatar} alt={fname} />
                            )}
                            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
                              {initials(fname)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[10px] leading-tight truncate w-full text-foreground/80">
                            {fname.split(" ")[0]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <Separator className="my-4" />
            <div className="flex gap-2">
              {!isSelf && (
                <Button
                  type="button"
                  onClick={handleSendMessage}
                  className="flex-1 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Message
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className={isSelf ? "flex-1" : ""}
                onClick={() => {
                  router.push(
                    isSelf
                      ? "/community/profile"
                      : `/community/profile/${userId}`,
                  );
                  onOpenChange(false);
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {isSelf ? "Edit profile" : "Full profile"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
