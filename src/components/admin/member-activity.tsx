"use client";

/**
 * Compact per-member activity panel for the Members admin detail pane.
 *
 * Shows the member's channel-message count (count-only aggregate — no
 * contents) plus their most recent tracked activity events (page
 * views, RSVPs, reservations, …) from the activity pipeline
 * (src/lib/activity-tracker.ts — Supabase `activity_events` primary,
 * Firestore mirror behind the flag). Renders a friendly "collecting…"
 * empty state until tracking has data for this member.
 */

import {
  Activity,
  CalendarDays,
  ConciergeBell,
  Eye,
  FileSignature,
  Hourglass,
  LogIn,
  MailPlus,
  MessageSquare,
  MousePointerClick,
  Ticket,
  UserPlus,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  useActivityEvents,
  useMemberMessageCount,
  type ActivityEvent,
} from "@/lib/activity-tracker";

const LINE: Record<
  string,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: (e: ActivityEvent) => string;
  }
> = {
  page_view: { icon: Eye, label: (e) => `Viewed ${e.path || "/"}` },
  sign_in: { icon: LogIn, label: () => "Signed in" },
  sign_up: { icon: UserPlus, label: () => "Created their account" },
  trip_reservation: { icon: Ticket, label: () => "Reserved a trip spot" },
  waitlist_join: { icon: Hourglass, label: () => "Joined a trip waitlist" },
  newsletter_signup: {
    icon: MailPlus,
    label: () => "Subscribed to the newsletter",
  },
  concierge_inquiry: {
    icon: ConciergeBell,
    label: () => "Sent a concierge inquiry",
  },
  message_sent: { icon: MessageSquare, label: () => "Posted a message" },
  event_rsvp: { icon: CalendarDays, label: () => "RSVP'd to an event" },
  agreement_signed: { icon: FileSignature, label: () => "Signed an agreement" },
};

export function MemberActivitySection({ userId }: { userId: string }) {
  const messageCount = useMemberMessageCount(userId);
  const { events, loading, isLive } = useActivityEvents(12, userId);

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        <Activity className="h-3 w-3" />
        Activity
      </p>

      <div className="flex items-center gap-2 rounded-md border border-border px-2 py-1.5 text-xs">
        <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="flex-1">Channel messages sent</span>
        <span className="font-semibold tabular-nums">
          {messageCount === null ? "—" : messageCount.toLocaleString()}
        </span>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground italic px-1">
          Loading activity…
        </p>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">
          {isLive
            ? "No tracked activity for this member yet — the tracker collects from its first deploy."
            : "Connect a backend to collect activity."}
        </p>
      ) : (
        <ul className="space-y-1 max-h-48 overflow-y-auto overscroll-contain pr-1">
          {events.map((e) => {
            const line = LINE[e.type] ?? {
              icon: MousePointerClick,
              label: (ev: ActivityEvent) => ev.type,
            };
            let ago = "";
            if (e.tsISO) {
              try {
                ago = formatDistanceToNow(new Date(e.tsISO), {
                  addSuffix: true,
                });
              } catch {
                ago = "";
              }
            }
            return (
              <li
                key={e.id}
                className="flex items-center gap-2 text-xs px-1 py-0.5"
              >
                <line.icon className="h-3 w-3 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">
                  {line.label(e)}
                </span>
                <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                  {ago}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
