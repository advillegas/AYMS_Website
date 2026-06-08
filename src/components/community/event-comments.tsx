"use client";

/**
 * Event comment thread — renders the comment list + composer for a
 * single calendar event. Drops into the calendar event detail
 * dialog and uses the same Firestore-backed `useEventComments` hook
 * so multiple viewers stay in sync in realtime.
 */

import { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Loader2, MessageCircle, Send, Trash2 } from "lucide-react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  useEventComments,
  type EventComment,
} from "@/lib/use-event-comments";
import { cn, initials } from "@/lib/utils";

interface EventCommentsProps {
  eventId: string;
  className?: string;
}

function formatCommentTime(ts: string): string {
  if (!ts) return "Just now";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  // Within a day → relative ("2 hours ago"); after that → absolute
  const ageMs = Date.now() - d.getTime();
  if (ageMs < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(d, { addSuffix: true });
  }
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy");
}

interface CommentRowProps {
  comment: EventComment;
  canDelete: boolean;
  onDelete: () => void;
}

function CommentRow({ comment, canDelete, onDelete }: CommentRowProps) {
  return (
    <div className="flex gap-2.5 group">
      <Avatar className="h-7 w-7 mt-0.5 shrink-0">
        {comment.userAvatar && (
          <AvatarImage src={comment.userAvatar} alt={comment.userName} />
        )}
        <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
          {initials(comment.userName)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 rounded-2xl bg-rosa/5 px-3 py-2 border border-rosa/15">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold truncate">
              {comment.userName}
            </span>
            <span className="text-[10px] text-muted-foreground/80">·</span>
            <span className="text-[10px] text-muted-foreground/80 truncate">
              {formatCommentTime(comment.createdAt)}
            </span>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 rounded-full p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
              aria-label="Delete comment"
              title="Delete comment"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
        <p className="text-sm whitespace-pre-wrap leading-snug mt-0.5 text-foreground/90">
          {comment.content}
        </p>
      </div>
    </div>
  );
}

export function EventComments({ eventId, className }: EventCommentsProps) {
  const user = useAuth((s) => s.user);
  const canModerate = useHasPermission("manageMessages");
  const confirm = useConfirm();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { comments, loading, addComment, deleteComment, isFirebase } =
    useEventComments(eventId);

  async function handleSubmit() {
    const text = draft.trim();
    if (!text) return;
    setSubmitting(true);
    const ok = await addComment(text);
    setSubmitting(false);
    if (ok) {
      setDraft("");
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      toast.error(
        isFirebase
          ? "Couldn't post that comment. Try again."
          : "Comments require Firestore — set it up to enable this feature.",
      );
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center gap-1.5">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-primary/70">
          Discussion
          {comments.length > 0 && (
            <span className="ml-1 normal-case text-muted-foreground">
              · {comments.length} {comments.length === 1 ? "comment" : "comments"}
            </span>
          )}
        </h3>
      </div>

      {!isFirebase && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
          Comments are stored in Firestore. Connect Firebase to enable
          discussion threads on calendar events.
        </div>
      )}

      <div
        className="space-y-2.5 max-h-72 overflow-y-auto pr-1"
        role="log"
        aria-label="Event comments"
        aria-live="polite"
      >
        {loading && comments.length === 0 && (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading comments…
          </div>
        )}
        {!loading && comments.length === 0 && isFirebase && (
          <p className="text-xs text-muted-foreground italic py-2">
            No comments yet. Be the first to start the discussion.
          </p>
        )}
        {comments.map((c) => {
          const canDeleteThis = !!user && (c.userId === user.id || canModerate);
          return (
            <CommentRow
              key={c.id}
              comment={c}
              canDelete={canDeleteThis}
              onDelete={async () => {
                const confirmed = await confirm({
                  title: "Delete comment?",
                  description: "This can't be undone.",
                  confirmText: "Delete",
                  destructive: true,
                });
                if (!confirmed) return;
                const ok = await deleteComment(c.id);
                if (ok) toast.success("Comment deleted.");
                else toast.error("Couldn't delete that comment.");
              }}
            />
          );
        })}
      </div>

      {user && isFirebase && (
        <div className="flex gap-2 items-end">
          <Avatar className="h-7 w-7 shrink-0">
            {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
            <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
              {initials(user.name)}
            </AvatarFallback>
          </Avatar>
          <textarea
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (Enter to send, Shift+Enter for new line)"
            aria-label="Add a comment"
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-rosa/30 [background-color:#fff] px-3 py-1.5 text-sm leading-snug focus:outline-none focus:border-primary/40 placeholder:text-muted-foreground/70 max-h-[120px] overflow-hidden"
          />
          <Button
            type="button"
            size="icon"
            onClick={() => void handleSubmit()}
            disabled={!draft.trim() || submitting}
            className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-r from-primary to-magenta text-white border-0 disabled:opacity-40"
            aria-label="Post comment"
          >
            {submitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      )}
    </section>
  );
}
