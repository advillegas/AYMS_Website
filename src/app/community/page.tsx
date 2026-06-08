"use client";

import { useState, useRef, useEffect, useCallback, useMemo, memo } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Hash,
  Send,
  AlertCircle,
  MessageSquare,
  Bell,
  BellOff,
  AtSign,
  Check,
  BarChart3,
  Gift,
  Pencil,
  Trash2,
  Copy,
  Link2,
  CornerUpLeft,
  PanelRightOpen,
  Plus,
  Newspaper,
  MapPin,
  Flag,
} from "lucide-react";
import { toast } from "sonner";
import { useChat, useAuth, useCommunity } from "@/lib/store";
import { useChannels } from "@/lib/use-channels-store";
import { useNameColor, useHasPermission } from "@/lib/use-roles-store";
import { useProfileLookup } from "@/lib/profile-lookup";
import {
  useCommunityMembers,
  useMemberStatus,
} from "@/lib/use-community-members";
import { AvatarStatusOverlay } from "@/components/community/status-indicator";
import {
  useChannelChat,
  type GifAttachment,
  type RichMessage,
  type PostMedia,
} from "@/lib/use-firebase-chat";
import { VoiceChannelView } from "@/components/community/voice-channel-view";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useCommunityUI } from "@/lib/community-ui-store";
import {
  useNotificationPrefs,
  useChannelNotifications,
  type NotifyLevel,
} from "@/lib/use-channel-notifications";
import { EmojiPickerButton } from "@/components/community/emoji-picker";
import { GifPickerButton } from "@/components/community/gif-picker";
import {
  MessageReactions,
  AddReactionButton,
  QUICK_EMOJIS,
} from "@/components/community/message-reactions";
import { EmojiPickerPopover } from "@/components/community/emoji-picker-popover";
import {
  InlineThread,
  ThreadToggleButton,
} from "@/components/community/inline-thread";
import { MessageContent } from "@/components/community/message-content";
import {
  MessageEditor,
  MessageActionButtons,
} from "@/components/community/message-editor";
import {
  useContextMenu,
  type ContextMenuItem,
} from "@/components/community/context-menu";
import { PollComposer } from "@/components/community/poll-composer";
import { PollCard } from "@/components/community/poll-card";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import {
  useMentionAutocomplete,
  useCaretPosition,
  MentionList,
  applyMention,
  getMentionItems,
  type MentionItem,
} from "@/components/community/mention-autocomplete";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isToday, isYesterday } from "date-fns";
import { cn, initials } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDisplayName } from "@/lib/name-format";
import { ProfileMiniTrigger } from "@/components/community/profile-mini-card";
import { useIsMuted } from "@/lib/use-moderation-store";
import {
  ReportDialog,
  type ReportTarget,
} from "@/components/community/report-dialog";

function formatMessageTime(ts: string | null | undefined) {
  // tsToIso returns "" for unresolved serverTimestamp() values; show
  // an "in flight" label instead of throwing "Invalid time value".
  if (!ts) return "Just now";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy h:mm a");
}

interface ChatMessageProps {
  msg: RichMessage;
  channelId: string;
  onReact: (emoji: string) => void;
  onPopOutThread: () => void;
  onVotePoll: (optionId: string) => void;
  onPickWinner: () => void;
  onEdit: (newContent: string) => Promise<boolean>;
  /** Bulletin posts edit via the full composer (title + body + media)
   *  owned by the page, not the inline single-field MessageEditor. */
  onEditPost: () => void;
  onDelete: () => Promise<boolean>;
  /** Opens the report dialog for this message (page-owned dialog). */
  onReport: () => void;
  canManagePolls: boolean;
  canVotePolls: boolean;
  canModerate: boolean;
}

