"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/store";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useProfileLookup } from "@/lib/profile-lookup";
import {
  useConversationMessages,
  leaveConversation,
  renameConversation,
  useTypingPublisher,
  useTypingUsers,
  type Conversation,
} from "@/lib/use-conversations";
import { useDMPrefs } from "@/lib/use-dm-prefs";
import { formatDisplayName } from "@/lib/name-format";
import type { GifAttachment } from "@/lib/use-firebase-chat";
import { format, isToday, isYesterday } from "date-fns";
import {
  Send,
  Users,
  UserPlus,
  MoreHorizontal,
  Pencil,
  LogOut,
  Loader2,
  MessageSquare,
  X,
  Bell,
  BellOff,
  Trash2,
  Copy,
  Plus,
  CornerUpLeft,
  ArrowLeft,
  ArrowDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { EmojiPickerButton } from "../emoji-picker";
import { GifPickerButton } from "../gif-picker";
import { MessageContent } from "../message-content";
import {
  MessageReactions,
  AddReactionButton,
  QUICK_EMOJIS,
} from "../message-reactions";
import { EmojiPickerPopover } from "../emoji-picker-popover";
import { MessageEditor, MessageActionButtons } from "../message-editor";
import { useContextMenu, type ContextMenuItem } from "../context-menu";
import { DMInlineThread, DMThreadToggleButton } from "../dm-inline-thread";
import { ProfileMiniTrigger } from "../profile-mini-card";
import { AvatarStatusOverlay } from "../status-indicator";
import { useMemberStatus } from "@/lib/use-community-members";
import { AddParticipantsDialog } from "./add-participants-dialog";
import { initials } from "@/lib/utils";

function formatMessageTime(ts: string | null | undefined) {
  // Empty / invalid strings happen during the brief window between
  // an addDoc + the serverTimestamp() resolving on the local cache.
  // tsToIso returns "" for those instead of "now" - format() would
  // throw "Invalid time value" on the resulting Invalid Date.
  if (!ts) return "Just now";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy h:mm a");
}

interface ConversationHeaderInfo {
  title: string;
  subtitle: string;
  avatars: { id: string; name: string; avatar?: string }[];
}

/**
 * Compute the title + subtitle + avatar stack for a conversation.
 * - 1:1 DM: title = the other person's name, subtitle = their status.
 * - Group: title = group name (or auto-joined participant names),
 *   subtitle = "<n> members".
 */
function useConversationHeader(
  conversation: Conversation | null,
): ConversationHeaderInfo {
  const currentUserId = useAuth((s) => s.user?.id);
  const { members } = useCommunityMembers();

  return useMemo(() => {
    if (!conversation) {
      return { title: "Conversation", subtitle: "", avatars: [] };
    }
    const others = conversation.participantIds.filter(
      (id) => id !== currentUserId,
    );
    const memberFor = (id: string) => members.find((m) => m.id === id);

    if (conversation.type === "dm" && others.length === 1) {
      const other = memberFor(others[0]);
      return {
        title: other
          ? formatDisplayName(other.name, other.nameDisplay)
          : "Direct message",
        subtitle: other?.location ?? "Direct message",
        avatars: other
          ? [{ id: other.id, name: other.name, avatar: other.avatar }]
          : [],
      };
    }

    const namedOthers = others
      .map((id) => memberFor(id))
      .filter(Boolean) as ReturnType<typeof memberFor>[];
    const fallbackName = namedOthers
      .slice(0, 3)
      .map((m) => m && formatDisplayName(m.name, m.nameDisplay).split(" ")[0])
      .filter(Boolean)
      .join(", ");
    const title =
      conversation.name?.trim() ||
      (fallbackName ? fallbackName : `Group of ${conversation.participantIds.length}`);
    const subtitle = `${conversation.participantIds.length} members`;
    const avatars = namedOthers.slice(0, 3).map((m) => ({
      id: m!.id,
      name: m!.name,
      avatar: m!.avatar,
    }));
    return { title, subtitle, avatars };
  }, [conversation, members, currentUserId]);
}

/* ------------------------------------------------------------------ */
/* Bubble                                                              */
/* ------------------------------------------------------------------ */

interface BubbleProps {
  msg: {
    id: string;
    conversationId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: string;
    attachments?: GifAttachment[];
    reactions?: Record<string, string[]>;
    editedAt?: string | null;
    threadCount?: number;
  };
  showAvatar: boolean;
  currentUserId?: string;
  onReact: (emoji: string) => void;
  onEdit: (next: string) => Promise<boolean>;
  onDelete: () => Promise<boolean>;
  sendMessage: (content: string, opts?: import("@/lib/use-conversations").DMSendOptions) => Promise<string | null>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<boolean>;
}

function MessageBubble({
  msg,
  showAvatar,
  currentUserId,
  onReact,
  onEdit,
  onDelete,
  sendMessage,
  toggleReaction: toggleReactionParent,
  deleteMessage: deleteMessageParent,
}: BubbleProps) {
  const confirm = useConfirm();
  const liveProfile = useProfileLookup(msg.userId, {
    name: msg.userName,
    avatar: msg.userAvatar,
  });
  const { status } = useMemberStatus(msg.userId);
  const isSelf = currentUserId === msg.userId;
  const rawName = liveProfile?.name || msg.userName;
  const displayName = formatDisplayName(rawName, liveProfile?.nameDisplay);
  const displayAvatar = liveProfile?.avatar || msg.userAvatar;
  const [editing, setEditing] = useState(false);
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const [threadExpanded, setThreadExpanded] = useState(false);
  const [autoFocusReply, setAutoFocusReply] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  function handleStartReply() {
    setThreadExpanded(true);
    setAutoFocusReply(true);
  }

  const ctx = useContextMenu(() => {
    const items: ContextMenuItem[] = [
      {
        kind: "row",
        id: "quick-react",
        entries: QUICK_EMOJIS.slice(0, 6).map((emoji) => ({
          id: emoji,
          label: emoji,
          title: `React with ${emoji}`,
          onSelect: () => onReact(emoji),
        })),
      },
      {
        id: "react-all",
        label: "All emojis...",
        icon: <Plus className="h-3.5 w-3.5" />,
        onSelect: () => setFullPickerOpen(true),
      },
      {
        id: "thread",
        label: "Reply in thread",
        icon: <CornerUpLeft className="h-3.5 w-3.5" />,
        onSelect: handleStartReply,
      },
      { kind: "separator" },
    ];
    if (msg.content) {
      items.push({
        id: "copy",
        label: "Copy text",
        icon: <Copy className="h-3.5 w-3.5" />,
        onSelect: () => {
          void navigator.clipboard.writeText(msg.content);
          toast.success("Copied message text.");
        },
      });
    }
    if (isSelf) {
      items.push({
        id: "edit",
        label: "Edit message",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onSelect: () => setEditing(true),
      });
      items.push({ kind: "separator" });
      items.push({
        id: "delete",
        label: "Delete message",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        danger: true,
        onSelect: () => {
          void confirm({
            title: "Delete this message?",
            description: "This can't be undone.",
            confirmText: "Delete",
            destructive: true,
          }).then((confirmed) => {
            if (!confirmed) return;
            void onDelete().then((ok) => {
              if (ok) toast.success("Message deleted.");
              else toast.error("Couldn't delete the message.");
            });
          });
        },
      });
    }
    return items;
  });

  return (
    <div className="space-y-0">
    <div
      ref={messageRef}
      onContextMenu={ctx.openAt}
      className="group relative flex gap-3 rounded-lg px-2 py-1 -mx-2 hover:bg-rosa/8 transition-colors"
    >
      {ctx.menu}
      <EmojiPickerPopover
        open={fullPickerOpen}
        triggerRef={messageRef}
        onClose={() => setFullPickerOpen(false)}
        onSelect={(emoji) => {
          onReact(emoji);
          setFullPickerOpen(false);
        }}
        placement="top-end"
      />
      <div className="w-9 shrink-0 self-start">
        {showAvatar ? (
          <ProfileMiniTrigger
            userId={msg.userId}
            snapshot={{ name: msg.userName, avatar: msg.userAvatar }}
            placement="top-start"
          >
            {({ triggerRef, onClick }) => (
              <button
                type="button"
                ref={triggerRef as React.RefObject<HTMLButtonElement>}
                onClick={onClick}
                className="relative inline-flex focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                aria-label={`View ${displayName}`}
              >
                <Avatar className="h-9 w-9 mt-0.5">
                  {displayAvatar && (
                    <AvatarImage src={displayAvatar} alt={displayName} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-xs font-semibold">
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <AvatarStatusOverlay
                  status={status}
                  size="sm"
                  borderClass="border-background"
                  className="bottom-0 right-0"
                />
              </button>
            )}
          </ProfileMiniTrigger>
        ) : (
          <span className="block h-1 w-1" aria-hidden />
        )}
      </div>
      <div className="min-w-0 flex-1">
        {showAvatar && (
          <div className="flex items-baseline gap-2">
            <ProfileMiniTrigger
              userId={msg.userId}
              snapshot={{ name: msg.userName, avatar: msg.userAvatar }}
              placement="top-start"
            >
              {({ triggerRef, onClick }) => (
                <button
                  type="button"
                  ref={triggerRef as React.RefObject<HTMLButtonElement>}
                  onClick={onClick}
                  className="text-sm font-semibold hover:underline focus:outline-none"
                >
                  {displayName}
                </button>
              )}
            </ProfileMiniTrigger>
            <span className="text-[10px] text-muted-foreground">
              {formatMessageTime(msg.timestamp)}
              {msg.editedAt && (
                <span
                  className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/70"
                  title={`Edited ${formatMessageTime(msg.editedAt)}`}
                >
                  (edited)
                </span>
              )}
            </span>
          </div>
        )}
        {editing ? (
          <MessageEditor
            initialContent={msg.content}
            onSave={onEdit}
            onCancel={() => setEditing(false)}
          />
        ) : (
          msg.content && (
            <MessageContent
              content={msg.content}
              className="text-sm leading-relaxed"
            />
          )
        )}

        {msg.attachments?.map((att, i) => (
          <div
            key={i}
            className="mt-1.5 max-w-xs rounded-lg overflow-hidden border border-rosa/20 bg-muted/30"
          >
            <Image
              src={att.url}
              alt={att.title ?? "GIF"}
              width={att.width}
              height={att.height}
              unoptimized
              className="block w-full h-auto"
            />
          </div>
        ))}

        <div className="mt-1">
          <MessageReactions
            reactions={msg.reactions ?? {}}
            currentUserId={currentUserId}
            onToggle={onReact}
          />
        </div>

        <DMThreadToggleButton
          expanded={threadExpanded}
          count={msg.threadCount ?? 0}
          onToggle={() => {
            setThreadExpanded((v) => !v);
            setAutoFocusReply(false);
          }}
        />
      </div>

      {!editing && (
        <button
          type="button"
          onClick={ctx.openAt}
          className="absolute top-1 right-1 hidden h-7 w-7 items-center justify-center rounded-full border border-rosa/30 bg-card/90 text-muted-foreground shadow-sm active:bg-primary/10 [@media(hover:none)]:inline-flex"
          aria-label="Message actions"
          title="Message actions"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      )}

      {!editing && (
        <div
          className={cn(
            "absolute -top-3 right-3 hidden gap-0.5 rounded-full bg-card border border-rosa/30 shadow-md px-1 py-0.5",
            "group-hover:flex [@media(hover:none)]:hidden",
          )}
        >
          <AddReactionButton onSelect={onReact} align="end" />
          <button
            type="button"
            onClick={handleStartReply}
            className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
            aria-label="Reply in thread"
            title="Reply in thread"
          >
            <CornerUpLeft className="h-3.5 w-3.5" />
          </button>
          <MessageActionButtons
            canEdit={isSelf}
            canDelete={isSelf}
            onEdit={() => setEditing(true)}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
    {threadExpanded && (
      <DMInlineThread
        conversationId={msg.conversationId}
        parentId={msg.id}
        parentUserName={displayName}
        sendMessage={sendMessage}
        toggleReaction={toggleReactionParent}
        deleteMessage={deleteMessageParent}
        autoFocus={autoFocusReply}
      />
    )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Typing indicator                                                    */
/* ------------------------------------------------------------------ */

function TypingRow({ userIds }: { userIds: string[] }) {
  const { members } = useCommunityMembers();
  if (userIds.length === 0) return null;

  const names = userIds
    .map((id) => members.find((m) => m.id === id))
    .filter(Boolean)
    .map((m) => formatDisplayName(m!.name, m!.nameDisplay).split(" ")[0]);

  let label: string;
  if (names.length === 0) {
    label = `${userIds.length} typing...`;
  } else if (names.length === 1) {
    label = `${names[0]} is typing`;
  } else if (names.length === 2) {
    label = `${names[0]} and ${names[1]} are typing`;
  } else {
    label = "Several people are typing";
  }

  return (
    <div className="flex items-center gap-2 px-4 py-1 text-[11px] text-muted-foreground italic">
      <span className="inline-flex gap-0.5">
        <span className="h-1 w-1 rounded-full bg-primary/60 animate-pulse" />
        <span className="h-1 w-1 rounded-full bg-primary/60 animate-pulse [animation-delay:120ms]" />
        <span className="h-1 w-1 rounded-full bg-primary/60 animate-pulse [animation-delay:240ms]" />
      </span>
      {label}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="rounded-full bg-gradient-to-br from-[#FF0099]/15 to-[#B51760]/10 p-4 ring-1 ring-[#FF0099]/20">
        <MessageSquare className="h-8 w-8 text-[#FF0099]" />
      </div>
      <div>
        <h3 className="text-lead font-bold font-[family-name:var(--font-heading)] text-[#B51760]">
          No conversation selected
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Pick a conversation from the list, or start a new one to send
          a direct message or invite a few amigas to a private group.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main view                                                           */
/* ------------------------------------------------------------------ */

interface ConversationViewProps {
  conversationId: string | null;
  onBack?: () => void;
}

export function ConversationView({ conversationId, onBack }: ConversationViewProps) {
  const currentUser = useAuth((s) => s.user);
  const confirm = useConfirm();
  const {
    messages,
    conversation,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    markAsRead,
    loading,
    error,
  } = useConversationMessages(conversationId);
  const { notifyTyping } = useTypingPublisher(conversationId);
  const typingUsers = useTypingUsers(conversation);
  const muted = useDMPrefs((s) =>
    conversationId ? s.isMuted(conversationId) : false,
  );
  const toggleMute = useDMPrefs((s) => s.toggleMute);

  const [input, setInput] = useState("");
  const [pendingGif, setPendingGif] = useState<GifAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [addPeopleOpen, setAddPeopleOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Sticky-bottom tracking: only auto-scroll on new messages when the
  // user is already near the bottom, so reading history isn't yanked.
  const atBottomRef = useRef(true);
  const justSentRef = useRef(false);
  const [showJump, setShowJump] = useState(false);
  const header = useConversationHeader(conversation);

  function isNearBottom() {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  }

  function handleScroll() {
    const atBottom = isNearBottom();
    atBottomRef.current = atBottom;
    if (atBottom) setShowJump(false);
  }

  function jumpToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    atBottomRef.current = true;
    setShowJump(false);
  }

  // Scroll behaviour:
  //  - conversation switch / initial load → snap to bottom (instant)
  //  - new message while the user is at the bottom, or that they sent →
  //    follow it (smooth)
  //  - new message while the user is reading history → stay put and
  //    surface a "new messages" affordance instead of hijacking scroll.
  const prevConvoRef = useRef<string | null>(conversationId);
  const prevDmCountRef = useRef<number>(0);
  useEffect(() => {
    const changedConvo = prevConvoRef.current !== conversationId;
    const isInitialLoad = prevDmCountRef.current === 0 && messages.length > 0;
    const grew = messages.length > prevDmCountRef.current;
    prevConvoRef.current = conversationId;
    prevDmCountRef.current = messages.length;

    if (changedConvo || isInitialLoad) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      atBottomRef.current = true;
      setShowJump(false);
      return;
    }
    if (grew) {
      if (justSentRef.current || atBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowJump(false);
      } else {
        setShowJump(true);
      }
    }
    justSentRef.current = false;
  }, [messages.length, conversationId]);

  // Mark conversation as read whenever messages change and the tab
  // is focused.
  useEffect(() => {
    if (document.visibilityState === "visible") {
      void markAsRead();
    }
    function onVisible() {
      if (document.visibilityState === "visible") void markAsRead();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [markAsRead, messages.length]);

  // Auto-grow textarea.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Reset composer state on conversation switch.
  useEffect(() => {
    setInput("");
    setPendingGif(null);
  }, [conversationId]);

  if (!conversationId) {
    return <EmptyState />;
  }

  async function handleSend() {
    const text = input.trim();
    if ((!text && !pendingGif) || sending) return;
    setSending(true);
    // The message the user sends should always pull the view to the
    // bottom, even if they'd scrolled up to read history.
    justSentRef.current = true;
    try {
      const id = await sendMessage(text, {
        attachments: pendingGif ? [pendingGif] : undefined,
      });
      if (id) {
        setInput("");
        setPendingGif(null);
        notifyTyping(false);
      } else {
        // sendMessage returned null - the underlying error has
        // already been logged + surfaced in the error banner. Toast
        // explicitly so a user staring at the composer notices.
        justSentRef.current = false;
        toast.error("Couldn't send your message. Try again in a moment.");
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value;
    setInput(next);
    notifyTyping(next.trim().length > 0);
  }

  function handlePickGif(gif: GifAttachment) {
    setPendingGif(gif);
    inputRef.current?.focus();
  }

  function handleRename() {
    if (!conversation || conversation.type !== "group") return;
    setRenameValue(conversation.name ?? "");
    setRenameOpen(true);
  }

  async function submitRename(e: React.FormEvent) {
    e.preventDefault();
    if (!conversation || conversation.type !== "group") return;
    setRenaming(true);
    try {
      const ok = await renameConversation(conversation.id, renameValue);
      if (ok) {
        toast.success("Group renamed.");
        setRenameOpen(false);
      } else {
        toast.error("Couldn't rename the group.");
      }
    } finally {
      setRenaming(false);
    }
  }

  async function handleLeave() {
    if (!conversation || !currentUser) return;
    const isDm = conversation.type === "dm";
    const ok = await confirm({
      title: isDm ? "Delete this conversation?" : `Leave ${header.title}?`,
      description: isDm
        ? "This removes the conversation for both of you. This can't be undone."
        : "You'll stop receiving messages from this group. You can be re-added later.",
      confirmText: isDm ? "Delete conversation" : "Leave group",
      destructive: true,
    });
    if (!ok) return;
    const done = await leaveConversation(conversation.id, currentUser.id);
    if (done) {
      toast.success(isDm ? "DM deleted." : "Left the group.");
      window.location.search = "";
    } else {
      toast.error("Couldn't complete that action.");
    }
  }

  function handleToggleMute() {
    if (!conversationId) return;
    toggleMute(conversationId);
    toast.success(muted ? "Notifications on" : "Conversation muted");
  }

  const isGroup = conversation?.type === "group";

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[#FACDE8]/25 glass elevate-2 px-4">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="md:hidden -ml-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Back to conversations"
            title="Back to conversations"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        {/* Avatar stack */}
        <div className="flex -space-x-2 shrink-0">
          {header.avatars.length === 0 ? (
            <Avatar className="h-7 w-7 ring-2 ring-card">
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
                {isGroup ? "GC" : "?"}
              </AvatarFallback>
            </Avatar>
          ) : (
            header.avatars.map((a) => (
              <Avatar key={a.id} className="h-7 w-7 ring-2 ring-card">
                {a.avatar && <AvatarImage src={a.avatar} alt={a.name} />}
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
                  {initials(a.name)}
                </AvatarFallback>
              </Avatar>
            ))
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-sm font-bold truncate font-[family-name:var(--font-heading)] text-[#B51760]">
              {header.title}
            </h2>
            {muted && (
              <BellOff
                className="h-3 w-3 text-muted-foreground/70 shrink-0"
                aria-label="Muted"
              />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground truncate">
            {header.subtitle}
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setAddPeopleOpen(true)}
          className="h-8 gap-1.5 text-xs"
          title="Add people"
          aria-label="Add people to this conversation"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Add people</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Conversation actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="inline-flex items-center gap-1.5 text-xs">
                <Users className="h-3 w-3" />
                {conversation?.participantIds.length ?? 0} member
                {(conversation?.participantIds.length ?? 0) === 1 ? "" : "s"}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleMute}>
              {muted ? (
                <>
                  <Bell className="mr-2 h-4 w-4" />
                  Unmute
                </>
              ) : (
                <>
                  <BellOff className="mr-2 h-4 w-4" />
                  Mute conversation
                </>
              )}
            </DropdownMenuItem>
            {isGroup && (
              <DropdownMenuItem onClick={handleRename}>
                <Pencil className="mr-2 h-4 w-4" />
                Rename group
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setAddPeopleOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add people
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLeave}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {conversation?.type === "dm" ? "Delete conversation" : "Leave group"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <div className="border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-[11px] text-destructive">
          Sync issue: {error}. Your message may not have saved.
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative flex-1 min-h-0 overflow-y-auto px-3 py-3 [background-color:#fff]"
      >
        {loading && messages.length === 0 ? (
          <p className="text-center text-xs text-muted-foreground italic py-12">
            Loading messages...
          </p>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center text-xs text-muted-foreground gap-2 px-6">
            <MessageSquare className="h-8 w-8 opacity-30" />
            <p>No messages yet. Send the first one!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg, idx) => {
              const prev = messages[idx - 1];
              const sameAuthor =
                prev &&
                prev.userId === msg.userId &&
                new Date(msg.timestamp).getTime() -
                  new Date(prev.timestamp).getTime() <
                  5 * 60 * 1000;
              return (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  showAvatar={!sameAuthor}
                  currentUserId={currentUser?.id}
                  onReact={(emoji) => void toggleReaction(msg.id, emoji)}
                  onEdit={(next) => editMessage(msg.id, next)}
                  onDelete={() => deleteMessage(msg.id)}
                  sendMessage={sendMessage}
                  toggleReaction={toggleReaction}
                  deleteMessage={deleteMessage}
                />
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
        {showJump && (
          <div className="sticky bottom-3 z-10 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={jumpToBottom}
              className="pointer-events-auto inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:brightness-110"
            >
              <ArrowDown className="h-3.5 w-3.5" />
              New messages
            </button>
          </div>
        )}
      </div>

      {/* Typing indicator */}
      <TypingRow userIds={typingUsers} />

      {/* Composer */}
      <div className="shrink-0 border-t border-[#FACDE8]/25 glass elevate-2 px-3 py-2.5">
        {pendingGif && (
          <div className="mb-2 flex items-start gap-2 rounded-lg border border-rosa/20 bg-muted/30 p-2 max-w-xs">
            <Image
              src={pendingGif.url}
              alt={pendingGif.title ?? "GIF"}
              width={pendingGif.width}
              height={pendingGif.height}
              unoptimized
              className="h-16 w-auto rounded object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">Attached GIF</p>
              <button
                type="button"
                onClick={() => setPendingGif(null)}
                className="mt-1 inline-flex items-center gap-1 text-[11px] text-destructive hover:underline"
              >
                <X className="h-3 w-3" /> Remove
              </button>
            </div>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-rosa/20 [background-color:#fff] px-3 py-2 focus-within:border-primary/40 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={() => notifyTyping(false)}
            rows={1}
            placeholder={`Message ${header.title}`}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none min-h-6 max-h-40"
          />
          <EmojiPickerButton
            onSelect={(emoji) => {
              setInput((prev) => prev + emoji);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            placement="top-end"
          />
          <GifPickerButton onSelect={handlePickGif} placement="top-end" />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingGif) || sending}
            className="h-8 w-8 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 disabled:opacity-30 shadow-[0_4px_14px_rgb(255_0_153/0.3)]"
            aria-label="Send message"
            title="Send message"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
        <p className="mt-1 text-[9px] text-muted-foreground/60 text-center">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>

      {conversation && (
        <AddParticipantsDialog
          open={addPeopleOpen}
          onOpenChange={setAddPeopleOpen}
          conversation={conversation}
        />
      )}

      {/* Rename group dialog (accessible replacement for window.prompt) */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="max-w-sm">
          <form onSubmit={submitRename}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-[#B51760]">
                <Pencil className="h-4 w-4 text-[#FF0099]" />
                Rename group
              </DialogTitle>
              <DialogDescription>
                Give this group chat a name everyone will recognize.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5 py-2">
              <Label htmlFor="rename-group" className="text-xs">
                Group name
              </Label>
              <Input
                id="rename-group"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="e.g. Cancún Crew"
                maxLength={60}
                autoFocus
                className="h-9 text-sm"
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRenameOpen(false)}
                disabled={renaming}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={renaming}
                className="bg-primary text-primary-foreground hover:bg-magenta"
              >
                {renaming ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save name"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
