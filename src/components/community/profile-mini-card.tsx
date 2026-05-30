"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageCircle,
  UserPlus,
  UserCheck,
  MoreHorizontal,
  Copy,
  ExternalLink,
  MapPin,
  Mail,
  Check,
  Clock,
  X as XIcon,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useProfileLookup, type ProfileSnapshot } from "@/lib/profile-lookup";
import {
  useRoles,
  useUserRoles,
  useHasPermission,
} from "@/lib/use-roles-store";
import { useMemberStatus } from "@/lib/use-community-members";
import { useCommunityUI } from "@/lib/community-ui-store";
import { getOrCreateDM } from "@/lib/use-conversations";
import {
  useRelationship,
  useFriendIdSet,
  sendFriendRequest,
  acceptFriendRequest,
  removeFriendship,
  type RelationshipStatus,
} from "@/lib/use-friends";
import { formatDisplayName } from "@/lib/name-format";
import { FloatingPopover } from "./floating-popover";
import { FullProfileDialog } from "./full-profile-dialog";
import { AvatarStatusOverlay, statusLabel } from "./status-indicator";
import { cn } from "@/lib/utils";
import { isFirebaseConfigured } from "@/lib/firebase";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface FriendButtonProps {
  relationship: RelationshipStatus;
  busy: boolean;
  onClick: () => void;
}

function FriendButton({ relationship, busy, onClick }: FriendButtonProps) {
  if (relationship === "self") return null;
  let icon: ReactNode;
  let label: string;
  let className =
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-md border px-2.5 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50";
  if (relationship === "friends") {
    icon = <UserCheck className="h-4 w-4" />;
    label = "Friends";
    className += " border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300";
  } else if (relationship === "pending_outgoing") {
    icon = <Clock className="h-4 w-4" />;
    label = "Sent";
    className += " border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300";
  } else if (relationship === "pending_incoming") {
    icon = <Check className="h-4 w-4" />;
    label = "Accept";
    className += " border-primary bg-primary text-primary-foreground hover:bg-magenta";
  } else {
    icon = <UserPlus className="h-4 w-4" />;
    label = "Friend";
    className += " border-rosa/40 bg-background text-foreground hover:bg-primary/5";
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={className}
      title={
        relationship === "friends"
          ? "Remove friend"
          : relationship === "pending_outgoing"
            ? "Cancel request"
            : relationship === "pending_incoming"
              ? "Accept friend request"
              : "Send friend request"
      }
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/**
 * Inline expandable role picker — no dropdown portal nesting which
 * broke inside FloatingPopover. Click "+" to expand a list of role
 * buttons, click a role to assign it.
 */
function RoleAddButton({
  assignableRoles,
  onAdd,
  label: showLabel,
}: {
  assignableRoles: Array<{ id: string; name: string; color: string }>;
  onAdd: (roleId: string, roleName: string) => void;
  label?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  // Guard: ignore clicks for 150ms after expanding so the same
  // pointer-up that opened the list can't accidentally fire a role
  // button in the same gesture.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!expanded) {
      setReady(false);
      return;
    }
    const t = setTimeout(() => setReady(true), 150);
    return () => clearTimeout(t);
  }, [expanded]);

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setExpanded(true);
        }}
        className={cn(
          "inline-flex items-center justify-center rounded-full border border-dashed border-primary/40 text-primary/70 hover:bg-primary/10 transition-colors focus:outline-none",
          showLabel
            ? "gap-1 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            : "h-5 w-5",
        )}
        aria-label="Add role"
        title="Add role"
      >
        <Plus className="h-3 w-3" />
        {showLabel && "Add role"}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1" onClick={(e) => e.stopPropagation()}>
      {assignableRoles.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!ready) return;
            onAdd(r.id, r.name);
            setExpanded(false);
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider border border-dashed hover:border-solid hover:shadow-sm transition-all cursor-pointer"
          style={{
            borderColor: `${r.color}55`,
            color: r.color,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: r.color }}
          />
          {r.name}
        </button>
      ))}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setExpanded(false);
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted transition-colors text-[10px]"
        aria-label="Cancel"
      >
        ✕
      </button>
    </div>
  );
}

