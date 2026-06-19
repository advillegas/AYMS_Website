"use client";

/**
 * Member-created Local Meetups.
 *
 * Lists meetups hosted by members, sorted by distance from the viewer's
 * location (browser geo or first manual location) when we can resolve
 * coordinates for both ends — otherwise by soonest date. Each card shows
 * an inline RSVP control (Going / Interested + who's coming), and the
 * host can delete their own meetup. A "Host a meetup" button opens the
 * MeetupForm dialog.
 *
 * Attendees reuse the shared RSVP model (useRsvps "meetup"), so the same
 * realtime attendee list powers meetups and calendar events alike. Due
 * reminders are swept here too via useReminderScheduler.
 */

import { useMemo, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  MapPin,
  Clock,
  Plus,
  Trash2,
  Users,
  Navigation,
  Sparkles,
  Loader2,
  List,
  Map as MapIcon,
} from "lucide-react";
import dynamic from "next/dynamic";
import { format, parseISO, isValid } from "date-fns";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { getUserCoords, haversineDistance } from "@/lib/geo";
import { useMeetups, type Meetup } from "@/lib/use-meetups";
import { EventRsvp } from "@/components/community/event-rsvp";
import { useReminderScheduler } from "@/lib/use-event-reminders";
import { MeetupForm } from "@/components/community/meetup-form";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

