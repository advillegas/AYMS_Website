"use client";

/**
 * "My Upcoming" — everything the member has committed to, in one warm,
 * date-grouped list:
 *
 *   - Trips they've reserved or are waitlisted for (useMyTripReservations)
 *   - Events they've RSVP'd to (useEvents + useMyRsvpRefs)
 *   - Meetups they host or have joined (useMeetups + useMyRsvpRefs)
 *
 * Everything is keyed off the current user's id and grouped by date so
 * the next thing on the calendar is always at the top. Reminders due
 * within 24h are swept here too (useReminderScheduler).
 */

import { useMemo } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CalendarHeart,
  MapPin,
  Clock,
  Plane,
  Sparkles,
  CalendarDays,
  Star,
  Check,
  Hourglass,
  Loader2,
} from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useEvents } from "@/lib/use-events";
import { useMeetups } from "@/lib/use-meetups";
import { useMyRsvpRefs } from "@/lib/use-rsvps";
import { useMyTripReservations } from "@/lib/use-trip-reservations";
import { useReminderScheduler } from "@/lib/use-event-reminders";
import { useTrips } from "@/lib/use-trips";
import { getTripById } from "@/lib/trips-data";

/* ------------------------------------------------------------------ */
/* Unified item model                                                  */
/* ------------------------------------------------------------------ */

type ItemKind = "trip" | "event" | "meetup";

interface UpcomingItem {
  key: string;
  kind: ItemKind;
  title: string;
  date: string; // YYYY-MM-DD ("" when unknown → sorts last)
  startTime?: string;
  location?: string;
  href: string;
  /** Short status pill, e.g. "Reserved", "Going", "Hosting". */
  status: string;
  statusTone: "emerald" | "amber" | "primary" | "muted";
}

const todayKey = () => new Date().toISOString().slice(0, 10);