interface ProfileMiniCardProps {
  userId: string;
  /** Snapshot used as fallback when we can't resolve the user from any
   * local store (e.g. they posted before being added to MOCK_USERS). */
  snapshot?: ProfileSnapshot;
  onClose: () => void;
  /** Open the full profile dialog (lives above the popover so it
   * doesn't get unmounted when the popover closes). */
  onViewFullProfile?: () => void;
}

/**
 * Discord-style compact profile card. Renders inside FloatingPopover.
 *
 * Sections (top -> bottom):
 *   1. Banner: gradient tinted by the user's primary role color.
 *   2. Avatar overlapping the banner (Discord-y), with status dot.
 *   3. Display name (respects nameDisplay), then full email + status.
 *   4. Role chips.
 *   5. Bio.
 *   6. Footer actions: "Send Message" CTA + overflow menu.
 *
 * Clicking your own card hides DM/friend buttons and surfaces a "View
 * profile settings" link instead.
 */
export function ProfileMiniCard({
  userId,
  snapshot,
  onClose,
  onViewFullProfile,
}: ProfileMiniCardProps) {
  const router = useRouter();
  const currentUser = useAuth((s) => s.user);
  const profile = useProfileLookup(userId, snapshot);
  const { status } = useMemberStatus(userId);
  const roles = useUserRoles(userId);
  const allRoles = useRoles((s) => s.roles);
  const toggleUserRole = useRoles((s) => s.toggleUserRole);
  const canManageRoles = useHasPermission("manageRoles");
  const selectProfile = useCommunityUI((s) => s.selectProfile);
  const { status: relationship, friendship } = useRelationship(userId);
  const friendIds = useFriendIdSet();
  const [opening, setOpening] = useState(false);
  const [friendBusy, setFriendBusy] = useState(false);

  // Roles the current user could add to this profile, sorted by
  // priority desc to mirror the admin page. Hides system roles
  // (admin/leader/amiga) so people can't promote with one click.
  const assignableRoles = useMemo(() => {
    const ownIds = new Set(roles.map((r) => r.id));
    return allRoles
      .filter((r) => !ownIds.has(r.id))
      .sort((a, b) => b.priority - a.priority);
  }, [allRoles, roles]);

  if (!profile) {
    return (
      <div className="w-80 rounded-xl border border-rosa/30 bg-card p-4 text-sm text-muted-foreground">
        Couldn&apos;t load that profile.
      </div>
    );
  }

  const profileId = profile.id;
  const profileName = profile.name;
  const profileAvatar = profile.avatar;
  const profileEmail = profile.email;
  const isSelf = currentUser?.id === profileId;
  const displayName = formatDisplayName(profileName, profile.nameDisplay);
  const primaryColor = roles[0]?.color;

  async function handleSendMessage() {
    if (!currentUser || isSelf) return;
    setOpening(true);
    try {
      if (!isFirebaseConfigured) {
        toast.error(
          "Direct messages need Firebase. Add NEXT_PUBLIC_FIREBASE_* env vars and reload.",
        );
        return;
      }
      const result = await getOrCreateDM(currentUser.id, profileId, {
        friendIds,
        otherEmail: profileEmail,
      });
      if (!result.id) {
        toast.error(result.error?.reason ?? "Couldn't open a DM right now.");
        return;
      }
      onClose();
      router.push(`/community/messages?c=${encodeURIComponent(result.id)}`);
    } finally {
      setOpening(false);
    }
  }

  function handleViewFullProfile() {
    onClose();
    router.push(`/community/profile/${profileId}`);
  }

  function handleCopyEmail() {
    if (!profileEmail) return;
    void navigator.clipboard.writeText(profileEmail);
    toast.success("Email copied to clipboard");
  }

  async function handleFriendAction() {
    if (!currentUser || isSelf) return;
    setFriendBusy(true);
    try {
      if (relationship === "none") {
        const r = await sendFriendRequest(currentUser.id, profileId);
        if (!r.ok) {
          toast.error(r.error ?? "Couldn't send request.");
          return;
        }
        toast.success(
          r.status === "accepted"
            ? `${profileName} is now your friend!`
            : "Friend request sent.",
        );
      } else if (relationship === "pending_incoming" && friendship) {
        const ok = await acceptFriendRequest(friendship.id);
        if (ok) toast.success(`${profileName} is now your friend!`);
        else toast.error("Couldn't accept request.");
      } else if (relationship === "pending_outgoing" && friendship) {
        if (!window.confirm("Cancel friend request?")) return;
        const ok = await removeFriendship(friendship.id);
        if (ok) toast.success("Friend request cancelled.");
        else toast.error("Couldn't cancel request.");
      } else if (relationship === "friends" && friendship) {
        if (!window.confirm(`Remove ${profileName} as a friend?`)) return;
        const ok = await removeFriendship(friendship.id);
        if (ok) toast.success(`Removed ${profileName}.`);
        else toast.error("Couldn't remove friend.");
      }
    } finally {
      setFriendBusy(false);
    }
  }

  return (
    <div
      className="w-80 max-w-[92vw] overflow-hidden rounded-xl border border-rosa/30 bg-card text-card-foreground shadow-2xl ring-1 ring-black/5"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Banner */}
      <div
        className="h-16 w-full bg-gradient-to-r from-primary/40 to-magenta/30"
        style={
          primaryColor
            ? {
                background: `linear-gradient(110deg, ${primaryColor}66, ${primaryColor}22 70%, transparent)`,
              }
            : undefined
        }
        aria-hidden
      />

      {/* Avatar overlapping the banner */}
      <div className="px-4">
        <div className="-mt-9 flex items-end gap-3">
          <span className="relative inline-flex">
            <Avatar className="h-[72px] w-[72px] ring-4 ring-card shadow-md">
              {profile.avatar && (
                <AvatarImage src={profile.avatar} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary to-magenta text-white text-xl font-bold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={status}
              size="lg"
              borderClass="border-card"
              className="bottom-0.5 right-0.5"
            />
          </span>
        </div>

        <div className="mt-2.5">
          <h3
            className="text-base font-bold leading-tight font-[family-name:var(--font-heading)] truncate"
            style={primaryColor ? { color: primaryColor } : undefined}
          >
            {displayName}
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span className="truncate">
              {isSelf ? "You" : statusLabel(status)}
            </span>
            {profile.location && (
              <>
                <span className="opacity-40">·</span>
                <span className="inline-flex items-center gap-0.5 truncate">
                  <MapPin className="h-3 w-3 opacity-60" />
                  {profile.location}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Roles */}
        {roles.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1">
            {roles.map((r) => {
              // Admins can remove any role from others, including system
              // roles. Exception: the server admin account ("admin")
              // can never lose role-admin — that's the master key.
              const isProtected = profileId === "admin" && r.id === "role-admin";
              const removable = canManageRoles && !isSelf && !isProtected;
              return (
                <span
                  key={r.id}
                  className="inline-flex items-center gap-1 rounded-full pl-2 pr-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider border"
                  style={{
                    borderColor: `${r.color}55`,
                    backgroundColor: `${r.color}1A`,
                    color: r.color,
                  }}
                >
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: r.color }}
                  />
                  {r.name}
                  {removable && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          !window.confirm(`Remove ${r.name} from ${profileName}?`)
                        ) {
                          return;
                        }
                        toggleUserRole(profileId, r.id);
                        toast.success(`Removed ${r.name}`);
                      }}
                      className="ml-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full hover:bg-current/20 transition-colors"
                      aria-label={`Remove ${r.name}`}
                      title={`Remove ${r.name}`}
                    >
                      <XIcon className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              );
            })}
            {canManageRoles && !isSelf && assignableRoles.length > 0 && (
              <RoleAddButton
                assignableRoles={assignableRoles}
                onAdd={(roleId, roleName) => {
                  toggleUserRole(profileId, roleId);
                  toast.success(`Added ${roleName}`);
                }}
              />
            )}
          </div>
        )}
        {roles.length === 0 && canManageRoles && !isSelf && assignableRoles.length > 0 && (
          <div className="mt-3">
            <RoleAddButton
              assignableRoles={assignableRoles}
              onAdd={(roleId, roleName) => {
                toggleUserRole(profileId, roleId);
                toast.success(`Added ${roleName}`);
              }}
              label
            />
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p className="mt-3 text-xs leading-relaxed text-foreground/80 line-clamp-3">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Action footer */}
      <div className="mt-3 border-t border-rosa/15 bg-muted/20 px-4 py-3">
        {isSelf ? (
          <Button
            type="button"
            variant="outline"
            className="w-full border-rosa/30"
            onClick={() => {
              router.push("/community/profile");
              onClose();
            }}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Edit your profile
          </Button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handleSendMessage}
                disabled={opening}
                className="flex-1 bg-primary text-primary-foreground hover:bg-magenta"
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {opening ? "Opening..." : "Message"}
              </Button>
              <FriendButton
                relationship={relationship}
                busy={friendBusy}
                onClick={handleFriendAction}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewFullProfile();
                }}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-rosa/30 bg-background px-3 text-xs font-medium hover:bg-primary/5 transition-colors focus:outline-none"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Profile
              </button>
            </div>
            {relationship === "pending_incoming" && (
              <p className="mt-2 text-[10px] text-center text-muted-foreground">
                {profileName} sent you a friend request
              </p>
            )}
            {relationship === "pending_outgoing" && (
              <p className="mt-2 text-[10px] text-center text-muted-foreground">
                Waiting for {profileName.split(" ")[0]} to accept
              </p>
            )}
            {relationship === "friends" && (
              <p className="mt-2 text-[10px] text-center text-emerald-600 dark:text-emerald-400 font-medium">
                You&apos;re friends
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Convenience trigger wrapper                                         */
/* ------------------------------------------------------------------ */

export interface ProfileMiniTriggerProps {
  userId: string;
  snapshot?: ProfileSnapshot;
  /** Where the popover anchors relative to the trigger. */
  placement?: "top-start" | "top-end" | "top-center";
  /** Render-prop receiving the trigger ref + an `onClick` that opens
   * the popover. Lets the caller wrap whatever element they like
   * (button, div, span). */
  children: (args: {
    triggerRef: React.RefObject<HTMLElement | null>;
    onClick: () => void;
    open: boolean;
  }) => ReactNode;
}

/**
 * Wires up a clickable trigger that opens the profile mini-card. The
 * caller controls the trigger element so this works on a name button,
 * an avatar, a mention chip, etc.
 */
export function ProfileMiniTrigger({
  userId,
  snapshot,
  placement = "top-start",
  children,
}: ProfileMiniTriggerProps) {
  const triggerRef = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);
  // Lifted out of ProfileMiniCard so closing the popover doesn't
  // unmount the dialog before it can render.
  const [fullProfileOpen, setFullProfileOpen] = useState(false);

  return (
    <>
      {children({
        triggerRef,
        onClick: () => setOpen((v) => !v),
        open,
      })}
      <FloatingPopover
        open={open}
        triggerRef={triggerRef}
        onClose={() => setOpen(false)}
        placement={placement}
        width={320}
        className={cn("bg-transparent p-0")}
      >
        <ProfileMiniCard
          userId={userId}
          snapshot={snapshot}
          onClose={() => setOpen(false)}
          onViewFullProfile={() => setFullProfileOpen(true)}
        />
      </FloatingPopover>
      <FullProfileDialog
        userId={userId}
        open={fullProfileOpen}
        onOpenChange={setFullProfileOpen}
      />
    </>
  );
}
