"use client";

/**
 * Notification Center — the full-page home for everything the bell
 * only previews.
 *
 * It merges the app's TWO notification systems into one unified,
 * time-sorted list:
 *
 *   1. DERIVED feed (use-notifications.ts) — mentions, thread replies,
 *      reactions, and DMs computed live from the messages we already
 *      subscribe to. Read state is a single `lastSeenAt` cursor plus
 *      per-id overrides (markOneRead), shared with the bell.
 *
 *   2. PERSISTENT stream (notify.ts) — friend requests, welcomes,
 *      badges, RSVPs, moderation, etc. written to Firestore by feature
 *      producers and durable across reloads. Each doc carries its own
 *      `read` boolean.
 *
 * Both are normalised into a single `FeedEntry` so the page renders,
 * filters, and marks-read without caring which system a row came from.
 * "Mark all read" fans out to BOTH systems; "mark one read" routes to
 * whichever system owns the row.
 *
 * Filter chips bucket by intent (All / Mentions / Messages / Social).
 * Empty states are warm and honest — and differentiate "nothing yet"
 * from "Firebase isn't configured so this is local-only".
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDistanceToNowStrict } from "date-fns";
import {
  Bell,
  Check,
  CheckCheck,
  MessageCircle,
  AtSign,
  Users,
  Smile,
  MessageSquare,
  UserPlus,
  HeartHandshake,
  Award,
  Plane,
  CalendarCheck,
  AlarmClock,
  ShieldAlert,
  Sparkles,
  Inbox,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  useNotifications,
  useNotificationReadState,
  isDerivedNotificationRead,
  type NotificationType,
} from "@/lib/use-notifications";
import {
  usePushedNotifications,
  type NotifyKind,
} from "@/lib/notify";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/lib/store";
import { cn, initials } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Unified feed entry                                                  */
/* ------------------------------------------------------------------ */

type FilterKey = "all" | "mentions" | "messages" | "social";
type Source = "derived" | "pushed";

interface FeedEntry {
  /** Globally-unique key (source-prefixed so the two systems can't collide). */
  key: string;
  /** Raw id within its own system, for routing markOneRead. */
  rawId: string;
  source: Source;
  /** Which filter bucket(s) this belongs to. */
  bucket: Exclude<FilterKey, "all">;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  href: string;
  actorName?: string;
  actorAvatar?: string;
  createdAt: string;
  read: boolean;
}

const DERIVED_ICON: Record<
  NotificationType,
  React.ComponentType<{ className?: string }>
> = {
  dm: MessageCircle,
  mention: AtSign,
  "channel-mention": Users,
  "role-mention": Users,
  "thread-reply": MessageSquare,
  reaction: Smile,
};

const PUSHED_ICON: Record<
  NotifyKind,
  React.ComponentType<{ className?: string }>
> = {
  "friend-request": UserPlus,
  "friend-accept": HeartHandshake,
  welcome: HeartHandshake,
  badge: Award,
  passport: Plane,
  reservation: CalendarCheck,
  rsvp: CalendarCheck,
  reminder: AlarmClock,
  meetup: Users,
  mod: ShieldAlert,
  report: ShieldAlert,
  system: Bell,
};

/** Map a derived notification type to a filter bucket. */
function derivedBucket(type: NotificationType): Exclude<FilterKey, "all"> {
  if (type === "mention" || type === "channel-mention" || type === "role-mention")
    return "mentions";
  if (type === "dm" || type === "thread-reply" || type === "reaction")
    return "messages";
  return "messages";
}