const ChatMessage = memo(function ChatMessage({
  msg,
  channelId,
  onReact,
  onPopOutThread,
  onVotePoll,
  onPickWinner,
  onEdit,
  onEditPost,
  onDelete,
  onReport,
  canManagePolls,
  canVotePolls,
  canModerate,
}: ChatMessageProps) {
  const currentUser = useAuth((s) => s.user);
  const confirm = useConfirm();
  const [editing, setEditing] = useState(false);
  // Thread expansion state. Inline expansion is the default UX
  // (Facebook-style); popping out into the side panel is a power-
  // user escape hatch on the hover toolbar.
  const [threadExpanded, setThreadExpanded] = useState(false);
  // Tracks whether expansion happened via the explicit Reply CTA so
  // the inline composer can grab focus on mount.
  const [autoFocusReply, setAutoFocusReply] = useState(false);
  // Full emoji picker state, opened from the right-click menu's
  // "All emojis..." action. Anchored to the message wrapper.
  const [fullPickerOpen, setFullPickerOpen] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);
  const isAuthor = currentUser?.id === msg.userId;
  // The author can always edit/delete their own. Moderators can also
  // delete (but not edit -- editing someone else's words is sketchy
  // even for mods, so we keep it author-only).
  const canEdit = isAuthor && !msg.poll;
  const canDelete = isAuthor || canModerate;

  function handleStartReply() {
    setThreadExpanded(true);
    setAutoFocusReply(true);
  }

  function handleToggleThread() {
    setThreadExpanded((v) => !v);
    setAutoFocusReply(false);
  }

  // Right-click context menu. Items are recomputed on every open via
  // the closure, so they always reflect the latest "isAuthor", etc.
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
      { kind: "separator" },
      {
        id: "thread",
        label: "Reply in thread",
        icon: <CornerUpLeft className="h-3.5 w-3.5" />,
        onSelect: handleStartReply,
      },
      {
        id: "thread-popout",
        label: "Open thread in side panel",
        icon: <PanelRightOpen className="h-3.5 w-3.5" />,
        onSelect: onPopOutThread,
      },
      { kind: "separator" },
    ];
    if (msg.content) {
      items.push({
        id: "copy-text",
        label: "Copy text",
        icon: <Copy className="h-3.5 w-3.5" />,
        onSelect: () => {
          void navigator.clipboard.writeText(msg.content);
          toast.success("Copied message text.");
        },
      });
    }
    items.push({
      id: "copy-link",
      label: "Copy message link",
      icon: <Link2 className="h-3.5 w-3.5" />,
      onSelect: () => {
        const url = `${window.location.origin}${window.location.pathname}#msg-${msg.id}`;
        void navigator.clipboard.writeText(url);
        toast.success("Copied message link.");
      },
    });
    // Report — available on anyone else's message (you can't report
    // your own). Opens the page-owned ReportDialog.
    if (!isAuthor && currentUser) {
      items.push({ kind: "separator" });
      items.push({
        id: "report",
        label: msg.isPost ? "Report post" : "Report message",
        icon: <Flag className="h-3.5 w-3.5" />,
        onSelect: onReport,
      });
    }
    if (canEdit) {
      items.push({
        id: "edit",
        label: msg.isPost ? "Edit post" : "Edit message",
        icon: <Pencil className="h-3.5 w-3.5" />,
        onSelect: () => (msg.isPost ? onEditPost() : setEditing(true)),
      });
    }
    if (canDelete) {
      items.push({ kind: "separator" });
      items.push({
        id: "delete",
        label: msg.isPost ? "Delete post" : "Delete message",
        icon: <Trash2 className="h-3.5 w-3.5" />,
        danger: true,
        onSelect: () => {
          void (async () => {
            const ok = await confirm({
              title: msg.isPost ? "Delete post?" : "Delete message?",
              description: "This can't be undone.",
              destructive: true,
              confirmText: "Delete",
            });
            if (!ok) return;
            const deleted = await onDelete();
            if (deleted)
              toast.success(msg.isPost ? "Post deleted." : "Message deleted.");
            else
              toast.error(
                msg.isPost
                  ? "Couldn't delete the post."
                  : "Couldn't delete the message.",
              );
          })();
        },
      });
    }
    return items;
  });
  const authorColor = useNameColor(msg.userId);
  // Look up the author's *current* profile so an avatar / display name
  // change retroactively shows up on every previous message they
  // posted. Falls back to the snapshot stored at send time when the
  // user can't be resolved (e.g. a member that has since left).
  const liveProfile = useProfileLookup(msg.userId, {
    name: msg.userName,
    avatar: msg.userAvatar,
  });
  const { status: authorStatus } = useMemberStatus(msg.userId);
  // The displayed user controls how their name appears to others. The
  // current viewer always sees their *own* full name though - it would
  // be jarring to look at a chat message you posted and see your name
  // truncated.
  const rawName = liveProfile?.name || msg.userName;
  // The author's chosen privacy setting applies everywhere - including
  // their own view - so what they see matches what others see.
  const displayName = formatDisplayName(rawName, liveProfile?.nameDisplay);
  const displayAvatar = liveProfile?.avatar || msg.userAvatar;
  const profileSnapshot = {
    name: msg.userName,
    avatar: msg.userAvatar,
  };
  // Bulletin posts get their own expanded card layout with the
  // standard footer actions (reactions + thread toggle) inlined so
  // the UX matches regular messages without forcing the markup into
  // the same row format.
  if (msg.isPost) {
    return (
      <div
        ref={messageRef}
        id={`msg-${msg.id}`}
        onContextMenu={ctx.openAt}
        className="space-y-0"
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
        <PostCard
          msg={msg}
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <MessageReactions
                reactions={msg.reactions ?? {}}
                currentUserId={currentUser?.id}
                onToggle={onReact}
              />
              <div className="flex items-center gap-1.5">
                <AddReactionButton onSelect={onReact} align="end" />
                <button
                  type="button"
                  onClick={handleStartReply}
                  className="text-xs font-medium text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                  title="Reply in thread"
                  aria-label={`Reply in thread to ${displayName}'s post`}
                >
                  <CornerUpLeft className="h-3.5 w-3.5" />
                  Reply
                </button>
                <ThreadToggleButton
                  expanded={threadExpanded}
                  count={msg.threadCount ?? 0}
                  onToggle={handleToggleThread}
                />
                <MessageActionButtons
                  canEdit={canEdit}
                  canDelete={canDelete}
                  onEdit={onEditPost}
                  onDelete={onDelete}
                  destructiveDeleteLabel="Delete post"
                  confirmDeletePrompt="Delete this post? This can't be undone."
                />
              </div>
            </div>
          }
        />
        {threadExpanded && (
          <InlineThread
            parentId={msg.id}
            parentUserName={displayName}
            channelId={channelId}
            autoFocus={autoFocusReply}
            canModerate={canModerate}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-0">
    <div
      ref={messageRef}
      id={`msg-${msg.id}`}
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
      <ProfileMiniTrigger
        userId={msg.userId}
        snapshot={profileSnapshot}
        placement="top-start"
      >
        {({ triggerRef, onClick }) => (
          <button
            type="button"
            ref={triggerRef as React.RefObject<HTMLButtonElement>}
            onClick={onClick}
            className="relative shrink-0 self-start focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
            aria-label={`View ${displayName}`}
          >
            <Avatar className="h-9 w-9 mt-0.5 transition-transform hover:scale-105">
              {displayAvatar && (
                <AvatarImage src={displayAvatar} alt={displayName} />
              )}
              <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-xs font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={authorStatus}
              size="sm"
              borderClass="border-background"
              className="bottom-0 right-0"
            />
          </button>
        )}
      </ProfileMiniTrigger>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2 flex-wrap">
          <ProfileMiniTrigger
            userId={msg.userId}
            snapshot={profileSnapshot}
            placement="top-start"
          >
            {({ triggerRef, onClick }) => (
              <button
                type="button"
                ref={triggerRef as React.RefObject<HTMLButtonElement>}
                onClick={onClick}
                className="text-sm font-semibold decoration-current underline-offset-2 hover:underline transition-colors focus:outline-none focus-visible:underline"
                style={authorColor ? { color: authorColor } : undefined}
              >
                {displayName}
              </button>
            )}
          </ProfileMiniTrigger>
          <span className="text-[10px] text-muted-foreground">
            {msg._pending ? (
              <span className="text-muted-foreground/50 italic">Sending...</span>
            ) : msg._failed ? (
              <span className="text-destructive font-medium">Failed to send</span>
            ) : (
              formatMessageTime(msg.timestamp)
            )}
            {msg.editedAt && !msg._pending && !msg._failed && (
              <span
                className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/70"
                title={`Edited ${formatMessageTime(msg.editedAt)}`}
              >
                (edited)
              </span>
            )}
          </span>
        </div>

        {editing ? (
          <MessageEditor
            initialContent={msg.content}
            onSave={async (next) => {
              const ok = await onEdit(next);
              return ok;
            }}
            onCancel={() => setEditing(false)}
          />
        ) : (
          msg.content && (
            <MessageContent
              content={msg.content}
              currentUserName={currentUser?.name}
            />
          )
        )}

        {msg.poll && (
          <PollCard
            messageId={msg.id}
            authorId={msg.userId}
            poll={msg.poll}
            currentUserId={currentUser?.id}
            canManage={canManagePolls}
            canVote={canVotePolls}
            onVote={onVotePoll}
            onPickWinner={onPickWinner}
          />
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
            currentUserId={currentUser?.id}
            onToggle={onReact}
          />
        </div>

        <ThreadToggleButton
          expanded={threadExpanded}
          count={msg.threadCount ?? 0}
          onToggle={handleToggleThread}
        />
      </div>

      {!editing && (
        <div
          className={cn(
            "absolute -top-3 right-3 hidden gap-0.5 rounded-full bg-card border border-rosa/30 shadow-md px-1 py-0.5",
            "group-hover:flex",
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
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <MessageActionButtons
            canEdit={canEdit}
            canDelete={canDelete}
            onEdit={() => setEditing(true)}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
    {threadExpanded && (
      <InlineThread
        parentId={msg.id}
        parentUserName={displayName}
        channelId={channelId}
        autoFocus={autoFocusReply}
        canModerate={canModerate}
      />
    )}
    </div>
  );
},
// Custom equality: skip re-render unless the message object, channel, or the
// caller's permission flags actually change. The handler props are inline
// arrows recreated on every parent render (e.g. each composer keystroke), but
// they only close over msg.id + stable store actions, so their identity is
// irrelevant to output — ignoring it here stops the whole list from
// re-rendering on every keystroke. Messages are immutable (a react/edit/
// delete produces a NEW msg object), so `prev.msg === next.msg` is a correct
// change signal.
(prev, next) =>
  prev.msg === next.msg &&
  prev.channelId === next.channelId &&
  prev.canManagePolls === next.canManagePolls &&
  prev.canVotePolls === next.canVotePolls &&
  prev.canModerate === next.canModerate,
);

const NOTIFY_LABELS: Record<NotifyLevel, string> = {
  all: "All messages",
  mentions: "Only @mentions",
  none: "Muted",
};

const NOTIFY_DESCRIPTIONS: Record<NotifyLevel, string> = {
  all: "Get a notification for every new message in this channel.",
  mentions: "Only get notified when someone @-mentions you.",
  none: "No browser notifications. The chat still updates live.",
};

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [pendingGif, setPendingGif] = useState<GifAttachment | null>(null);
  const [highlight, setHighlight] = useState(0);
  const [mentionLen, setMentionLen] = useState(0);

  const channels = useChannels((s) => s.channels);
  const activeChannel = useChat((s) => s.activeChannel);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const channel = channels.find((c) => c.id === activeChannel);
  const {
    messages,
    sendMessage,
    toggleReaction,
    editMessage,
    deleteMessage,
    createPoll,
    voteOnPoll,
    pickWinner,
    loading,
    error,
    isFirebase,
  } = useChannelChat(activeChannel);
  const canSendMessages = useHasPermission("sendMessages");
  const canCreatePolls = useHasPermission("createPolls");
  const canVotePolls = useHasPermission("votePolls");
  const canManageMessages = useHasPermission("manageMessages");
  // Report dialog — opened from a message's context menu. The target
  // captures a frozen snapshot so the moderation queue keeps context
  // even after the message is deleted.
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
  // The current user's own mute state gates the composer below.
  const currentUserId = useAuth((s) => s.user?.id);
  const isMuted = useIsMuted(currentUserId);
  const [pollComposerOpen, setPollComposerOpen] = useState(false);
  const [pollKind, setPollKind] = useState<"poll" | "giveaway">("poll");
  const [postComposerOpen, setPostComposerOpen] = useState(false);
  // The post currently being edited (null = composer is in "create"
  // mode). Driving both create + edit through one PostComposer keeps
  // the rich title/body/media editing consistent.
  const [editingPost, setEditingPost] = useState<RichMessage | null>(null);
  // Stream / posts tab toggle. Reset to "stream" whenever the active
  // channel changes so a saved tab state from another channel doesn't
  // bleed in.
  const [view, setView] = useState<"stream" | "posts">("stream");
  useEffect(() => {
    setView("stream");
  }, [activeChannel]);
  const posts = useMemo(
    () =>
      messages
        .filter((m) => m.isPost)
        .slice()
        .reverse(),
    [messages],
  );

  const openThread = useCommunityUI((s) => s.openThread);
  const mockMembers = useCommunity((s) => s.members);
  const { members: liveMembers } = useCommunityMembers();
  const members = liveMembers.length > 0 ? liveMembers : mockMembers;

  const notifyLevel = useNotificationPrefs((s) => s.getLevel(activeChannel));
  const setNotifyLevel = useNotificationPrefs((s) => s.setLevel);
  useChannelNotifications(activeChannel, messages, channel?.name ?? "general");

  const [caret, syncCaret] = useCaretPosition(inputRef);
  const mention = useMentionAutocomplete(input, caret);

  // Reset highlight when the open state or query changes.
  useEffect(() => {
    setHighlight(0);
  }, [mention.open, mention.query]);

  // Auto-grow the textarea as the user types newlines.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  // Scroll to the bottom of the chat on channel switch (instant) and
  // on new messages (smooth). Without the instant scroll on mount the
  // user sees the oldest messages first and has to wait for the smooth
  // animation to reach the bottom.
  const prevChannelRef = useRef<string>(activeChannel);
  const prevMsgCountRef = useRef<number>(0);
  useEffect(() => {
    const changedChannel = prevChannelRef.current !== activeChannel;
    const isInitialLoad = prevMsgCountRef.current === 0 && messages.length > 0;
    prevChannelRef.current = activeChannel;
    prevMsgCountRef.current = messages.length;
    bottomRef.current?.scrollIntoView({
      behavior: changedChannel || isInitialLoad ? "instant" : "smooth",
    });
  }, [messages.length, activeChannel]);

  const insertMention = useCallback(
    (item: MentionItem) => {
      const result = applyMention(input, mention, item);
      setInput(result.value);
      requestAnimationFrame(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(result.caret, result.caret);
          syncCaret();
        }
      });
    },
    [input, mention, syncCaret],
  );

  function doSend() {
    const text = input.trim();
    if (!text && !pendingGif) return;
    void sendMessage(text, {
      attachments: pendingGif ? [pendingGif] : undefined,
    });
    setInput("");
    setPendingGif(null);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleSendButton(e: React.FormEvent) {
    e.preventDefault();
    doSend();
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (mention.open && mentionLen > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => Math.min(h + 1, mentionLen - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => Math.max(h - 1, 0));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        // Resolve currently-highlighted item from the live items list.
        const items = getMentionItems(members, mention.query);
        const item = items[highlight];
        if (item) insertMention(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        // Move caret one char so the token detector closes the menu.
        setInput((v) => `${v} `);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    }
  }

  function handleEmoji(emoji: string) {
    setInput((prev) => prev + emoji);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function handleGif(gif: GifAttachment) {
    setPendingGif(gif);
    inputRef.current?.focus();
  }

  function handleOpenThread(msg: RichMessage) {
    openThread({
      channelId: activeChannel,
      parentId: msg.id,
      parentUserId: msg.userId,
      parentUserName: msg.userName,
      parentContent: msg.content,
    });
  }

  function handleReport(msg: RichMessage) {
    setReportTarget({
      targetType: "message",
      targetId: msg.id,
      reportedUserId: msg.userId,
      channelId: activeChannel,
      snapshot: {
        content: msg.isPost ? msg.postTitle ?? msg.content : msg.content,
        userName: msg.userName,
      },
    });
  }

  async function handleCreatePost(input: {
    title: string;
    body: string;
    media: PostMedia[];
  }): Promise<boolean> {
    // Edit mode: persist the post's title, body, and media back to the
    // existing doc (the composer seeds all three, so all three must
    // save — otherwise removing/adding an attachment while editing
    // would be silently dropped).
    if (editingPost) {
      const ok = await editMessage(editingPost.id, {
        postTitle: input.title,
        postBody: input.body,
        postMedia: input.media,
      });
      if (ok) setEditingPost(null);
      return ok;
    }
    const res = await sendMessage("", {
      post: {
        title: input.title,
        body: input.body,
        media: input.media,
      },
    });
    return res !== null;
  }

  // A muted member keeps read access but loses the composer. We fold
  // the mute into the same gate the permission check already drives so
  // the textarea + send button disable consistently.
  const composerEnabled = canSendMessages && !isMuted;
  const canSend = Boolean(input.trim() || pendingGif) && composerEnabled;
  const NotifyIcon =
    notifyLevel === "none" ? BellOff : notifyLevel === "mentions" ? AtSign : Bell;

  // Voice / video channels render their own surface.
  if (channel && (channel.type === "voice" || channel.type === "video")) {
    return <VoiceChannelView channel={channel} />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* Channel header */}
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-[#FACDE8]/25 px-4 glass elevate-2">
        <Hash className="h-4 w-4 text-[#FF0099]/80" />
        <h2 className="font-semibold font-[family-name:var(--font-heading)] text-[#B51760]">
          {channel?.name || "General"}
        </h2>
        {channel?.isGeoChannel && (
          <span
            className="hidden md:inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
            title={`Geo channel · ${channel.geoRadiusMiles ?? 50} mi radius`}
          >
            <MapPin className="h-3 w-3" />
            {channel.geoRadiusMiles ?? 50} mi
          </span>
        )}
        <span className="text-xs text-muted-foreground hidden sm:inline truncate">
          — {channel?.description}
        </span>
        <div className="ml-auto flex items-center gap-2">
          {/* Chat / Posts tab toggle */}
          <div
            role="tablist"
            aria-label="Channel view"
            className="inline-flex items-center rounded-full border border-[#FACDE8]/40 glass p-0.5 text-[11px] font-medium"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === "stream"}
              onClick={() => setView("stream")}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-all",
                view === "stream"
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_2px_8px_rgb(255_0_153/0.3)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <MessageSquare className="h-3 w-3" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "posts"}
              onClick={() => setView("posts")}
              className={cn(
                "flex items-center gap-1 rounded-full px-2.5 py-0.5 transition-all",
                view === "posts"
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_2px_8px_rgb(255_0_153/0.3)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Newspaper className="h-3 w-3" />
              <span className="hidden sm:inline">Posts</span>
              {posts.length > 0 && (
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1 text-[9px] tabular-nums",
                    view === "posts"
                      ? "bg-white/30"
                      : "bg-primary/15 text-primary",
                  )}
                >
                  {posts.length}
                </span>
              )}
            </button>
          </div>

          {canSendMessages && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 gap-1 border-[#FF0099]/40 text-[#B51760] hover:bg-[#FF0099]/10 hover:border-[#FF0099]/60"
              onClick={() => setPostComposerOpen(true)}
              title="New bulletin post"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Post</span>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={`Notifications: ${NOTIFY_LABELS[notifyLevel]}`}
              title={`Notifications: ${NOTIFY_LABELS[notifyLevel]}`}
            >
              <NotifyIcon className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Notify me about…</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["all", "mentions", "none"] as NotifyLevel[]).map((lvl) => (
                <DropdownMenuItem
                  key={lvl}
                  onClick={() => setNotifyLevel(activeChannel, lvl)}
                  className="flex items-start gap-2 py-2"
                >
                  <span className="w-4 mt-0.5 shrink-0">
                    {notifyLevel === lvl && <Check className="h-3.5 w-3.5" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium">
                      {NOTIFY_LABELS[lvl]}
                    </span>
                    <span className="block text-[11px] text-muted-foreground leading-snug">
                      {NOTIFY_DESCRIPTIONS[lvl]}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 hidden md:inline">
            {!isFirebaseConfigured
              ? "Local mode"
              : isFirebase
                ? "Live · Realtime"
                : ""}
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-b border-destructive/30 bg-destructive/10 px-4 py-2 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            Chat sync issue: {error}. New messages may not be saved.
          </span>
        </div>
      )}

      {/* Messages */}
      {/* min-h-0 is critical: without it, flex-1 lets this child grow
          to fit its content (no overflow, no scroll). With min-h-0
          the child can shrink below content size so the inner
          ScrollArea viewport actually scrolls. */}
      {view === "stream" ? (
        <ScrollArea className="flex-1 min-h-0 px-4 py-4 [background-color:#fff]">
          <div
            className="space-y-2"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label={`Messages in ${channel?.name ?? "this channel"}`}
          >
            {loading && messages.length === 0 && (
              <div className="flex justify-center py-12 text-xs text-muted-foreground">
                Loading messages…
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="rounded-full bg-gradient-to-br from-[#FF0099]/15 to-[#B51760]/10 p-4 mb-4 ring-1 ring-[#FF0099]/20">
                  <Hash className="h-10 w-10 text-[#FF0099]" />
                </div>
                <p className="text-title font-bold font-[family-name:var(--font-heading)] text-[#B51760]">
                  Welcome to #{channel?.name}
                </p>
                <p className="text-sm text-muted-foreground mt-2 max-w-xs">
                  {channel?.description}
                </p>
                <p className="text-sm text-muted-foreground mt-3 max-w-xs">
                  It&apos;s quiet in here… for now. Say{" "}
                  <span className="font-semibold text-[#B51760]">¡hola!</span>{" "}
                  and start the conversation, amiga. 💕
                </p>
              </div>
            )}
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                channelId={activeChannel}
                onReact={(e) => toggleReaction(msg.id, e)}
                onPopOutThread={() => handleOpenThread(msg)}
                onVotePoll={(optionId) => voteOnPoll(msg.id, optionId)}
                onPickWinner={() => void pickWinner(msg.id)}
                onEdit={(next) => editMessage(msg.id, next)}
                onEditPost={() => setEditingPost(msg)}
                onDelete={() => deleteMessage(msg.id)}
                onReport={() => handleReport(msg)}
                canManagePolls={canManageMessages}
                canVotePolls={canVotePolls}
                canModerate={canManageMessages}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 min-h-0 px-4 py-4 [background-color:#fff]">
          <div className="mx-auto max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-title font-bold font-[family-name:var(--font-heading)] text-[#B51760]">
                  Posts in #{channel?.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Long-form announcements and discussion threads.
                </p>
              </div>
              {canSendMessages && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setPostComposerOpen(true)}
                  className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 gap-1 shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New post
                </Button>
              )}
            </div>
            {loading && posts.length === 0 && (
              <div className="flex justify-center py-12 text-xs text-muted-foreground">
                Loading posts…
              </div>
            )}
            {!loading && posts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-rosa/30 bg-rosa/5">
                <Newspaper className="h-10 w-10 text-primary/40 mb-2" />
                <p className="text-sm font-medium">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                  Be the first to share something with the amigas ♡
                </p>
              </div>
            )}
            {posts.map((msg) => (
              <ChatMessage
                key={msg.id}
                msg={msg}
                channelId={activeChannel}
                onReact={(e) => toggleReaction(msg.id, e)}
                onPopOutThread={() => handleOpenThread(msg)}
                onVotePoll={(optionId) => voteOnPoll(msg.id, optionId)}
                onPickWinner={() => void pickWinner(msg.id)}
                onEdit={(next) => editMessage(msg.id, next)}
                onEditPost={() => setEditingPost(msg)}
                onDelete={() => deleteMessage(msg.id)}
                onReport={() => handleReport(msg)}
                canManagePolls={canManageMessages}
                canVotePolls={canVotePolls}
                canModerate={canManageMessages}
              />
            ))}
          </div>
        </ScrollArea>
      )}

      {pendingGif && (
        <div className="flex items-center gap-2 border-t border-rosa/20 px-4 py-2 bg-rosa/5">
          <Image
            src={pendingGif.url}
            alt={pendingGif.title ?? "GIF"}
            width={pendingGif.width}
            height={pendingGif.height}
            unoptimized
            className="h-12 w-auto rounded border border-rosa/20"
          />
          <span className="text-xs text-muted-foreground truncate flex-1">
            {pendingGif.title || "GIF attached"}
          </span>
          <button
            type="button"
            onClick={() => setPendingGif(null)}
            className="text-xs text-destructive hover:underline"
          >
            Remove
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="relative border-t border-[#FACDE8]/25 px-4 py-3 glass elevate-2">
        {!canSendMessages && (
          <div className="mb-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[11px] text-amber-900 dark:text-amber-200">
            You don&apos;t have permission to send messages in this channel.
          </div>
        )}
        {canSendMessages && isMuted && (
          <div className="mb-2 flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
            <Flag className="h-3.5 w-3.5 shrink-0" />
            You&apos;ve been muted by a moderator and can&apos;t post right now.
            You can still read the conversation.
          </div>
        )}
        {mention.open && (
          <div className="absolute bottom-full left-4 right-4 mb-2 z-30">
            <MentionList
              query={mention.query}
              highlightedIndex={highlight}
              onHighlightChange={setHighlight}
              onSelect={insertMention}
              onLengthChange={setMentionLen}
            />
          </div>
        )}
        <form onSubmit={handleSendButton} className="flex gap-2 items-end">
          <div className="flex items-center gap-1">
            <EmojiPickerButton onSelect={handleEmoji} placement="top-start" />
            <GifPickerButton onSelect={handleGif} placement="top-start" />
            {canCreatePolls && (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setPollKind("poll");
                    setPollComposerOpen(true);
                  }}
                  aria-label="Create poll"
                  title="Create poll"
                >
                  <BarChart3 className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-primary"
                  onClick={() => {
                    setPollKind("giveaway");
                    setPollComposerOpen(true);
                  }}
                  aria-label="Run giveaway"
                  title="Run giveaway"
                >
                  <Gift className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              syncCaret();
            }}
            onKeyDown={handleKeyDown}
            onSelect={syncCaret}
            disabled={!composerEnabled}
            placeholder={
              isMuted
                ? "You're muted — you can't post right now"
                : canSendMessages
                  ? `Message #${channel?.name || "general"}…  (Shift+Enter for new line, @ to mention)`
                  : "Read-only channel"
            }
            rows={1}
            autoFocus
            className="flex-1 resize-none overflow-hidden rounded-md border border-rosa/30 [background-color:#fff] px-3 py-2 text-sm leading-snug focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/70 max-h-[200px] disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!canSend}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white border-0 disabled:opacity-40 rounded-full shrink-0 shadow-[0_4px_14px_rgb(255_0_153/0.35)] hover:brightness-110 lift"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <PollComposer
        open={pollComposerOpen}
        onOpenChange={setPollComposerOpen}
        onCreate={createPoll}
        defaultKind={pollKind}
      />

      <PostComposer
        open={postComposerOpen || editingPost !== null}
        onOpenChange={(o) => {
          if (!o) {
            setPostComposerOpen(false);
            setEditingPost(null);
          } else {
            setPostComposerOpen(true);
          }
        }}
        onSubmit={handleCreatePost}
        channelName={channel?.name}
        initialValues={
          editingPost
            ? {
                title: editingPost.postTitle ?? "",
                body: editingPost.postBody ?? editingPost.content ?? "",
                media: editingPost.postMedia ?? [],
              }
            : undefined
        }
      />

      <ReportDialog
        open={reportTarget !== null}
        onOpenChange={(o) => {
          if (!o) setReportTarget(null);
        }}
        target={reportTarget}
      />
    </div>
  );
}
