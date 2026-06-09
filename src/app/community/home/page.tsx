"use client";

/**
 * Community Home — the warm landing surface that gives members a
 * reason to come back daily.
 *
 * Composition (all data read-only here; producers live elsewhere):
 *   - a greeting by first name, time-of-day aware
 *   - the "Online now" presence rail (online-now-rail.tsx)
 *   - "What's happening" — recent community channel posts
 *     (use-activity-feed.ts, its own onSnapshot over `messages`)
 *   - "Coming up" — the next few events (use-events.ts, read-only)
 *   - the "New amigas this week ♡" welcome-wagon card
 *
 * Light theme (community area). Every section degrades to a warm,
 * honest empty state when there's nothing to show or Firebase isn't
 * configured.
 */

import { useMemo } from "react";
import Link from "next/link";
import { format, parseISO, isValid } from "date-fns";
import {
  Newspaper,
  CalendarDays,
  ArrowRight,
  MapPin,
  Plane,
  Users,
  Tent,
  PartyPopper,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/store";
import { useActivityFeed } from "@/lib/use-activity-feed";
import { useEvents, type FirestoreEvent } from "@/lib/use-events";
import { OnlineNowRail } from "@/components/community/online-now-rail";
import { ActivityCard } from "@/components/community/activity-card";
import { WelcomeWagon } from "@/components/community/welcome-wagon";
import { formatDisplayName } from "@/lib/name-format";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Greeting                                                            */
/* ------------------------------------------------------------------ */

function greetingFor(hour: number): string {
  if (hour < 5) return "Still up";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

/* ------------------------------------------------------------------ */
/* Upcoming events                                                     */
/* ------------------------------------------------------------------ */

const EVENT_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  trip: Plane,
  meetup: Users,
  camp: Tent,
  social: PartyPopper,
  synced: CalendarDays,
};

function eventDateLabel(ev: FirestoreEvent): string {
  const start = ev.date ? parseISO(ev.date) : null;
  if (!start || !isValid(start)) return "Date TBA";
  const end = ev.endDate ? parseISO(ev.endDate) : null;
  if (end && isValid(end) && ev.endDate !== ev.date) {
    // Same month range collapses to "Jul 15–18"; otherwise full range.
    if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
      return `${format(start, "MMM d")}–${format(end, "d")}`;
    }
    return `${format(start, "MMM d")} – ${format(end, "MMM d")}`;
  }
  return format(start, "EEE, MMM d");
}

function UpcomingEventRow({ ev }: { ev: FirestoreEvent }) {
  const Icon = EVENT_ICON[ev.type] ?? CalendarDays;
  return (
    <Link
      href="/community/calendar"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-rosa/20 bg-card/70 px-3 py-2.5",
        "transition-all hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-rosa/30 text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-foreground">
          {ev.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="font-medium text-primary/80">{eventDateLabel(ev)}</span>
          {ev.location && (
            <span className="flex min-w-0 items-center gap-0.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{ev.location}</span>
            </span>
          )}
        </span>
      </span>
    </Link>
  );
}

function UpcomingEvents() {
  const { events, loading } = useEvents();

  const upcoming = useMemo(() => {
    // Compare on the local calendar day so an event happening "today"
    // (even earlier today) still counts as upcoming.
    const todayKey = format(new Date(), "yyyy-MM-dd");
    return events
      // Members aren't admins — admin drafts (published === false) are hidden.
      .filter((e) => e.published !== false)
      .filter((e) => {
        const key = e.endDate && e.endDate >= e.date ? e.endDate : e.date;
        return key >= todayKey;
      })
      .slice(0, 4);
  }, [events]);

  return (
    <Card className="border-rosa/30">
      <CardContent className="pt-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary">
            <CalendarDays className="h-4 w-4" />
            Coming up
          </h2>
          <Link
            href="/community/calendar"
            className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground hover:text-primary"
          >
            Calendar
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {loading && upcoming.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-4 py-6 text-center">
            <CalendarDays className="h-7 w-7 text-primary/30" />
            <p className="text-sm text-foreground/80">No events on the calendar yet.</p>
            <p className="max-w-[260px] text-xs text-muted-foreground">
              Trips, meetups, and camps will show up here as they&apos;re planned.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((ev) => (
              <li key={ev.id}>
                <UpcomingEventRow ev={ev} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Activity feed                                                       */
/* ------------------------------------------------------------------ */

function HappeningFeed() {
  const { items, loading, isFirebase } = useActivityFeed(12);

  return (
    <Card className="border-rosa/30">
      <CardContent className="pt-5">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-primary">
          <Newspaper className="h-4 w-4" />
          What&apos;s happening
        </h2>

        {loading && items.length === 0 ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-rosa/40 bg-blush/10 px-4 py-8 text-center">
            <Newspaper className="h-8 w-8 text-primary/30" />
            <p className="text-sm text-foreground/80">
              The community&apos;s quiet right now.
            </p>
            <p className="max-w-[300px] text-xs text-muted-foreground">
              {isFirebase
                ? "Recent posts from the channels will show up here. Be the one to start the conversation ♡"
                : "Live activity needs Firebase — it isn't configured in this environment."}
            </p>
            <Link
              href="/community"
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:bg-magenta"
            >
              Open the channels
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <ActivityCard item={item} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CommunityHomePage() {
  const currentUser = useAuth((s) => s.user);
  const displayName = currentUser
    ? formatDisplayName(currentUser.name, currentUser.nameDisplay)
    : "";
  const firstName = displayName.split(/\s+/)[0] || displayName;
  const greeting = greetingFor(new Date().getHours());

  return (
    <div className="h-full overflow-auto p-4 lg:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Greeting */}
        <header>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-bold sm:text-3xl">
            {greeting}
            {firstName ? (
              <>
                ,{" "}
                <span className="bg-gradient-to-r from-[#FF0099] to-[#B51760] bg-clip-text text-transparent">
                  {firstName}
                </span>
              </>
            ) : null}{" "}
            <span className="inline-block">♡</span>
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
            Here&apos;s what&apos;s happening with your amigas today.
          </p>
        </header>

        {/* Online now rail */}
        <OnlineNowRail />

        {/* Main two-column layout: feed (wide) + sidebar (events, welcome) */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <HappeningFeed />
          </div>
          <div className="space-y-6">
            <UpcomingEvents />
            <WelcomeWagon />
          </div>
        </div>
      </div>
    </div>
  );
}