/** Map a pushed kind to a filter bucket. */
function pushedBucket(kind: NotifyKind): Exclude<FilterKey, "all"> {
  switch (kind) {
    case "friend-request":
    case "friend-accept":
    case "welcome":
    case "badge":
    case "passport":
    case "meetup":
    case "rsvp":
    case "reservation":
      return "social";
    default:
      return "messages";
  }
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function relativeTime(iso: string): string {
  if (!iso) return "now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "now";
  // Anything stamped at the epoch (an unresolved serverTimestamp) reads
  // as "now" rather than "56 years ago".
  if (d.getTime() <= 0) return "now";
  return formatDistanceToNowStrict(d, { addSuffix: true });
}

function NotificationRow({
  entry,
  onMarkRead,
}: {
  entry: FeedEntry;
  onMarkRead: (entry: FeedEntry) => void;
}) {
  const Icon = entry.icon;
  const hasHref = Boolean(entry.href);

  const inner = (
    <>
      <span className="relative shrink-0">
        <Avatar className="h-11 w-11">
          {entry.actorAvatar && (
            <AvatarImage src={entry.actorAvatar} alt={entry.actorName ?? "User"} />
          )}
          <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-xs font-semibold">
            {initials(entry.actorName)}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-card border border-rosa/30 text-primary">
          <Icon className="h-3 w-3" />
        </span>
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-sm leading-snug",
              entry.read ? "text-foreground/80" : "font-semibold text-foreground",
            )}
          >
            {entry.title}
          </span>
          <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
            {relativeTime(entry.createdAt)}
          </span>
        </span>
        {entry.body && (
          <span className="mt-0.5 block text-xs text-muted-foreground line-clamp-2">
            {entry.body}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 border-l-2 px-3.5 py-3 transition-colors",
        entry.read
          ? "border-transparent hover:bg-primary/5"
          : "border-primary bg-primary/5 hover:bg-primary/10",
      )}
    >
      {hasHref ? (
        <Link
          href={entry.href}
          onClick={() => !entry.read && onMarkRead(entry)}
          className="flex min-w-0 flex-1 items-start gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{inner}</div>
      )}

      {!entry.read && (
        <button
          type="button"
          onClick={() => onMarkRead(entry)}
          className="absolute right-2 top-2 hidden items-center gap-1 rounded-full bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm ring-1 ring-rosa/30 hover:text-primary group-hover:inline-flex"
          aria-label="Mark as read"
        >
          <Check className="h-3 w-3" />
          Read
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "mentions", label: "Mentions" },
  { key: "messages", label: "Messages" },
  { key: "social", label: "Social" },
];

export default function NotificationCenterPage() {
  const currentUser = useAuth((s) => s.user);
  const [filter, setFilter] = useState<FilterKey>("all");

  // System 1: derived feed + its shared read state.
  const { notifications } = useNotifications();
  const lastSeenAt = useNotificationReadState((s) => s.lastSeenAt);
  const readIds = useNotificationReadState((s) => s.readIds);
  const markAllDerivedRead = useNotificationReadState((s) => s.markAllRead);
  const markOneDerivedRead = useNotificationReadState((s) => s.markOneRead);

  // System 2: persistent stream + its own read mutations.
  const {
    items: pushed,
    markRead: markPushedRead,
    markAllRead: markAllPushedRead,
  } = usePushedNotifications();

  // Normalise both systems into one list.
  const entries = useMemo<FeedEntry[]>(() => {
    const readSet = new Set(readIds);
    const out: FeedEntry[] = [];

    for (const n of notifications) {
      out.push({
        key: `derived:${n.id}`,
        rawId: n.id,
        source: "derived",
        bucket: derivedBucket(n.type),
        icon: DERIVED_ICON[n.type] ?? Bell,
        title: n.title,
        body: n.body,
        href: n.href,
        actorName: n.actorName,
        actorAvatar: n.actorAvatar,
        createdAt: n.createdAt,
        read: isDerivedNotificationRead(n, lastSeenAt, readSet),
      });
    }

    for (const p of pushed) {
      out.push({
        key: `pushed:${p.id}`,
        rawId: p.id,
        source: "pushed",
        bucket: pushedBucket(p.kind),
        icon: PUSHED_ICON[p.kind] ?? Bell,
        title: p.title,
        body: p.body,
        href: p.href,
        actorName: p.actorName,
        actorAvatar: p.actorAvatar,
        createdAt: p.createdAt,
        read: p.read,
      });
    }

    out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return out;
  }, [notifications, pushed, lastSeenAt, readIds]);

  const counts = useMemo(() => {
    let unread = 0;
    const byBucket: Record<Exclude<FilterKey, "all">, number> = {
      mentions: 0,
      messages: 0,
      social: 0,
    };
    for (const e of entries) {
      if (!e.read) {
        unread += 1;
        byBucket[e.bucket] += 1;
      }
    }
    return { unread, byBucket };
  }, [entries]);

  const visible = useMemo(() => {
    if (filter === "all") return entries;
    return entries.filter((e) => e.bucket === filter);
  }, [entries, filter]);

  function handleMarkRead(entry: FeedEntry) {
    if (entry.source === "pushed") {
      markPushedRead(entry.rawId);
    } else {
      markOneDerivedRead(entry.rawId);
    }
  }

  function handleMarkAllRead() {
    markAllDerivedRead();
    markAllPushedRead();
  }

  return (
    <div className="h-full overflow-auto p-4 lg:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-2xl font-bold">
              <Bell className="h-6 w-6 text-primary" />
              Notifications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {counts.unread > 0
                ? `${counts.unread} unread`
                : "You're all caught up ♡"}
              {!isFirebaseConfigured && (
                <span className="ml-1 italic">
                  · local-only (Firebase isn&apos;t configured)
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={counts.unread === 0}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-rosa/30 bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>

        {/* Filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const badge =
              f.key === "all" ? counts.unread : counts.byBucket[f.key];
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
                  active
                    ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_2px_8px_rgb(255_0_153/0.3)]"
                    : "border border-rosa/30 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                {f.label}
                {badge > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-[10px] tabular-nums",
                      active ? "bg-white/30" : "bg-primary/15 text-primary",
                    )}
                  >
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="overflow-hidden rounded-2xl border border-rosa/25 bg-card/70">
          {visible.length === 0 ? (
            <EmptyState filter={filter} hasAny={entries.length > 0} signedIn={Boolean(currentUser)} />
          ) : (
            <div className="divide-y divide-rosa/10">
              {visible.map((e) => (
                <NotificationRow key={e.key} entry={e} onMarkRead={handleMarkRead} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  filter,
  hasAny,
  signedIn,
}: {
  filter: FilterKey;
  hasAny: boolean;
  signedIn: boolean;
}) {
  // Filtered-but-empty (there ARE notifications, just none in this tab).
  if (hasAny && filter !== "all") {
    const label =
      filter === "mentions"
        ? "mentions"
        : filter === "messages"
          ? "messages"
          : "social updates";
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <Sparkles className="h-9 w-9 text-primary/30" />
        <p className="text-sm font-medium text-foreground/80">
          No {label} right now
        </p>
        <p className="max-w-xs text-xs text-muted-foreground">
          Switch back to <span className="font-medium">All</span> to see
          everything that&apos;s come in.
        </p>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
        <Inbox className="h-9 w-9 text-primary/30" />
        <p className="text-sm font-medium text-foreground/80">
          Sign in to see your notifications
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <HeartHandshake className="h-10 w-10 text-primary/30" />
      <p className="text-sm font-medium text-foreground/80">
        Nothing here yet — but it won&apos;t stay quiet for long ♡
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Mentions, replies, reactions, DMs, friend requests, and event
        reminders all land here. Say hi in a channel or send an amiga a
        friend request to get things going.
      </p>
      <Link
        href="/community/home"
        className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-magenta"
      >
        Explore the community
      </Link>
    </div>
  );
}
