"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCommunityUI } from "@/lib/community-ui-store";
import { useProfileLookup, useEmailVisible } from "@/lib/profile-lookup";
import { useUserRoles } from "@/lib/use-roles-store";
import { useAuth } from "@/lib/store";
import {
  useCommunityMembers,
  useMemberStatus,
  type MemberWithStatus,
} from "@/lib/use-community-members";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  X,
  User,
  MessageSquare,
  UserPlus,
  AtSign,
  Copy,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { AvatarStatusOverlay, statusLabel } from "./status-indicator";
import { formatDistanceToNow, format, parseISO, isValid } from "date-fns";
import { formatDisplayName } from "@/lib/name-format";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { useContextMenu, type ContextMenuItem } from "./context-menu";
import { getOrCreateDM } from "@/lib/use-conversations";
import {
  sendFriendRequest,
  useRelationship,
  useFriendIdSet,
} from "@/lib/use-friends";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface MemberRowProps {
  member: MemberWithStatus;
}

function MemberRow({ member }: MemberRowProps) {
  const currentUser = useAuth((s) => s.user);
  const currentUserId = currentUser?.id;
  const roles = useUserRoles(member.id);
  const router = useRouter();
  const selectProfile = useCommunityUI((s) => s.selectProfile);
  const relationship = useRelationship(member.id);
  const friendIds = useFriendIdSet();

  const color = roles[0]?.color;
  const isSelf = currentUserId === member.id;
  const displayName = formatDisplayName(member.name, member.nameDisplay);

  const ctx = useContextMenu(() => {
    const items: ContextMenuItem[] = [
      { kind: "label", label: displayName },
      {
        id: "view-profile",
        label: "View profile",
        icon: <User className="h-3.5 w-3.5" />,
        onSelect: () =>
          selectProfile({
            id: member.id,
            snapshot: { name: member.name, avatar: member.avatar },
          }),
      },
    ];
    if (!isSelf && currentUser) {
      items.push({
        id: "dm",
        label: "Send a message",
        icon: <MessageSquare className="h-3.5 w-3.5" />,
        onSelect: async () => {
          const result = await getOrCreateDM(currentUser.id, member.id, {
            friendIds,
            otherEmail: member.email,
          });
          if (!result.id) {
            toast.error(result.error?.reason ?? "Couldn't open a DM right now.");
            return;
          }
          router.push(`/community/messages?c=${result.id}`);
        },
      });
      if (relationship.status !== "friends") {
        items.push({
          id: "friend",
          label:
            relationship.status === "pending_outgoing"
              ? "Friend request sent"
              : relationship.status === "pending_incoming"
                ? "Accept friend request"
                : "Add friend",
          icon: <UserPlus className="h-3.5 w-3.5" />,
          disabled: relationship.status === "pending_outgoing",
          onSelect: async () => {
            const result = await sendFriendRequest(currentUser.id, member.id);
            if (!result.ok) {
              toast.error(result.error || "Couldn't send friend request.");
              return;
            }
            toast.success(
              result.status === "accepted"
                ? "You're now friends!"
                : "Friend request sent.",
            );
          },
        });
      }
      items.push({
        id: "mention",
        label: "Mention in chat",
        icon: <AtSign className="h-3.5 w-3.5" />,
        onSelect: () => {
          // Drop the @mention onto the clipboard so the user can
          // paste into any composer. Native dispatching into another
          // route's textarea would need a global mention bus, which
          // is overkill for a right-click affordance.
          const handle = `@${displayName.replace(/\s+/g, "")}`;
          void navigator.clipboard.writeText(`${handle} `);
          toast.success(`Copied ${handle} - paste into the chat composer.`);
        },
      });
    }
    items.push({ kind: "separator" });
    items.push({
      id: "copy-id",
      label: "Copy user ID",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: () => {
        void navigator.clipboard.writeText(member.id);
        toast.success("User ID copied.");
      },
    });
    return items;
  });

  return (
    <ProfileMiniTrigger
      userId={member.id}
      snapshot={{ name: member.name, avatar: member.avatar }}
      placement="top-end"
    >
      {({ triggerRef, onClick, open }) => (
        <>
          {ctx.menu}
        <button
          type="button"
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          onClick={onClick}
          onContextMenu={ctx.openAt}
          className={cn(
            "group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-all",
            open ? "bg-[#FF0099]/12 shadow-[inset_0_0_0_1px_rgb(255_0_153/0.18)]" : "hover:bg-[#FF0099]/6",
          )}
        >
          <span className="relative shrink-0 inline-flex">
            <Avatar
              className={cn(
                "h-7 w-7 transition-opacity",
                member.status === "offline" && "opacity-60",
              )}
            >
              {member.avatar && (
                <AvatarImage src={member.avatar} alt={displayName} />
              )}
              <AvatarFallback className="text-[10px] bg-gradient-to-br from-primary/25 to-rosa/40 text-primary font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={member.status}
              size="xs"
              borderClass="border-card"
            />
          </span>
          <span
            className={cn(
              "truncate text-xs decoration-current underline-offset-2",
              "group-hover:underline",
              open && "font-semibold underline",
              member.status === "offline" && "text-muted-foreground",
            )}
            style={color && member.status !== "offline" ? { color } : undefined}
          >
            {displayName}
          </span>
        </button>
        </>
      )}
    </ProfileMiniTrigger>
  );
}

