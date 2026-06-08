"use client";

/**
 * A single "what's happening" row for the community home feed.
 *
 * Read-only: renders an ActivityItem (a recent community channel post)
 * with the author's avatar + live presence dot, a relative timestamp,
 * and a content preview. The whole row links into the chat anchored to
 * the message (#msg-<id>), matching the deep-link convention used by
 * the notifications bell.
 */

import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarStatusOverlay } from "./status-indicator";
import { useMemberStatus } from "@/lib/use-community-members";
import { useChannels } from "@/lib/use-channels-store";
import type { ActivityItem } from "@/lib/use-activity-feed";
import { cn, initials } from "@/lib/utils";
import { Hash } from "lucide-react";

function relativeTime(iso: string): string {
  if (!iso) return "now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "now";
  return formatDistanceToNowStrict(d, { addSuffix: false });
}

export function ActivityCard({ item }: { item: ActivityItem }) {
  const { status, isLive } = useMemberStatus(item.userId);
  const channels = useChannels((s) => s.channels);
  const channelName =
    channels.find((c) => c.id === item.channelId)?.name ?? item.channelId;

  return (
    <Link
      href={`/community#msg-${item.id}`}
      className={cn(
        "flex items-start gap-3 rounded-xl border border-rosa/20 bg-card/70 px-3.5 py-3",
        "transition-all hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <span className="relative shrink-0">
        <Avatar className="h-10 w-10">
          {item.userAvatar && (
            <AvatarImage src={item.userAvatar} alt={item.userName} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-rosa/40 text-primary text-xs font-semibold">
            {initials(item.userName)}
          </AvatarFallback>
        </Avatar>
        <AvatarStatusOverlay
          status={status}
          size="sm"
          borderClass="border-card"
          hidden={!isLive}
        />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold text-foreground">
            {item.userName}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {relativeTime(item.createdAt)}
          </span>
        </span>
        <span className="mt-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-primary/70">
          <Hash className="h-2.5 w-2.5" />
          {channelName}
        </span>
        <span className="mt-1 block text-sm leading-snug text-foreground/80 line-clamp-2">
          {item.content}
        </span>
      </span>
    </Link>
  );
}
