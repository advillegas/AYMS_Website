"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import Image from "next/image";
import { format, parseISO, isPast, isValid } from "date-fns";
import {
  Calendar,
  MapPin,
  Clock,
  Map as MapIcon,
  List,
  Navigation,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useCombinedEvents } from "@/lib/use-combined-events";
import { useInlineEdit } from "@/lib/use-inline-edit";
import { useConfirm } from "@/components/ui/confirm-dialog";
import type { CalendarEvent } from "@/lib/events-data";
import type { GeoCoord } from "@/lib/geo";
import { ensureHttp } from "@/lib/url";
import {
  LocationAutocomplete,
  type LocationResult,
} from "@/components/community/location-autocomplete";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { EventRsvp } from "@/components/community/event-rsvp";
import { EditableText } from "@/components/inline/editable-text";

// Leaflet touches `window` at import, so the map is loaded client-only.
const EventsMap = dynamic(
  () => import("@/components/community/events-map"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] w-full items-center justify-center rounded-2xl border border-rosa/20 bg-rosa/5 sm:h-[560px]">
        <Loader2 className="h-6 w-6 animate-spin text-[#B51760]" />
      </div>
    ),
  },
);

/** Event types that take RSVPs on the public page (not trips/synced feeds). */
const RSVP_TYPES = new Set(["social", "meetup", "camp"]);

const TYPE_STYLE: Record<string, { cls: string; emoji: string }> = {
  trip: { cls: "bg-magenta/15 text-magenta border-magenta/20", emoji: "✈️" },
  meetup: { cls: "bg-coral/15 text-coral border-coral/20", emoji: "☕" },
  camp: { cls: "bg-plum/15 text-plum border-plum/20", emoji: "🏕️" },
  social: { cls: "bg-brand-pink/15 text-brand-pink border-brand-pink/20", emoji: "🎉" },
  synced: { cls: "bg-brand-pink/15 text-brand-pink border-brand-pink/20", emoji: "📅" },
};

/** Safe lookup so an unknown/new event type never crashes on property access. */
function typeStyle(type: string | undefined): { cls: string; emoji: string } {
  return (type && TYPE_STYLE[type]) || TYPE_STYLE.social;
}

/** Parse an ISO date safely; returns null for empty/invalid strings. */
function safeDate(iso: string | undefined): Date | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? d : null;
}

const GRADIENTS = [
  "from-[#FF0099] to-[#B51760]",
  "from-[#9B2C8A] to-[#FF0099]",
  "from-[#C44B3F] to-[#9B2C8A]",
  "from-[#B51760] to-[#9B2C8A]",
  "from-[#FF0099] to-[#C44B3F]",
  "from-[#6A1B4D] to-[#FF0099]",
];

const FILTERS = ["All", "Social", "Meetup", "Trip", "Camp"] as const;

/**
 * Filters + events timeline + detail/RSVP dialog. All shared client state
 * (the active filter and the selected event) lives here so the section is
 * fully self-contained and interactive whether it renders on the coded page
 * or full-bleed through the section builder. Events come from useEvents().
 */
