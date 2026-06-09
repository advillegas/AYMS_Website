"use client";

/**
 * Top-right notifications bell.
 *
 * Aggregates the in-app feed (DMs, mentions, thread replies,
 * reactions, role pings) into a scrollable popover. Unread count is
 * computed against a localStorage-persisted "last seen" timestamp,
 * mark-all-read on close.
 *
 * Anchored to the trigger via FloatingPopover so it sits cleanly
 * above sidebar stacking contexts.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Check, MessageCircle, AtSign, Users, Smile, MessageSquare, ArrowRight } from "lucide-react";
import { formatDistanceToNowStrict } from "date-fns";
import {
  useNotifications,
  type NotificationType,
  type NotificationItem,
} from "@/lib/use-notifications";
import { useNotificationReadState } from "@/lib/use-notifications";
import { usePushedNotifications } from "@/lib/notify";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FloatingPopover } from "./floating-popover";
import { cn, initials } from "@/lib/utils";

const TYPE_ICON: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  dm: MessageCircle,
  mention: AtSign,
  "channel-mention": Users,
  "role-mention": Users,
  "thread-reply": MessageSquare,
  reaction: Smile,
};

interface RowProps {
  item: NotificationItem;
  isUnread: boolean;
  onClose: () => void;
}

function NotificationRow({ item, isUnread, onClose }: RowProps) {
  const Icon = TYPE_ICON[item.type];
  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        "flex items-start gap-3 px-3 py-2.5 transition-colors border-l-2",
        isUnread
          ? "border-primary bg-primary/5 hover:bg-primary/10"
          : "border-transparent hover:bg-primary/5",
      )}
    >
      <span className="relative shrink-0">
        <Avatar className="h-9 w-9">
          {item.actorAvatar && (
            <AvatarImage src={item.actorAvatar} alt={item.actorName ?? "User"} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
            {initials(item.actorName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-card border border-rosa/30 text-primary">
          <Icon className="h-2.5 w-2.5" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-xs leading-snug truncate",
              isUnread ? "font-semibold text-foreground" : "text-foreground/80",
            )}
          >
            {item.title}
          </span>
          <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
            {(() => {
              if (!item.createdAt) return "now";
              const d = new Date(item.createdAt);
              if (Number.isNaN(d.getTime())) return "now";
              return formatDistanceToNowStrict(d, { addSuffix: false });
            })()}
          </span>
        </span>
        {item.body && (
          <span className="mt-0.5 block text-[11px] text-muted-foreground line-clamp-2">
            {item.body}
          </span>
        )}
      </span>
    </Link>
  );
}

export function NotificationsButton() {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { notifications, unreadCount } = useNotifications();
  // Persistent stream (friend requests, welcomes, badges, RSVPs…) lives
  // in a separate system; fold its unread count into the bell badge so
  // the dot reflects EVERYTHING, not just the derived message feed.
  const { unreadCount: pushedUnread, markAllRead: markAllPushedRead } =
    usePushedNotifications();
  const lastSeenAt = useNotificationReadState((s) => s.lastSeenAt);
  const markAllDerivedRead = useNotificationReadState((s) => s.markAllRead);
  // Combined badge total across both notification systems.
  const totalUnread = unreadCount + pushedUnread;
  const markAllRead = () => {
    markAllDerivedRead();
    markAllPushedRead();
  };
  // Tick every 30s while the popover is open so relative-time labels
  // ("5s", "2m") actually advance instead of being stuck at whatever
  // they were on first render. We don't tick when closed because the
  // bell badge itself doesn't need the wall clock.
  const [, setNowTick] = useState(0);
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => setNowTick((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, [open]);

  function handleClose() {
    setOpen(false);
    // Stamp lastSeenAt (and clear the pushed stream) so the badge clears
    // once the user has actually looked at the list. We do it on close
    // (not open) so a quick peek doesn't strip the unread indicator off
    // everything.
    if (totalUnread > 0) markAllRead();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={
          totalUnread > 0
            ? `Notifications (${totalUnread} unread)`
            : "Notifications"
        }
        title="Notifications"
      >
        <Bell className="h-4 w-4" />
        {totalUnread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold px-1 ring-2 ring-card"
            aria-hidden
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      <FloatingPopover
        open={open}
        triggerRef={triggerRef}
        onClose={handleClose}
        placement="top-end"
        width={380}
        className="bg-card border border-rosa/30"
      >
        <div className="flex flex-col max-h-[480px] w-[min(380px,calc(100vw-1rem))]">
          <div className="flex shrink-0 items-center justify-between border-b border-rosa/20 px-3 py-2 bg-gradient-to-r from-rosa/15 to-blush/15">
            <div className="flex items-center gap-1.5">
              <Bell className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Notifications
              </span>
            </div>
            <button
              type="button"
              onClick={() => markAllRead()}
              disabled={totalUnread === 0}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-primary disabled:opacity-40"
            >
              <Check className="h-3 w-3" />
              Mark all read
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <Bell className="h-8 w-8 text-primary/30" />
                <p className="text-xs text-muted-foreground">
                  You&apos;re all caught up.
                </p>
                <p className="text-[10px] text-muted-foreground/80 max-w-[260px]">
                  Mentions, thread replies, reactions, and DMs will show
                  up here in real time.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-rosa/10">
                {notifications.map((n) => (
                  <NotificationRow
                    key={n.id}
                    item={n}
                    isUnread={n.createdAt > lastSeenAt}
                    onClose={handleClose}
                  />
                ))}
              </div>
            )}
          </div>
          {/* Footer: jump to the full Notification Center, which merges
              this derived feed with the persistent stream (friend
              requests, welcomes, badges, RSVPs…). */}
          <Link
            href="/community/notifications"
            onClick={() => setOpen(false)}
            className="flex shrink-0 items-center justify-center gap-1.5 border-t border-rosa/20 bg-gradient-to-r from-rosa/10 to-blush/10 px-3 py-2.5 text-xs font-semibold text-primary transition-colors hover:from-rosa/20 hover:to-blush/20"
          >
            See all notifications
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </FloatingPopover>
    </>
  );
}
