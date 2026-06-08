"use client";

import { useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useCommunityUI } from "@/lib/community-ui-store";
import {
  useConversations,
  leaveConversation,
  type Conversation,
} from "@/lib/use-conversations";
import { formatDisplayName } from "@/lib/name-format";
import { useDMPrefs } from "@/lib/use-dm-prefs";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Plus,
  MessageCircle,
  Users,
  BellOff,
  Bell,
  Check,
  Copy,
  User,
  LogOut,
} from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { toast } from "sonner";
import {
  useContextMenu,
  type ContextMenuItem,
} from "../context-menu";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface ConversationListProps {
  activeId: string | null;
  onSelect: (conversationId: string) => void;
  onNewConversation: () => void;
}

interface RowMeta {
  conversation: Conversation;
  title: string;
  subtitle: string;
  avatars: { id: string; name: string; avatar?: string }[];
  unread: boolean;
  isGroup: boolean;
  muted: boolean;
  /** For DMs: the other participant's id, used by the context menu. */
  otherUserId?: string;
}

/**
 * Single conversation row in the sidebar. Owns its own right-click
 * menu so the items stay scoped to THIS conversation across renders.
 */
function ConversationRow({
  row,
  active,
  onSelect,
}: {
  row: RowMeta;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  const currentUser = useAuth((s) => s.user);
  const setMuted = useDMPrefs((s) => s.toggleMute);
  const selectProfile = useCommunityUI((s) => s.selectProfile);
  const confirm = useConfirm();

  const ctx = useContextMenu(() => {
    const items: ContextMenuItem[] = [
      { kind: "label", label: row.title },
      {
        id: "open",
        label: row.isGroup ? "Open group" : "Open conversation",
        icon: <MessageCircle className="h-3.5 w-3.5" />,
        onSelect: () => onSelect(row.conversation.id),
      },
    ];
    if (!row.isGroup && row.otherUserId) {
      items.push({
        id: "view-profile",
        label: "View profile",
        icon: <User className="h-3.5 w-3.5" />,
        onSelect: () => {
          const other = row.avatars[0];
          selectProfile({
            id: row.otherUserId!,
            snapshot: other
              ? { name: other.name, avatar: other.avatar }
              : undefined,
          });
        },
      });
    }
    items.push({ kind: "separator" });
    items.push({
      id: "mute",
      label: row.muted ? "Unmute conversation" : "Mute conversation",
      icon: row.muted ? (
        <Bell className="h-3.5 w-3.5" />
      ) : (
        <BellOff className="h-3.5 w-3.5" />
      ),
      onSelect: () => {
        setMuted(row.conversation.id);
        toast.success(
          row.muted ? "Conversation unmuted." : "Conversation muted.",
        );
      },
    });
    if (row.unread) {
      items.push({
        id: "mark-read",
        label: "Mark as read",
        icon: <Check className="h-3.5 w-3.5" />,
        onSelect: () => onSelect(row.conversation.id),
      });
    }
    items.push({ kind: "separator" });
    items.push({
      id: "copy-id",
      label: "Copy conversation ID",
      icon: <Copy className="h-3.5 w-3.5" />,
      onSelect: () => {
        void navigator.clipboard.writeText(row.conversation.id);
        toast.success("Conversation ID copied.");
      },
    });
    items.push({ kind: "separator" });
    items.push({
      id: "leave",
      label: row.isGroup ? "Leave group" : "Delete conversation",
      icon: <LogOut className="h-3.5 w-3.5" />,
      danger: true,
      onSelect: () => {
        if (!currentUser) return;
        const verb = row.isGroup ? "Leave group" : "Delete conversation";
        void confirm({
          title: row.isGroup
            ? `Leave ${row.title}?`
            : `Delete this conversation?`,
          description: row.isGroup
            ? "You'll stop receiving messages from this group. You can be re-added later."
            : "This removes the conversation for both of you. This can't be undone.",
          confirmText: verb,
          destructive: true,
        }).then((confirmed) => {
          if (!confirmed) return;
          void leaveConversation(row.conversation.id, currentUser.id).then(
            (ok) => {
              if (ok) {
                toast.success(row.isGroup ? "Left the group." : "DM deleted.");
              } else {
                toast.error("Couldn't complete that action.");
              }
            },
          );
        });
      },
    });
    return items;
  });

  return (
    <li onContextMenu={ctx.openAt}>
      {ctx.menu}
      <button
        type="button"
        onClick={() => onSelect(row.conversation.id)}
        className={cn(
          "flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-all",
          active ? "bg-gradient-to-r from-[#FF0099]/15 to-[#B51760]/8 shadow-[inset_0_0_0_1px_rgb(255_0_153/0.16)]" : "hover:bg-[#FF0099]/5",
        )}
      >
        {/* Avatar / avatar stack */}
        <span className="relative shrink-0">
          {row.isGroup && row.avatars.length > 1 ? (
            <span className="grid h-9 w-9 grid-cols-2 grid-rows-2 gap-px rounded-full overflow-hidden bg-card border border-rosa/30">
              {row.avatars.slice(0, 4).map((a) => (
                <span
                  key={a.id}
                  className="bg-gradient-to-br from-primary/25 to-rosa/40 grid place-items-center text-[8px] font-semibold text-primary"
                >
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={a.avatar}
                      alt={a.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    a.name.slice(0, 1).toUpperCase()
                  )}
                </span>
              ))}
            </span>
          ) : (
            <Avatar className="h-9 w-9">
              {row.avatars[0]?.avatar && (
                <AvatarImage
                  src={row.avatars[0].avatar}
                  alt={row.avatars[0].name}
                />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
                {row.avatars[0]
                  ? initials(row.avatars[0].name)
                  : row.isGroup
                    ? "GC"
                    : "?"}
              </AvatarFallback>
            </Avatar>
          )}
          {row.unread && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                row.muted ? "bg-muted-foreground/60" : "bg-primary",
              )}
              aria-label={row.muted ? "Unread (muted)" : "Unread"}
            />
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-1.5">
            <span
              className={cn(
                "text-sm truncate flex-1 min-w-0",
                row.unread && !row.muted
                  ? "font-bold"
                  : "font-medium",
                row.muted && !row.unread && "text-foreground/70",
              )}
            >
              {row.title}
              {row.isGroup && (
                <Users className="ml-1 inline-block h-3 w-3 opacity-50 align-text-bottom" />
              )}
              {row.muted && (
                <BellOff
                  className="ml-1 inline-block h-3 w-3 opacity-60 align-text-bottom"
                  aria-label="Muted"
                />
              )}
            </span>
            {row.conversation.lastMessage && row.conversation.updatedAt && (
              <span className="text-[9px] text-muted-foreground shrink-0">
                {formatDistanceToNowStrict(
                  new Date(row.conversation.updatedAt),
                  { addSuffix: false },
                )}
              </span>
            )}
          </span>
          <span
            className={cn(
              "block truncate text-[11px]",
              row.unread && !row.muted
                ? "text-foreground/90 font-medium"
                : "text-muted-foreground",
            )}
          >
            {row.subtitle}
          </span>
        </span>
      </button>
    </li>
  );
}

export function ConversationList({
  activeId,
  onSelect,
  onNewConversation,
}: ConversationListProps) {
  const currentUserId = useAuth((s) => s.user?.id);
  const { conversations, loading, isFirebase } = useConversations();
  const { members } = useCommunityMembers();
  const dmPrefs = useDMPrefs((s) => s.prefs);

  const rows: RowMeta[] = useMemo(() => {
    return conversations.map((c) => {
      const others = c.participantIds.filter((id) => id !== currentUserId);
      const memberFor = (id: string) => members.find((m) => m.id === id);
      const isGroup = c.type === "group";
      const otherUserId =
        !isGroup && others.length === 1 ? others[0] : undefined;

      let title: string;
      let avatars: { id: string; name: string; avatar?: string }[];
      if (!isGroup && others.length === 1) {
        const other = memberFor(others[0]);
        title = other
          ? formatDisplayName(other.name, other.nameDisplay)
          : "Direct message";
        avatars = other
          ? [{ id: other.id, name: other.name, avatar: other.avatar }]
          : [];
      } else {
        const namedOthers = others
          .map((id) => memberFor(id))
          .filter(Boolean) as ReturnType<typeof memberFor>[];
        const fallback = namedOthers
          .slice(0, 3)
          .map(
            (m) =>
              m && formatDisplayName(m.name, m.nameDisplay).split(" ")[0],
          )
          .filter(Boolean)
          .join(", ");
        title =
          c.name?.trim() ||
          fallback ||
          `Group of ${c.participantIds.length}`;
        avatars = namedOthers.slice(0, 3).map((m) => ({
          id: m!.id,
          name: m!.name,
          avatar: m!.avatar,
        }));
      }

      const subtitle = c.lastMessage
        ? `${c.lastMessage.userId === currentUserId ? "You" : c.lastMessage.userName.split(" ")[0]}: ${c.lastMessage.content}`
        : isGroup
          ? `${c.participantIds.length} members`
          : "Say hello!";

      const lastRead = currentUserId ? c.readAt?.[currentUserId] : undefined;
      // lastRead === "" is an in-flight optimistic read receipt:
      // markAsRead just bumped readAt[uid] = serverTimestamp() but
      // the server hasn't confirmed yet, so tsToIso returns "". The
      // user has clearly opened the conversation, so don't flash
      // the unread dot back on while we wait for confirmation.
      const unread =
        Boolean(c.lastMessage) &&
        c.lastMessage!.userId !== currentUserId &&
        (lastRead === undefined ||
          (lastRead !== "" && lastRead < c.lastMessage!.createdAt));

      const muted = dmPrefs[c.id] === "none";

      return {
        conversation: c,
        title,
        subtitle,
        avatars,
        unread,
        isGroup,
        muted,
        otherUserId,
      };
    });
  }, [conversations, members, currentUserId, dmPrefs]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#FACDE8]/25 px-3 glass elevate-2">
        <MessageCircle className="h-3.5 w-3.5 text-[#FF0099]/80" />
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-gradient-brand">
          Direct Messages
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={onNewConversation}
          className="ml-auto h-7 w-7"
          aria-label="New conversation"
          title="New conversation"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {!isFirebase ? (
          <div className="px-3 py-4">
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700 dark:text-amber-300">
              Direct messages need Firebase. Add the
              <code className="font-mono px-1">NEXT_PUBLIC_FIREBASE_*</code>
              env vars and reload.
            </div>
          </div>
        ) : loading && rows.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11px] text-muted-foreground italic">
            Loading conversations...
          </p>
        ) : rows.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[11px] text-muted-foreground">
            <MessageCircle className="h-7 w-7 opacity-30" />
            <p>No chats yet</p>
            <p className="text-[10px]">Slide into an amiga&apos;s DMs — say hola ♡</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onNewConversation}
              className="mt-1 h-7 text-[11px]"
            >
              <Plus className="mr-1 h-3 w-3" />
              Start one
            </Button>
          </div>
        ) : (
          <ul className="py-1">
            {rows.map((row) => (
              <ConversationRow
                key={row.conversation.id}
                row={row}
                active={activeId === row.conversation.id}
                onSelect={onSelect}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