export function EventsBody() {
  // Unified feed: published admin events + member meetups in one category.
  const { events, loading, isMeetup, isSynced, deleteItem } =
    useCombinedEvents();
  // In-place edit mode (admin-only toggle) adds a delete control + source
  // badge to every event card, so "random" events can be removed right
  // here on /events, whatever backend table they came from.
  const editing = useInlineEdit((s) => s.enabled);
  const confirmDialog = useConfirm();
  const [filter, setFilter] = useState<string>("All");
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<"list" | "map">("list");
  // `origin` drives distance labels + the blue "you" dot; `focus` recenters
  // the map (a fresh object each time so re-selecting the same place flies).
  const [origin, setOrigin] = useState<GeoCoord | null>(null);
  const [focus, setFocus] = useState<GeoCoord | null>(null);
  const [locating, setLocating] = useState(false);
  const reduceMotion = useReducedMotion();

  const upcoming = events
    // Drafts (published === false) are admin-only; never show on the public page.
    .filter((e) => e.published !== false)
    .filter((e) => {
      const d = safeDate(e.date);
      return d !== null && !isPast(d);
    })
    .filter((e) => filter === "All" || (e.type ?? "").toLowerCase() === filter.toLowerCase())
    .sort((a, b) => a.date.localeCompare(b.date));

  const mappableCount = upcoming.filter(
    (e) => e.lat != null && e.lng != null,
  ).length;

  function handlePlace(r: LocationResult) {
    const c = { lat: r.lat, lng: r.lng };
    setOrigin(c);
    setFocus({ ...c });
    setView("map");
  }

  async function handleAdminDelete(ev: CalendarEvent) {
    const synced = isSynced(ev.id);
    const ok = await confirmDialog({
      title: `Delete "${ev.title}"?`,
      description: synced
        ? "This event came from a synced calendar feed. It will be removed for everyone, and the feed is blocked from re-adding it."
        : isMeetup(ev.id)
          ? "This member-hosted meetup will be removed for everyone."
          : "This event will be permanently removed for everyone.",
      confirmText: "Delete",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteItem(ev.id);
    if (done) toast.success("Deleted — it won't come back.");
    else toast.error("Couldn't delete. Check you're signed in as admin.");
  }

  function handleLocate() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't available in this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setOrigin(c);
        setFocus({ ...c });
        setView("map");
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error(
          "Couldn't get your location. Check your browser permissions and try again.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <>
      {/* Filters + view toggle */}
      <section className="glass sticky top-[88px] z-10 border-b border-[#221019]/10">
        <div className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-4 py-3 sm:px-6 lg:px-8">
          {FILTERS.map((f, i) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                "shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]",
                filter === f
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-md shadow-[#FF0099]/25"
                  : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
              )}
            >
              <EditableText as="span" id={`events.filter.${i}`}>{f}</EditableText>
            </button>
          ))}

          {/* List / Map view toggle */}
          <div
            className="ml-auto flex shrink-0 overflow-hidden rounded-full border border-[#221019]/15"
            role="group"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm font-semibold transition-colors",
                view === "list"
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white"
                  : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
              )}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              type="button"
              onClick={() => setView("map")}
              aria-pressed={view === "map"}
              className={cn(
                "flex items-center gap-1 px-3 py-1.5 text-sm font-semibold transition-colors",
                view === "map"
                  ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white"
                  : "text-ink-soft hover:bg-[#FF0099]/5 hover:text-[#B51760]",
              )}
            >
              <MapIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Map</span>
            </button>
          </div>
        </div>
      </section>

      {/* Map view: search + locate controls, then the live pin map */}
      {view === "map" && (
        <section className="canvas-editorial relative py-8">
          <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <LocationAutocomplete
                  onSelect={handlePlace}
                  clearOnSelect={false}
                  placeholder="Search a city, state, or zip to center the map"
                />
              </div>
              <button
                type="button"
                onClick={handleLocate}
                disabled={locating}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-[#221019]/15 bg-white px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760] disabled:opacity-60"
              >
                {locating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Navigation className="h-4 w-4 text-[#FF0099]" />
                )}
                Use my location
              </button>
            </div>

            <EventsMap
              events={upcoming}
              origin={origin}
              focus={focus}
              onSelect={(e) => setDetail(e)}
            />

            <p className="mt-3 text-center text-xs text-ink-soft">
              {mappableCount > 0 ? (
                <>
                  Showing {mappableCount} upcoming{" "}
                  {mappableCount === 1 ? "event" : "events"} on the map. Tap a
                  pin for details.
                </>
              ) : (
                <>No upcoming events have a mapped location yet.</>
              )}
            </p>
          </div>
        </section>
      )}

      {/* Events timeline */}
      {view === "list" && (
      <section className="canvas-editorial relative py-14">
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4" aria-busy="true" aria-live="polite">
              <span className="sr-only">Loading events…</span>
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex w-full items-stretch overflow-hidden rounded-2xl border border-[#221019]/8 bg-white elevate-2"
                >
                  <div className="h-[88px] w-24 shrink-0 animate-pulse bg-rosa/10" />
                  <div className="flex-1 space-y-2.5 px-5 py-5">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-rosa/10" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-rosa/10" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-rosa/10" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state — only once loading has settled */}
          {!loading && upcoming.length === 0 && (
            <motion.div
              initial={reduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-24 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl glass elevate-2">
                <Calendar className="h-7 w-7 text-[#B51760]/50" />
              </div>
              <p className="text-lg font-display text-ink">
                {filter === "All" ? (
                  <EditableText as="span" id="events.empty.title">Nothing on the calendar yet</EditableText>
                ) : (
                  `No ${filter.toLowerCase()} events coming up`
                )}
              </p>
              <p className="text-sm text-ink-soft mt-1">
                {filter === "All" ? (
                  <EditableText as="span" id="events.empty.subtitleAll">Check back soon, amiga — new adventures drop often ♡</EditableText>
                ) : (
                  <EditableText as="span" id="events.empty.subtitleFiltered">Try a different filter, or check back soon ♡</EditableText>
                )}
              </p>
              {filter !== "All" && (
                <button
                  onClick={() => setFilter("All")}
                  className="mt-5 rounded-full border border-[#221019]/15 px-5 py-1.5 text-sm font-semibold text-ink transition-colors hover:bg-[#FF0099]/5 hover:text-[#B51760] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                >
                  <EditableText as="span" id="events.empty.reset">Show all events</EditableText>
                </button>
              )}
            </motion.div>
          )}

          {!loading && upcoming.length > 0 && (
            <AnimatePresence mode="popLayout">
              {upcoming.map((ev, i) => {
                const ts = typeStyle(ev.type);
                const grad = GRADIENTS[i % GRADIENTS.length];
                const d = safeDate(ev.date);
                const endD = safeDate(ev.endDate);
                return (
                  <motion.div
                    key={ev.id}
                    layout
                    initial={reduceMotion ? false : { opacity: 0, x: -24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
                    transition={{ delay: reduceMotion ? 0 : i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                    className="relative mb-4"
                  >
                    {/* Admin edit-mode controls: source badge + delete. */}
                    {editing && (
                      <div className="absolute -right-2 -top-2 z-10 flex items-center gap-1.5">
                        {isSynced(ev.id) && (
                          <span className="rounded-full border border-[#221019]/10 bg-white px-2 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm">
                            Synced
                          </span>
                        )}
                        {isMeetup(ev.id) && (
                          <span className="rounded-full border border-[#221019]/10 bg-white px-2 py-0.5 text-[10px] font-bold text-ink-soft shadow-sm">
                            Member meetup
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleAdminDelete(ev);
                          }}
                          aria-label={`Delete ${ev.title}`}
                          title="Delete this event for everyone"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white shadow-lg transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => setDetail(ev)}
                      aria-label={`View details for ${ev.title}${d ? `, ${format(d, "MMMM d, yyyy")}` : ""}`}
                      className="lift group flex w-full items-stretch gap-0 rounded-2xl border border-[#221019]/8 bg-white overflow-hidden text-left elevate-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099]"
                    >
                      {/* Date block — photo (when available) behind the date stamp, else gradient */}
                      <div className={`grain relative flex w-24 shrink-0 flex-col items-center justify-center overflow-hidden bg-gradient-to-br ${grad} text-white p-4`}>
                        {ev.image && (
                          <>
                            <Image src={ev.image} alt={ev.title} fill sizes="96px" className="object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-br from-black/55 via-black/35 to-black/50" aria-hidden="true" />
                          </>
                        )}
                        <div className="relative z-10 flex flex-col items-center">
                          {d ? (
                            <>
                              <span className="text-[10px] font-bold uppercase tracking-wider leading-none opacity-80">
                                {format(d, "MMM")}
                              </span>
                              <span className="text-3xl font-extrabold leading-tight font-[family-name:var(--font-heading)]">
                                {format(d, "d")}
                              </span>
                              <span className="text-[10px] opacity-70 mt-0.5">
                                {format(d, "EEE")}
                              </span>
                            </>
                          ) : (
                            <Calendar className="h-6 w-6 opacity-80" aria-hidden="true" />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 py-4 px-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-display text-ink text-lg group-hover:text-[#B51760] transition-colors">
                              <span aria-hidden="true">{ts.emoji} </span>{ev.title}
                            </h3>
                            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-ink-soft">
                              {ev.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-[#FF0099]/70" aria-hidden="true" />
                                  {ev.location}
                                </span>
                              )}
                              {d && endD && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-[#FF0099]/70" aria-hidden="true" />
                                  {format(d, "MMM d")} — {format(endD, "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>
                          {ev.type && ev.type !== "synced" && (
                            <Badge className={`shrink-0 ${ts.cls} text-[10px] font-bold capitalize`}>
                              {ev.type}
                            </Badge>
                          )}
                        </div>
                        {ev.description && (
                          <p className="mt-2 text-sm text-ink-soft line-clamp-1">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </section>
      )}

      {/* Event detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="glass-strong border-rosa/30 elevate-4">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-display text-ink">
                  <span aria-hidden="true">{typeStyle(detail.type).emoji} </span>{detail.title}
                </DialogTitle>
                {detail.description && (
                  <DialogDescription className="leading-relaxed">
                    {detail.description}
                  </DialogDescription>
                )}
              </DialogHeader>
              {detail.type && detail.type !== "synced" && (
                <Badge className={`w-fit capitalize ${typeStyle(detail.type).cls}`}>
                  {detail.type}
                </Badge>
              )}
              <Separator className="border-rosa/20" />
              <div className="space-y-2 text-sm text-ink-soft">
                {safeDate(detail.date) && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#FF0099]" aria-hidden="true" />
                    {format(safeDate(detail.date)!, "MMMM d, yyyy")}
                    {safeDate(detail.endDate) &&
                      ` — ${format(safeDate(detail.endDate)!, "MMMM d, yyyy")}`}
                  </div>
                )}
                {detail.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#FF0099]" aria-hidden="true" />
                    {detail.location}
                  </div>
                )}
              </div>
              {ensureHttp(detail.link) && (
                <a
                  href={ensureHttp(detail.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 text-sm font-semibold text-white transition hover:brightness-110"
                >
                  {detail.linkLabel?.trim() || "Open link"}
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              {RSVP_TYPES.has(detail.type ?? "") && (
                <>
                  <Separator className="border-rosa/20" />
                  <EventRsvp
                    targetType={isMeetup(detail.id) ? "meetup" : "event"}
                    targetId={detail.id}
                    title={detail.title}
                    date={detail.date}
                    startTime={detail.startTime}
                    location={detail.location}
                    capacity={detail.capacity}
                  />
                </>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