function toneClasses(tone: UpcomingItem["statusTone"]): string {
  switch (tone) {
    case "emerald":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "amber":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    case "primary":
      return "bg-primary/10 text-primary";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function KindIcon({ kind }: { kind: ItemKind }) {
  if (kind === "trip") return <Plane className="h-5 w-5" />;
  if (kind === "meetup") return <Sparkles className="h-5 w-5" />;
  return <CalendarDays className="h-5 w-5" />;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "Waitlisted") return <Hourglass className="h-3 w-3" />;
  if (status === "Interested") return <Star className="h-3 w-3" />;
  if (status === "Hosting") return <Sparkles className="h-3 w-3" />;
  return <Check className="h-3 w-3" />;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MyEventsPage() {
  const user = useAuth((s) => s.user);
  useReminderScheduler();

  const { events, loading: eventsLoading } = useEvents();
  const { meetups, loading: meetupsLoading } = useMeetups();
  const { reservations, loading: tripsLoading } = useMyTripReservations();
  const { trips } = useTrips();

  // Resolve reserved trips against the LIVE list first (so admin-created
  // trips resolve), falling back to the static seed by id when missing.
  const tripById = useMemo(
    () => new Map(trips.map((t) => [t.id, t])),
    [trips],
  );

  // RSVP lookups across all events + meetups the member could attend.
  const rsvpTargets = useMemo(
    () => [
      ...events.map((e) => ({ type: "event" as const, id: e.id })),
      ...meetups.map((m) => ({ type: "meetup" as const, id: m.id })),
    ],
    [events, meetups],
  );
  const { refs: myRsvps } = useMyRsvpRefs(rsvpTargets);

  const eventById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );

  const items = useMemo<UpcomingItem[]>(() => {
    const out: UpcomingItem[] = [];

    // Trips (reserved / waitlist)
    for (const r of reservations) {
      const trip = tripById.get(r.tripId) ?? getTripById(r.tripId);
      out.push({
        key: `trip:${r.id}`,
        kind: "trip",
        title: trip?.title ?? "Trip",
        // Trips carry a human "dates" string, not a YYYY-MM-DD; leave
        // the sort date empty and surface the pretty range in location.
        date: "",
        location: trip?.dates ?? trip?.destination,
        href: "/trips",
        status: r.status === "waitlist" ? "Waitlisted" : "Reserved",
        statusTone: r.status === "waitlist" ? "amber" : "emerald",
      });
    }

    // Events RSVP'd
    for (const ref of myRsvps) {
      if (ref.targetType !== "event") continue;
      const ev = eventById.get(ref.targetId);
      if (!ev) continue;
      out.push({
        key: `event:${ev.id}`,
        kind: "event",
        title: ev.title,
        date: ev.date,
        startTime: ev.startTime,
        location: ev.location,
        href: "/community/calendar",
        status: ref.status === "interested" ? "Interested" : "Going",
        statusTone: ref.status === "interested" ? "primary" : "emerald",
      });
    }

    // Meetups — hosted or joined
    const joinedMeetupIds = new Set(
      myRsvps.filter((r) => r.targetType === "meetup").map((r) => r.targetId),
    );
    const rsvpStatusByMeetup = new Map(
      myRsvps
        .filter((r) => r.targetType === "meetup")
        .map((r) => [r.targetId, r.status]),
    );
    const seenMeetups = new Set<string>();

    for (const m of meetups) {
      const isHost = user?.id === m.hostId;
      const joined = joinedMeetupIds.has(m.id);
      if (!isHost && !joined) continue;
      if (seenMeetups.has(m.id)) continue;
      seenMeetups.add(m.id);

      const status = isHost
        ? "Hosting"
        : rsvpStatusByMeetup.get(m.id) === "interested"
          ? "Interested"
          : "Going";
      out.push({
        key: `meetup:${m.id}`,
        kind: "meetup",
        title: m.title,
        date: m.date,
        startTime: m.startTime,
        location: m.location,
        href: "/community/meetups",
        status,
        statusTone: isHost
          ? "primary"
          : status === "Interested"
            ? "primary"
            : "emerald",
      });
    }

    return out;
  }, [reservations, myRsvps, eventById, meetups, user?.id, tripById]);

  // Split upcoming vs past (items with a real date earlier than today).
  // Dateless items (trips) always count as upcoming.
  const today = todayKey();
  const { upcomingGroups, pastItems } = useMemo(() => {
    const upcoming = items.filter((i) => !i.date || i.date >= today);
    const past = items.filter((i) => i.date && i.date < today);

    upcoming.sort((a, b) => {
      // Dateless (trips) float to the top, then by soonest date.
      if (!a.date && b.date) return -1;
      if (a.date && !b.date) return 1;
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.title.localeCompare(b.title);
    });
    past.sort((a, b) => b.date.localeCompare(a.date));

    // Group upcoming by date label.
    const groups = new Map<string, UpcomingItem[]>();
    for (const it of upcoming) {
      const label = it.date
        ? isValid(parseISO(it.date))
          ? format(parseISO(it.date), "EEEE, MMMM d")
          : it.date
        : "Trips & open dates";
      const arr = groups.get(label) ?? [];
      arr.push(it);
      groups.set(label, arr);
    }
    return {
      upcomingGroups: Array.from(groups.entries()),
      pastItems: past,
    };
  }, [items, today]);

  const loading =
    eventsLoading || meetupsLoading || tripsLoading;
  const isEmpty = !loading && items.length === 0;

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-2xl px-4 py-6 lg:py-8 space-y-6">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold font-[family-name:var(--font-heading)]">
            <CalendarHeart className="h-6 w-6 text-primary" />
            My Upcoming
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Trips you&apos;ve reserved, events you&apos;re going to, and meetups
            you host or joined — all in one place.
          </p>
        </header>

        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading your plans…</p>
          </div>
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-7">
            {upcomingGroups.map(([label, group]) => (
              <section key={label} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </h2>
                <div className="space-y-2">
                  {group.map((it) => (
                    <ItemRow key={it.key} item={it} />
                  ))}
                </div>
              </section>
            ))}

            {pastItems.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past
                </h2>
                <div className="space-y-2 opacity-60">
                  {pastItems.map((it) => (
                    <ItemRow key={it.key} item={it} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Row                                                                 */
/* ------------------------------------------------------------------ */

function ItemRow({ item }: { item: UpcomingItem }) {
  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-xl border border-rosa/20 bg-card p-3 transition-colors hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-rosa/25 text-primary">
        <KindIcon kind={item.kind} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{item.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {item.startTime && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {item.startTime}
            </span>
          )}
          {item.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
        </div>
      </div>
      <Badge
        variant="secondary"
        className={cn(
          "h-6 shrink-0 gap-1 text-[10px]",
          toneClasses(item.statusTone),
        )}
      >
        <StatusIcon status={item.status} />
        {item.status}
      </Badge>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rosa/30 bg-rosa/5 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <CalendarHeart className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">Nothing on your calendar yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Reserve a trip, RSVP to an event, or join a local meetup and it&apos;ll
        show up here so you never miss it.
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        <Button variant="outline" render={<Link href="/trips" />}>
          <Plane className="mr-1 h-4 w-4" />
          Browse trips
        </Button>
        <Button
          className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
          render={<Link href="/community/meetups" />}
        >
          <Sparkles className="mr-1 h-4 w-4" />
          Find meetups
        </Button>
      </div>
    </div>
  );
}
