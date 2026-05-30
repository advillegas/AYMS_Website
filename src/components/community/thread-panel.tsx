"use client";

import { useState, useRef, useEffect } from "react";
import NextImage from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/store";
import { useCommunityUI } from "@/lib/community-ui-store";
import {
  useThreadMessages,
  useChannelChat,
  type RichMessage,
  type GifAttachment,
} from "@/lib/use-firebase-chat";
import { useProfileLookup } from "@/lib/profile-lookup";
import { useMemberStatus } from "@/lib/use-community-members";
import { AvatarStatusOverlay } from "./status-indicator";
import { format, parseISO } from "date-fns";
import { Send, X, MessageSquare } from "lucide-react";
import { MessageReactions } from "./message-reactions";
import { MessageContent } from "./message-content";
import { EmojiPickerButton } from "./emoji-picker";
import { GifPickerButton } from "./gif-picker";
import { cn } from "@/lib/utils";
import { formatDisplayName } from "@/lib/name-format";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

interface ThreadParentPreviewProps {
  parentUserId?: string;
  parentUserName: string;
  parentContent: string;
}

function ThreadParentPreview({
  parentUserId,
  parentUserName,
  parentContent,
}: ThreadParentPreviewProps) {
  // Resolve the live profile so the parent author's name reflects
  // their current display preference - and updates instantly if they
  // tweak it while the thread is open. The privacy setting applies to
  // the user's own view too.
  const profile = useProfileLookup(parentUserId, { name: parentUserName });
  const rawName = profile?.name || parentUserName;
  const displayName = formatDisplayName(rawName, profile?.nameDisplay);
  return (
    <div className="rounded-lg border border-rosa/30 bg-rosa/10 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1">
        {displayName}
      </p>
      <p className="text-xs text-foreground/80 line-clamp-4 break-words">
        {parentContent || "(attachment)"}
      </p>
    </div>
  );
}

function ReplyBubble({ msg }: { msg: RichMessage }) {
  const user = useAuth((s) => s.user);
  const own = user?.id === msg.userId;
  // Live lookup so old replies show the author's current avatar/name
  // even after they update their profile.
  const liveProfile = useProfileLookup(msg.userId, {
    name: msg.userName,
    avatar: msg.userAvatar,
  });
  const { status } = useMemberStatus(msg.userId);
  const rawName = liveProfile?.name || msg.userName;
  const displayName = formatDisplayName(rawName, liveProfile?.nameDisplay);
  const displayAvatar = liveProfile?.avatar || msg.userAvatar;
  return (
    <div className={cn("flex gap-2", own && "flex-row-reverse")}>
      <span className="relative inline-flex shrink-0">
        <Avatar className="h-7 w-7">
          {displayAvatar && <AvatarImage src={displayAvatar} alt={displayName} />}
          <AvatarFallback className="bg-gradient-to-br from-primary/30 to-rosa/40 text-primary text-[10px] font-semibold">
            {initials(displayName)}
          </AvatarFallback>
        </Avatar>
        <AvatarStatusOverlay
          status={status}
          size="xs"
          borderClass="border-background"
          className="bottom-0 right-0"
        />
      </span>
      <div className={cn("min-w-0 flex-1", own && "text-right")}>
        <div
          className={cn(
            "flex items-baseline gap-2 text-[11px]",
            own && "justify-end",
          )}
        >
          <span className="font-semibold">{displayName}</span>
          <span className="text-muted-foreground">
            {(() => {
              if (!msg.timestamp) return "Just now";
              const d = parseISO(msg.timestamp);
              if (Number.isNaN(d.getTime())) return "Just now";
              return format(d, "h:mm a");
            })()}
          </span>
        </div>
        <div
          className={cn(
            "mt-1 inline-block rounded-2xl px-3 py-1.5 text-sm break-words max-w-full",
            own
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-rosa/15 text-foreground rounded-tl-sm",
          )}
        >
          {msg.content && (
            <MessageContent content={msg.content} className="text-sm" />
          )}
        </div>
        {msg.attachments?.map((att, i) => (
          <div
            key={i}
            className="mt-1.5 max-w-[200px] rounded-lg overflow-hidden border border-rosa/20 bg-muted/30"
          >
            <NextImage
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
    </div>
  );
}

export function ThreadPanel() {
  const thread = useCommunityUI((s) => s.activeThread);
  const closeThread = useCommunityUI((s) => s.closeThread);
  const user = useAuth((s) => s.user);
  const { sendMessage, toggleReaction } = useChannelChat(thread?.channelId ?? "");
  const { replies } = useThreadMessages(thread?.parentId ?? null);
  const [input, setInput] = useState("");
  const [pendingGif, setPendingGif] = useState<GifAttachment | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  if (!thread) return null;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if ((!input.trim() && !pendingGif) || !user || !thread) return;
    const text = input;
    setInput("");
    setPendingGif(null);
    await sendMessage(text, {
      threadParentId: thread.parentId,
      attachments: pendingGif ? [pendingGif] : undefined,
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-rosa/20 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="h-3.5 w-3.5 text-primary/70 shrink-0" />
          <span className="text-xs font-semibold uppercase tracking-wider text-primary/70">
            Thread
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={closeThread}
          aria-label="Close thread"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Parent message preview */}
        <ThreadParentPreview
          parentUserId={thread.parentUserId}
          parentUserName={thread.parentUserName}
          parentContent={thread.parentContent}
        />

        {replies.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No replies yet. Start the conversation!
          </p>
        ) : (
          replies.map((r) => (
            <div key={r.id} className="space-y-1">
              <ReplyBubble msg={r} />
              {Object.keys(r.reactions ?? {}).length > 0 && (
                <div className={cn("ml-9", user?.id === r.userId && "mr-9 ml-0 text-right")}>
                  <MessageReactions
                    reactions={r.reactions ?? {}}
                    currentUserId={user?.id}
                    onToggle={(emoji) => toggleReaction(r.id, emoji)}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="border-t border-rosa/20 p-2 space-y-1.5">
        {pendingGif && (
          <div className="flex items-start gap-2 rounded-lg border border-rosa/20 bg-muted/30 p-2 max-w-[200px]">
            <NextImage
              src={pendingGif.url}
              alt={pendingGif.title ?? "GIF"}
              width={pendingGif.width}
              height={pendingGif.height}
              unoptimized
              className="h-12 w-auto rounded object-cover"
            />
            <button
              type="button"
              onClick={() => setPendingGif(null)}
              className="mt-0.5 text-[10px] text-destructive hover:underline"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <form
          onSubmit={handleSend}
          className="flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Reply in thread..."
            className="h-9 text-sm [background-color:#fff] focus:outline-none"
          />
          <EmojiPickerButton
            onSelect={(emoji) => setInput((prev) => prev + emoji)}
            placement="top-end"
          />
          <GifPickerButton
            onSelect={(gif) => setPendingGif(gif)}
            placement="top-end"
          />
          <Button
            type="submit"
            size="icon"
            className="h-9 w-9 shrink-0 rounded-full bg-primary hover:bg-magenta"
            disabled={!input.trim() && !pendingGif}
            aria-label="Send reply"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