export function MembersPanel() {
  const { members, online, away, offline, loading } = useCommunityMembers();

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-3">
          <Users className="h-3.5 w-3.5 text-[#FF0099]/80" />
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-gradient-brand">
            Members ({members.length})
          </span>
        </div>

        {loading && members.length === 0 && (
          <p className="text-[11px] text-muted-foreground py-4 text-center italic">
            Loading members…
          </p>
        )}

        {online.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400 mb-1">
              Online — {online.length}
            </p>
            <div className="space-y-0.5">
              {online.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </>
        )}

        {away.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-400 mt-3 mb-1">
              Away — {away.length}
            </p>
            <div className="space-y-0.5">
              {away.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </>
        )}

        {offline.length > 0 && (
          <>
            <p className="text-[10px] font-semibold uppercase text-muted-foreground mt-3 mb-1">
              Offline — {offline.length}
            </p>
            <div className="space-y-0.5">
              {offline.map((m) => (
                <MemberRow key={m.id} member={m} />
              ))}
            </div>
          </>
        )}
      </div>
    </ScrollArea>
  );
}

/**
 * Slide-in detail card. Renders for any profile target - a static
 * mock member, a registered user, the current user, or an
 * unrecognised user reconstructed from a chat snapshot.
 */
export function MemberDetailCard() {
  const target = useCommunityUI((s) => s.selectedProfile);
  const selectProfile = useCommunityUI((s) => s.selectProfile);
  const profile = useProfileLookup(target?.id, target?.snapshot);
  const { status } = useMemberStatus(profile?.id);
  const { members } = useCommunityMembers();
  const roles = useUserRoles(profile?.id);
  const emailVisible = useEmailVisible(profile);

  if (!target || !profile) return null;
  const live = members.find((m) => m.id === profile.id);
  const lastSeenLabel =
    live?.lastActiveAt && status === "offline"
      ? `Last seen ${formatDistanceToNow(live.lastActiveAt, { addSuffix: true })}`
      : statusLabel(status);
  const primaryColor = roles[0]?.color;
  // Prefer the live presence record's nameDisplay (it's the most
  // recently-synced source of truth). Fall back to whatever the
  // profile lookup returned, then to "full". Applied to the user's
  // own view too so what they see matches what others see.
  const displayName = formatDisplayName(
    profile.name,
    live?.nameDisplay ?? profile.nameDisplay,
  );

  // joinedDate may be missing or an unparseable string for snapshot /
  // legacy users. Only render the "Joined" row when it resolves to a
  // real date so we never show "Invalid Date".
  const joinedParsed = profile.joinedDate
    ? parseISO(profile.joinedDate)
    : null;
  const joinedLabel =
    joinedParsed && isValid(joinedParsed)
      ? format(joinedParsed, "MMMM yyyy")
      : null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#FACDE8]/25 px-3 py-2">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-gradient-brand">
          Member
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => selectProfile(null)}
          aria-label="Close member details"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <Avatar
                className={cn(
                  "h-20 w-20 ring-4 ring-[#FF0099]/25 transition-opacity elevate-3",
                  status === "offline" && "opacity-70",
                )}
              >
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
                className="-bottom-0 -right-0"
              />
            </div>
            <h3
              className="mt-3 text-lead font-bold font-[family-name:var(--font-heading)]"
              style={primaryColor ? { color: primaryColor } : { color: "#B51760" }}
            >
              {displayName}
            </h3>
            <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
              {roles.length > 0 ? (
                roles.map((r) => (
                  <span
                    key={r.id}
                    className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider"
                    style={{
                      backgroundColor: `${r.color}20`,
                      color: r.color,
                    }}
                  >
                    {r.name}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider bg-muted text-muted-foreground">
                  {profile.role}
                </span>
              )}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {lastSeenLabel}
            </p>
          </div>

          <Separator />

          {profile.bio && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                About
              </p>
              <p className="text-xs leading-relaxed text-foreground/80">
                {profile.bio}
              </p>
            </div>
          )}

          <div className="space-y-2 text-xs">
            {profile.location && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Location
                </p>
                <p className="mt-0.5">{profile.location}</p>
              </div>
            )}
            {emailVisible && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Email
                </p>
                <p className="mt-0.5 break-all">{profile.email}</p>
              </div>
            )}
            {joinedLabel && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Joined
                </p>
                <p className="mt-0.5">{joinedLabel}</p>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