// Leaflet touches `window` at import, so the map is loaded client-only.
const MeetupsMap = dynamic(
  () => import("@/components/community/meetups-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] w-full items-center justify-center rounded-2xl border border-rosa/20 bg-rosa/5 sm:h-[520px]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    ),
  },
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const todayKey = () => new Date().toISOString().slice(0, 10);

function prettyDate(date: string): string {
  if (!date) return "Date TBD";
  const d = parseISO(date);
  return isValid(d) ? format(d, "EEE, MMM d, yyyy") : date;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function MeetupsPage() {
  const user = useAuth((s) => s.user);
  const { meetups, loading, isFirebase, deleteMeetup } = useMeetups();
  const confirm = useConfirm();
  const [formOpen, setFormOpen] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<Meetup | null>(null);

  // Sweep due reminders while the member is on this page.
  useReminderScheduler();

  const coords = getUserCoords(user);
  const today = todayKey();

  // Meetups whose location couldn't be geocoded can't be plotted.
  const unmappable = useMemo(
    () => meetups.filter((m) => m.lat == null || m.lng == null).length,
    [meetups],
  );

  const selectedDistance =
    selected && coords && selected.lat != null && selected.lng != null
      ? haversineDistance(coords.lat, coords.lng, selected.lat, selected.lng)
      : null;

  // Split upcoming vs past, then sort upcoming by distance (when we can)
  // else by soonest date. Past meetups stay date-descending at the end.
  const { upcoming, past } = useMemo(() => {
    const withDistance = meetups.map((m) => ({
      meetup: m,
      distance:
        coords && m.lat != null && m.lng != null
          ? haversineDistance(coords.lat, coords.lng, m.lat, m.lng)
          : null,
    }));

    const up = withDistance.filter((x) => x.meetup.date >= today);
    const pa = withDistance.filter((x) => x.meetup.date < today);

    up.sort((a, b) => {
      if (a.distance != null && b.distance != null) {
        if (a.distance !== b.distance) return a.distance - b.distance;
      } else if (a.distance != null) {
        return -1;
      } else if (b.distance != null) {
        return 1;
      }
      return a.meetup.date.localeCompare(b.meetup.date);
    });
    pa.sort((a, b) => b.meetup.date.localeCompare(a.meetup.date));

    return { upcoming: up, past: pa };
  }, [meetups, coords, today]);

  async function handleDelete(m: Meetup) {
    const ok = await confirm({
      title: `Delete "${m.title}"?`,
      description:
        "This meetup and its RSVPs will be removed. This can't be undone.",
      confirmText: "Delete meetup",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteMeetup(m.id);
    if (done) toast.success("Meetup deleted.");
    else toast.error("Couldn't delete the meetup.");
  }

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 lg:py-8 space-y-6">
        {/* Header */}
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold font-[family-name:var(--font-heading)]">
              <Sparkles className="h-6 w-6 text-primary" />
              Local Meetups
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {coords
                ? "Member-hosted gatherings near you — closest first."
                : "Member-hosted gatherings. Add your location in settings to sort by distance."}
            </p>
          </div>
          {user && (
            <Button
              onClick={() => setFormOpen(true)}
              className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
            >
              <Plus className="mr-1 h-4 w-4" />
              Host a meetup
            </Button>
          )}
        </header>

        {!isFirebase && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
            Meetups are stored in Firestore. Connect Firebase to host and RSVP
            to local meetups.
          </div>
        )}

        {/* Loading */}
        {loading && meetups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Loading meetups…</p>
          </div>
        ) : meetups.length === 0 ? (
          <EmptyState canHost={!!user} onHost={() => setFormOpen(true)} />
        ) : (
          <div className="space-y-6">
            {/* List / Map toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex rounded-full border border-rosa/25 bg-card p-1">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                    view === "list"
                      ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <List className="h-4 w-4" />
                  List
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  aria-pressed={view === "map"}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition",
                    view === "map"
                      ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <MapIcon className="h-4 w-4" />
                  Map
                </button>
              </div>
              {view === "map" && unmappable > 0 && (
                <p className="text-xs text-muted-foreground">
                  {unmappable} without a map location
                </p>
              )}
            </div>

            {view === "map" ? (
              <MeetupsMap
                meetups={meetups}
                coords={coords}
                onSelect={setSelected}
              />
            ) : (
              <div className="space-y-8">
            {/* Upcoming */}
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Upcoming ({upcoming.length})
              </h2>
              {upcoming.length === 0 ? (
                <p className="rounded-lg border border-dashed border-rosa/30 px-4 py-6 text-center text-sm text-muted-foreground">
                  No upcoming meetups yet.{" "}
                  {user && "Be the first to host one!"}
                </p>
              ) : (
                <div className="space-y-4">
                  {upcoming.map(({ meetup, distance }) => (
                    <MeetupCard
                      key={meetup.id}
                      meetup={meetup}
                      distance={distance}
                      isHost={user?.id === meetup.hostId}
                      onDelete={() => handleDelete(meetup)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Past ({past.length})
                </h2>
                <div className="space-y-4 opacity-70">
                  {past.map(({ meetup, distance }) => (
                    <MeetupCard
                      key={meetup.id}
                      meetup={meetup}
                      distance={distance}
                      isHost={user?.id === meetup.hostId}
                      onDelete={() => handleDelete(meetup)}
                      past
                    />
                  ))}
                </div>
              </section>
            )}
              </div>
            )}
          </div>
        )}
      </div>

      <MeetupForm open={formOpen} onOpenChange={setFormOpen} />

      {/* Meetup detail (opened from a map pin) */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {selected && (
            <>
              <DialogTitle className="sr-only">{selected.title}</DialogTitle>
              <MeetupCard
                meetup={selected}
                distance={selectedDistance}
                isHost={false}
                onDelete={() => {}}
                past={selected.date < today}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Meetup card                                                         */
/* ------------------------------------------------------------------ */

function MeetupCard({
  meetup,
  distance,
  isHost,
  onDelete,
  past = false,
}: {
  meetup: Meetup;
  distance: number | null;
  isHost: boolean;
  onDelete: () => void;
  past?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-rosa/20 bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        {/* Date chip */}
        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-rosa/25 text-primary">
          <span className="text-[10px] font-semibold uppercase leading-none">
            {meetup.date && isValid(parseISO(meetup.date))
              ? format(parseISO(meetup.date), "MMM")
              : "—"}
          </span>
          <span className="text-xl font-bold leading-tight">
            {meetup.date && isValid(parseISO(meetup.date))
              ? format(parseISO(meetup.date), "d")
              : ""}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold leading-tight">
              {meetup.title}
            </h3>
            {isHost && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={onDelete}
                className="-mr-1 -mt-1 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label="Delete meetup"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Host */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Avatar className="h-4 w-4">
              {meetup.hostAvatar && (
                <AvatarImage src={meetup.hostAvatar} alt={meetup.hostName} />
              )}
              <AvatarFallback className="bg-primary/15 text-[8px] text-primary">
                {initials(meetup.hostName)}
              </AvatarFallback>
            </Avatar>
            Hosted by {isHost ? "you" : meetup.hostName}
          </div>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
              {prettyDate(meetup.date)}
            </span>
            {meetup.startTime && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary/60" />
                {meetup.startTime}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-primary/60" />
              {meetup.location || "Location TBD"}
            </span>
            {distance != null && (
              <Badge
                variant="secondary"
                className="h-5 gap-1 bg-primary/10 text-[10px] text-primary"
              >
                <Navigation className="h-3 w-3" />
                {distance < 1
                  ? "< 1 mi"
                  : `${Math.round(distance)} mi away`}
              </Badge>
            )}
            {meetup.capacity ? (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-primary/60" />
                Cap {meetup.capacity}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Description */}
      {meetup.description && (
        <p className="mt-3 whitespace-pre-line text-sm text-foreground/80">
          {meetup.description}
        </p>
      )}

      {/* RSVP — hidden on past meetups, where it no longer makes sense */}
      {!past && (
        <div className="mt-4 border-t border-rosa/15 pt-4">
          <EventRsvp
            targetType="meetup"
            targetId={meetup.id}
            title={meetup.title}
            date={meetup.date}
            startTime={meetup.startTime}
            location={meetup.location}
            capacity={meetup.capacity}
          />
        </div>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */

function EmptyState({
  canHost,
  onHost,
}: {
  canHost: boolean;
  onHost: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rosa/30 bg-rosa/5 px-6 py-14 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="h-7 w-7" />
      </div>
      <h2 className="text-lg font-semibold">No meetups yet</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Be the spark — host a coffee, a hike, a salsa night. Your amigas
        nearby will see it and can RSVP in one tap.
      </p>
      {canHost && (
        <Button
          onClick={onHost}
          className="mt-1 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
        >
          <Plus className="mr-1 h-4 w-4" />
          Host the first meetup
        </Button>
      )}
    </div>
  );
}
