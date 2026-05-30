"use client";

/**
 * Bulletin-style post card.
 *
 * Renders a `RichMessage` with `isPost: true` as an expanded card —
 * larger title, multi-paragraph body, optional media grid, and the
 * standard reaction + thread affordances. Shared between the chat
 * stream (where it sits inline alongside regular messages) and the
 * dedicated Posts tab (where it's the only thing rendered).
 */

import { useState } from "react";
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Maximize2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { format, isToday, isYesterday } from "date-fns";
import type { RichMessage, PostMedia } from "@/lib/use-firebase-chat";
import { ProfileMiniTrigger } from "./profile-mini-card";
import { useNameColor } from "@/lib/use-roles-store";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatPostTime(ts: string | null | undefined) {
  if (!ts) return "Just now";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "Just now";
  if (isToday(d)) return `Today at ${format(d, "h:mm a")}`;
  if (isYesterday(d)) return `Yesterday at ${format(d, "h:mm a")}`;
  return format(d, "MMM d, yyyy");
}

interface PostCardProps {
  msg: RichMessage;
  /**
   * Optional slot for the chat-stream variant: reactions + thread
   * toggles are owned by the parent (so they share the same UX as
   * regular messages). Pass `null` to render a plain card (Posts
   * tab) without those affordances.
   */
  footer?: React.ReactNode;
  /**
   * Compact rendering for inline chat stream — limits body height
   * with a "Read more" expand affordance. Default true.
   */
  collapsible?: boolean;
  className?: string;
}

const COLLAPSED_BODY_LINES = 6;

export function PostCard({
  msg,
  footer,
  collapsible = true,
  className,
}: PostCardProps) {
  const [expanded, setExpanded] = useState(!collapsible);
  const [lightbox, setLightbox] = useState<PostMedia | null>(null);
  const authorColor = useNameColor(msg.userId);
  const profileSnapshot = { name: msg.userName, avatar: msg.userAvatar };
  const media = msg.postMedia ?? [];
  const showExpandToggle =
    collapsible && msg.postBody && msg.postBody.length > 360;

  return (
    <>
      <article
        className={cn(
          "rounded-xl border border-rosa/20 bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md",
          className,
        )}
      >
        <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-2">
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
                className="shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                aria-label={`View ${msg.userName}`}
              >
                <Avatar className="h-9 w-9">
                  {msg.userAvatar && (
                    <AvatarImage src={msg.userAvatar} alt={msg.userName} />
                  )}
                  <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-xs font-semibold">
                    {initials(msg.userName)}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </ProfileMiniTrigger>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
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
                    className="text-sm font-semibold underline-offset-2 hover:underline focus:outline-none"
                    style={authorColor ? { color: authorColor } : undefined}
                  >
                    {msg.userName}
                  </button>
                )}
              </ProfileMiniTrigger>
              <span className="text-[11px] uppercase tracking-wider rounded bg-primary/10 text-primary px-1.5 py-0.5 font-semibold">
                Post
              </span>
              <span className="text-[11px] text-muted-foreground">
                {formatPostTime(msg.timestamp)}
                {msg.editedAt && (
                  <span
                    className="ml-1 text-[9px] uppercase tracking-wide text-muted-foreground/70"
                    title={`Edited ${formatPostTime(msg.editedAt)}`}
                  >
                    (edited)
                  </span>
                )}
              </span>
            </div>
          </div>
        </header>

        <div className="px-4 pb-3">
          {msg.postTitle && (
            <h3 className="text-lg font-semibold leading-snug font-[family-name:var(--font-heading)]">
              {msg.postTitle}
            </h3>
          )}
          {msg.postBody && (
            <div className="mt-1.5">
              <p
                className={cn(
                  "text-sm whitespace-pre-wrap text-foreground/90",
                  !expanded && "line-clamp-[var(--line-clamp)]",
                )}
                style={
                  !expanded
                    ? ({ "--line-clamp": COLLAPSED_BODY_LINES } as React.CSSProperties)
                    : undefined
                }
              >
                {msg.postBody}
              </p>
              {showExpandToggle && (
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  className="mt-1 text-xs font-medium text-primary hover:underline"
                >
                  {expanded ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          )}
          {msg.content && !msg.postBody && (
            <p className="text-sm whitespace-pre-wrap mt-1.5 text-foreground/90">
              {msg.content}
            </p>
          )}
        </div>

        {media.length > 0 && (
          <div
            className={cn(
              "grid gap-0.5 bg-muted",
              media.length === 1
                ? "grid-cols-1"
                : media.length === 2
                  ? "grid-cols-2"
                  : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {media.slice(0, 6).map((m, i) => (
              <button
                type="button"
                key={`${m.url}-${i}`}
                onClick={() => setLightbox(m)}
                className="relative group aspect-square w-full overflow-hidden bg-muted/40 cursor-zoom-in"
                aria-label="Open attachment"
              >
                {m.type === "image" ? (
                  <Image
                    src={m.url}
                    alt={m.alt ?? `Post attachment ${i + 1}`}
                    fill
                    unoptimized
                    className="object-cover transition-transform group-hover:scale-[1.02]"
                  />
                ) : (
                  <video
                    src={m.url}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    controls
                  />
                )}
                <span className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="h-4 w-4 text-white drop-shadow" />
                </span>
              </button>
            ))}
          </div>
        )}

        {footer && (
          <div className="px-4 py-2 border-t border-rosa/15 bg-rosa/5">
            {footer}
          </div>
        )}
      </article>

      <Dialog
        open={!!lightbox}
        onOpenChange={(o) => !o && setLightbox(null)}
      >
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black">
          {lightbox?.type === "image" && (
            <Image
              src={lightbox.url}
              alt={lightbox.alt ?? "Post attachment"}
              width={1200}
              height={900}
              className="w-full h-auto max-h-[85vh] object-contain"
              unoptimized
            />
          )}
          {lightbox?.type === "video" && (
            <video
              src={lightbox.url}
              className="w-full max-h-[85vh]"
              controls
              autoPlay
              playsInline
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
