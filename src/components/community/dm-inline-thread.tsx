"use client";

/**
 * Inline thread for DMs and group chats.
 *
 * Same UX as the channel InlineThread — left-border-indented column
 * of replies beneath a parent message, with an inline composer
 * supporting emoji, GIF, and @mentions. Backed by the DM
 * subcollection `conversations/{id}/messages` with threadParentId.
 *
 * Both sender and receiver see threads in realtime because the
 * useConversationThreadReplies hook subscribes to the same
 * subcollection via onSnapshot.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Send,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  CornerDownRight,
} from "lucide-react";
import { format, parseISO, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import {
  useConversationThreadReplies,
  type DMMessage,
  type DMSendOptions,
} from "@/lib/use-conversations";
import type { GifAttachment } from "@/lib/use-firebase-chat";
import { useProfileLookup } from "@/lib/profile-lookup";
import { useMemberStatus, useCommunityMembers } from "@/lib/use-community-members";
import { useNameColor } from "@/lib/use-roles-store";
import { formatDisplayName } from "@/lib/name-format";
import { initials } from "@/lib/utils";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { AvatarStatusOverlay } from "./status-indicator";
import { ProfileMiniTrigger } from "./profile-mini-card";
import {
  MessageReactions,
  AddReactionButton,
} from "./message-reactions";
import { EmojiPickerButton } from "./emoji-picker";
import { GifPickerButton } from "./gif-picker";
import { MessageContent } from "./message-content";
import {
  useMentionAutocomplete,
  useCaretPosition,
  MentionList,
  applyMention,
  getMentionItems,
} from "./mention-autocomplete";
import { useCommunity } from "@/lib/store";

function formatReplyTime(ts: string | null | undefined) {
  if (!ts) return "Just now";
  const d = parseISO(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  if (isToday(d)) return format(d, "h:mm a");
  if (isYesterday(d)) return `Yesterday ${format(d, "h:mm a")}`;
  return format(d, "MMM d, h:mm a");
}

/* ------------------------------------------------------------------ */
/* Reply row                                                           */
/* ------------------------------------------------------------------ */

interface ReplyRowProps {
  reply: DMMessage;
  onReact: (emoji: string) => void;
  onDelete: () => Promise<boolean>;
  onReplyTo: (authorName: string) => void;
}

function DMReplyRow({ reply, onReact, onDelete, onReplyTo }: ReplyRowProps) {
  const currentUser = useAuth((s) => s.user);
  const confirm = useConfirm();
  const isAuthor = currentUser?.id === reply.userId;
  const liveProfile = useProfileLookup(reply.userId, {
    name: reply.userName,
    avatar: reply.userAvatar,
  });
  const { status } = useMemberStatus(reply.userId);
  const nameColor = useNameColor(reply.userId);
  const rawName = liveProfile?.name || reply.userName;
  const displayName = formatDisplayName(rawName, liveProfile?.nameDisplay);
  const displayAvatar = liveProfile?.avatar || reply.userAvatar;

  return (
    <div className="group flex gap-2 py-1">
      <ProfileMiniTrigger
        userId={reply.userId}
        snapshot={{ name: reply.userName, avatar: reply.userAvatar }}
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
            <Avatar className="h-6 w-6">
              {displayAvatar && (
                <AvatarImage src={displayAvatar} alt={displayName} />
              )}
              <AvatarFallback className="text-[9px] bg-gradient-to-br from-primary/30 to-rosa/40 text-primary font-semibold">
                {initials(displayName)}
              </AvatarFallback>
            </Avatar>
            <AvatarStatusOverlay
              status={status}
              size="xs"
              borderClass="border-background"
              className="bottom-0 right-0"
            />
          </button>
        )}
      </ProfileMiniTrigger>

      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-rosa/10 px-3 py-1.5">
          <ProfileMiniTrigger
            userId={reply.userId}
            snapshot={{ name: reply.userName, avatar: reply.userAvatar }}
            placement="top-start"
          >
            {({ triggerRef, onClick }) => (
              <button
                type="button"
                ref={triggerRef as React.RefObject<HTMLButtonElement>}
                onClick={onClick}
                className="text-[11px] font-semibold hover:underline focus:outline-none"
                style={nameColor ? { color: nameColor } : undefined}
              >
                {displayName}
              </button>
            )}
          </ProfileMiniTrigger>
          {reply.content && (
            <MessageContent
              content={reply.content}
              className="text-sm leading-snug"
            />
          )}
          {reply.attachments?.map((att, i) => (
            <div
              key={i}
              className="mt-1.5 max-w-[200px] rounded-lg overflow-hidden border border-rosa/20 bg-muted/30"
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
        </div>

        <div className="mt-0.5 flex items-center gap-2 px-1 text-[10px] text-muted-foreground">
          <span>{formatReplyTime(reply.timestamp)}</span>
          {reply.editedAt && <span>· edited</span>}
          <button
            type="button"
            onClick={() => onReplyTo(displayName)}
            className="font-semibold hover:text-primary hover:underline"
          >
            Reply
          </button>
        </div>

        {Object.keys(reply.reactions ?? {}).length > 0 && (
          <div className="mt-1">
            <MessageReactions
              reactions={reply.reactions ?? {}}
              currentUserId={currentUser?.id}
              onToggle={onReact}
            />
          </div>
        )}
      </div>

      <div className="hidden self-start gap-0.5 group-hover:flex">
        <button
          type="button"
          onClick={() => onReplyTo(displayName)}
          className="rounded-full p-1 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
          title={`Reply to ${displayName}`}
          aria-label={`Reply to ${displayName}`}
        >
          <CornerDownRight className="h-3.5 w-3.5" />
        </button>
        <AddReactionButton onSelect={onReact} align="end" />
        {isAuthor && (
          <button
            type="button"
            onClick={() => {
              void confirm({
                title: "Delete this reply?",
                description: "This can't be undone.",
                confirmText: "Delete",
                destructive: true,
              }).then((confirmed) => {
                if (!confirmed) return;
                void onDelete().then((ok) => {
                  if (ok) toast.success("Reply deleted.");
                  else toast.error("Couldn't delete reply.");
                });
              });
            }}
            className="rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            title="Delete reply"
            aria-label="Delete reply"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline thread                                                       */
/* ------------------------------------------------------------------ */

interface DMInlineThreadProps {
  conversationId: string;
  parentId: string;
  parentUserName: string;
  sendMessage: (content: string, opts?: DMSendOptions) => Promise<string | null>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<boolean>;
  autoFocus?: boolean;
}

export function DMInlineThread({
  conversationId,
  parentId,
  parentUserName,
  sendMessage,
  toggleReaction,
  deleteMessage,
  autoFocus,
}: DMInlineThreadProps) {
  const user = useAuth((s) => s.user);
  const { replies, loading } = useConversationThreadReplies(
    conversationId,
    parentId,
  );
  const [input, setInput] = useState("");
  const [pendingGif, setPendingGif] = useState<GifAttachment | null>(null);
  const [sending, setSending] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [mentionLen, setMentionLen] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [caret, syncCaret] = useCaretPosition(inputRef);
  const mention = useMentionAutocomplete(input, caret);
  const mockMembers = useCommunity((s) => s.members);
  const { members: liveMembers } = useCommunityMembers();
  const mentionPool = liveMembers.length > 0 ? liveMembers : mockMembers;

  useEffect(() => {
    setHighlight(0);
  }, [mention.open, mention.query]);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const insertMention = useCallback(
    (item: Parameters<typeof applyMention>[2]) => {
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

  function handleReplyTo(authorName: string) {
    const slug = authorName.toLowerCase().replace(/\s+/g, "-");
    const prefix = `@${slug} `;
    setInput((prev) => (prev.startsWith(prefix) ? prev : prefix + prev));
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) {
        el.focus();
        const pos = el.value.length;
        el.setSelectionRange(pos, pos);
        syncCaret();
      }
    });
  }

  async function handleSend() {
    const text = input.trim();
    if (!text && !pendingGif) return;
    if (!user || sending) return;
    setSending(true);
    try {
      const id = await sendMessage(text, {
        threadParentId: parentId,
        attachments: pendingGif ? [pendingGif] : undefined,
      });
      if (id) {
        setInput("");
        setPendingGif(null);
      } else {
        toast.error("Couldn't send your reply.");
      }
    } finally {
      setSending(false);
    }
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
        const items = getMentionItems(mentionPool, mention.query);
        const item = items[highlight];
        if (item) insertMention(item);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setInput((v) => `${v} `);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  const replyTo = parentUserName.split(" ")[0];

  return (
    <div className="ml-11 mt-1 border-l-2 border-rosa/30 pl-3">
      {loading && replies.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic py-1">
          Loading replies...
        </p>
      ) : (
        <div className="space-y-1">
          {replies.map((r) => (
            <DMReplyRow
              key={r.id}
              reply={r}
              onReact={(e) => toggleReaction(r.id, e)}
              onDelete={() => deleteMessage(r.id)}
              onReplyTo={handleReplyTo}
            />
          ))}
        </div>
      )}

      {/* Inline composer with mention autocomplete */}
      <div className="relative mt-2 space-y-1.5">
        {mention.open && (
          <div className="absolute bottom-full left-0 right-0 mb-1 z-30">
            <MentionList
              query={mention.query}
              highlightedIndex={highlight}
              onHighlightChange={setHighlight}
              onSelect={insertMention}
              onLengthChange={setMentionLen}
            />
          </div>
        )}
        {pendingGif && (
          <div className="flex items-start gap-2 rounded-lg border border-rosa/20 bg-muted/30 p-2 max-w-[200px] ml-8">
            <Image
              src={pendingGif.url}
              alt={pendingGif.title ?? "GIF"}
              width={pendingGif.width}
              height={pendingGif.height}
              unoptimized
              className="h-14 w-auto rounded object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              className="mt-0.5 inline-flex items-center text-[10px] text-destructive hover:underline"
              aria-label="Remove attached GIF"
              title="Remove attached GIF"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-2 rounded-xl border border-rosa/20 [background-color:#fff] px-2.5 py-1.5">
          <Avatar className="h-6 w-6 shrink-0 self-end">
            {user?.avatar && (
              <AvatarImage src={user.avatar} alt={user.name} />
            )}
            <AvatarFallback className="bg-gradient-to-br from-primary/30 to-rosa/40 text-primary text-[9px] font-semibold">
              {user ? initials(user.name) : "?"}
            </AvatarFallback>
          </Avatar>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              syncCaret();
            }}
            onKeyDown={handleKeyDown}
            onSelect={syncCaret}
            placeholder={`Reply to ${replyTo}... (@ to mention)`}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm placeholder:text-muted-foreground/60 outline-none min-h-5 max-h-36"
          />
          <EmojiPickerButton
            onSelect={(emoji) => {
              setInput((prev) => prev + emoji);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            placement="top-end"
          />
          <GifPickerButton
            onSelect={(gif) => {
              setPendingGif(gif);
              inputRef.current?.focus();
            }}
            placement="top-end"
          />
          <Button
            type="button"
            size="icon"
            onClick={handleSend}
            disabled={(!input.trim() && !pendingGif) || sending}
            className="h-7 w-7 rounded-full bg-primary text-primary-foreground hover:bg-magenta disabled:opacity-30"
            aria-label="Send reply"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle button                                                       */
/* ------------------------------------------------------------------ */

export function DMThreadToggleButton({
  expanded,
  count,
  onToggle,
}: {
  expanded: boolean;
  count: number;
  onToggle: () => void;
}) {
  if (count === 0 && !expanded) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className="ml-11 mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline focus:outline-none"
    >
      {expanded ? (
        <>
          <ChevronUp className="h-3 w-3" />
          Hide replies
        </>
      ) : (
        <>
          <ChevronDown className="h-3 w-3" />
          View {count} {count === 1 ? "reply" : "replies"}
        </>
      )}
    </button>
  );
}
