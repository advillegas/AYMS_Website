"use client";

import { useState, useMemo, useEffect } from "react";
import { useEvents, type CalendarEvent } from "@/lib/use-events";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar as CalIcon,
  MapPin,
  Clock,
  CalendarPlus,
  Download,
  ExternalLink,
  Rss,
  Copy,
  Check,
  Apple,
  ChevronLeft,
  ChevronRight,
  List,
  Grid3X3,
} from "lucide-react";
import {
  format,
  isSameDay,
  isSameMonth,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isToday,
} from "date-fns";
import { Button } from "@/components/ui/button";
import {
  googleCalendarUrl,
  outlookCalendarUrl,
  downloadIcs,
  calendarFeedUrl,
  googleSubscribeUrl,
  webcalSubscribeUrl,
  outlookSubscribeUrl,
} from "@/lib/calendar-export";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { getUserCoords, haversineDistance } from "@/lib/geo";
import { EventComments } from "@/components/community/event-comments";

const TYPE_COLORS: Record<string, string> = {
  trip: "bg-blue-500",
  meetup: "bg-emerald-500",
  camp: "bg-orange-500",
  social: "bg-primary",
  synced: "bg-primary",
};

const TYPE_BADGE_COLORS: Record<string, string> = {
  trip: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  meetup: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  camp: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  social: "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
  synced: "bg-primary/10 text-primary",
};

const WEEKDAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const WEEKDAYS_LONG = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month));
  const end = endOfWeek(endOfMonth(month));
  const days: Date[] = [];
  let d = start;
  while (d <= end) {
    days.push(d);
    d = addDays(d, 1);
  }
  return days;
}

type ViewMode = "calendar" | "list";

export default function CalendarPage() {
  const { events } = useEvents();
  const user = useAuth((s) => s.user);
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date>(new Date());
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState<ViewMode>("calendar");
  const [showNearbyOnly, setShowNearbyOnly] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  const userCoords = getUserCoords(user);
  const eventRadius = user?.eventRadiusMiles ?? 100;

  // Geo-cached event coordinates (lazy, in-memory only)
  const [eventGeoCache] = useState(() => new Map<string, { lat: number; lng: number } | null>());

  const filteredEvents = useMemo(() => {
    if (!showNearbyOnly || !userCoords || eventRadius <= 0) return events;
    return events.filter((ev) => {
      // Events without location always pass
      if (!ev.location) return true;
      // For now, we can't geocode synchronously. Events from the
      // sync route will have coordinates once we add geocoding to
      // the import. Until then, all events pass through.
      return true;
    });
  }, [events, showNearbyOnly, userCoords, eventRadius, eventGeoCache]);

  const days = useMemo(() => getCalendarDays(month), [month]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of filteredEvents) {
      if (!ev.date) continue;
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);

  const selectedEvents = useMemo(() => {
    const key = format(selected, "yyyy-MM-dd");
    return eventsByDate.get(key) ?? [];
  }, [selected, eventsByDate]);

  const monthEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => e.date && isSameMonth(parseISO(e.date), month))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, month]);

  function handleDayClick(day: Date) {
    setSelected(day);
    const key = format(day, "yyyy-MM-dd");
    const dayEvs = eventsByDate.get(key) ?? [];
    if (dayEvs.length === 1) {
      setDetail(dayEvs[0]);
    } else if (dayEvs.length > 1) {
      setView("list");
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-rosa/20 bg-card/80 px-3 py-2 sm:px-4 sm:py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <CalIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              <span className="truncate">Events Calendar</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
              {events.length} events · Click any day to see details
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Nearby filter */}
            {userCoords && (
              <button
                type="button"
                onClick={() => setShowNearbyOnly((v) => !v)}
                className={cn(
                  "flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  showNearbyOnly
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-rosa/30 bg-background text-foreground/70 hover:bg-primary/10",
                )}
                title={`Show events within ${eventRadius} miles`}
              >
                <MapPin className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">
                  {showNearbyOnly ? `Within ${eventRadius} mi` : "Nearby"}
                </span>
              </button>
            )}
            {/* View toggle */}
            <div className="flex rounded-lg border border-rosa/30 overflow-hidden">
              <button
                type="button"
                onClick={() => setView("calendar")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  view === "calendar"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground/70 hover:bg-primary/10",
                )}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors",
                  view === "list"
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-foreground/70 hover:bg-primary/10",
                )}
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Events</span>
              </button>
            </div>
            <SubscribeButton origin={origin} />
          </div>
        </div>
      </div>

      {/* Month navigation — always visible */}
      <div className="shrink-0 flex items-center justify-between px-3 py-2 sm:px-6 border-b border-rosa/10 bg-card/40">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(subMonths(month, 1))}
          className="h-8 w-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-center">
          <h2 className="text-base sm:text-xl font-bold font-[family-name:var(--font-heading)]">
            {format(month, "MMMM yyyy")}
          </h2>
          <button
            type="button"
            onClick={() => {
              setMonth(new Date());
              setSelected(new Date());
            }}
            className="text-[10px] text-primary hover:underline"
          >
            Today
          </button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(addMonths(month, 1))}
          className="h-8 w-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-auto">
        {view === "calendar" ? (
          <div className="p-2 sm:p-4 lg:p-6">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS_LONG.map((d, i) => (
                <div
                  key={d}
                  className="text-center text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground py-1"
                >
                  <span className="sm:hidden">{WEEKDAYS_SHORT[i]}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7 gap-px bg-rosa/20 rounded-lg border border-rosa/20">
              {days.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDate.get(key) ?? [];
                const inMonth = isSameMonth(day, month);
                const isSelected = isSameDay(day, selected);
                const today = isToday(day);
                const hasEvents = dayEvents.length > 0;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "relative bg-card text-left transition-colors",
                      "min-h-[48px] p-1 sm:min-h-[80px] sm:p-1.5 lg:min-h-[100px]",
                      inMonth
                        ? "hover:bg-primary/5"
                        : "bg-muted/30 text-muted-foreground/50",
                      isSelected &&
                        "rounded-lg shadow-[inset_0_0_0_2px_var(--color-primary)] bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full text-[10px] sm:text-xs font-medium",
                        today && "bg-primary text-primary-foreground",
                        isSelected &&
                          !today &&
                          "bg-primary/20 text-primary font-bold",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {/* Mobile: dot indicators */}
                    {hasEvents && (
                      <div className="flex gap-0.5 mt-0.5 sm:hidden justify-center">
                        {dayEvents.slice(0, 3).map((ev, i) => (
                          <span
                            key={i}
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              TYPE_COLORS[ev.type] ?? "bg-primary",
                            )}
                          />
                        ))}
                      </div>
                    )}

                    {/* Desktop: event pills */}
                    {hasEvents && (
                      <div className="mt-0.5 space-y-0.5 hidden sm:block">
                        {dayEvents.slice(0, 3).map((ev) => (
                          <div
                            key={ev.id}
                            className={cn(
                              "truncate rounded px-1 py-0.5 text-[9px] lg:text-[10px] font-medium text-white leading-tight cursor-pointer",
                              TYPE_COLORS[ev.type] ?? "bg-primary",
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(day);
                              setDetail(ev);
                            }}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[9px] text-muted-foreground px-1">
                            +{dayEvents.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile: selected day events below grid */}
            {selectedEvents.length > 0 && (
              <div className="mt-3 sm:hidden space-y-2">
                <h3 className="text-xs font-semibold text-primary">
                  {format(selected, "EEEE, MMMM d")}
                </h3>
                {selectedEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setDetail(ev)}
                    className="flex w-full items-start gap-3 rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-primary/5"
                  >
                    <div
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        TYPE_COLORS[ev.type] ?? "bg-primary",
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{ev.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {ev.description}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {ev.location || "TBD"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* List view */
          <div className="p-3 sm:p-4 lg:p-6">
            {monthEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center italic">
                No events in {format(month, "MMMM yyyy")}.
              </p>
            ) : (
              <div className="space-y-2">
                {monthEvents.map((ev) => (
                  <button
                    key={ev.id}
                    onClick={() => setDetail(ev)}
                    className="flex w-full items-center gap-3 rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-primary/5 [background-color:#fff]"
                  >
                    <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-rosa/20 text-primary">
                      <span className="text-[9px] font-semibold uppercase leading-none">
                        {format(parseISO(ev.date), "MMM")}
                      </span>
                      <span className="text-lg font-bold leading-tight">
                        {format(parseISO(ev.date), "d")}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {ev.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {ev.description}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {ev.location || "TBD"}
                        </span>
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[8px] h-4",
                            TYPE_BADGE_COLORS[ev.type],
                          )}
                        >
                          {ev.type}
                        </Badge>
                      </div>
                    </div>
                    <div
                      className={cn(
                        "h-2 w-2 shrink-0 rounded-full",
                        TYPE_COLORS[ev.type] ?? "bg-primary",
                      )}
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Event detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className={TYPE_BADGE_COLORS[detail.type]}
              >
                {detail.type}
              </Badge>
              <p className="text-muted-foreground">{detail.description}</p>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {format(parseISO(detail.date), "EEEE, MMMM d, yyyy")}
                    {detail.startTime && ` at ${detail.startTime}`}
                    {detail.endTime && ` – ${detail.endTime}`}
                    {detail.endDate &&
                      ` — ${format(parseISO(detail.endDate), "MMMM d, yyyy")}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{detail.location || "Location TBD"}</span>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                  <CalendarPlus className="h-3 w-3" /> Add to your calendar
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={googleCalendarUrl(detail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 rounded-md border border-primary/30 bg-background px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Google
                  </a>
                  <a
                    href={outlookCalendarUrl(detail)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center h-8 rounded-md border border-primary/30 bg-background px-3 text-xs font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Outlook
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadIcs(detail)}
                    className="border-primary/30 hover:bg-primary/10 h-8"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    .ics
                  </Button>
                </div>
              </div>
              <Separator />
              <EventComments eventId={detail.id} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Subscribe button + dialog                                           */
/* ------------------------------------------------------------------ */

function SubscribeButton({ origin }: { origin: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const feedUrl = origin ? calendarFeedUrl(origin) : "";

  async function copyFeed() {
    if (!feedUrl) return;
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      toast.success("Feed URL copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy.");
    }
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        size="sm"
        className="bg-gradient-to-r from-primary to-magenta text-white"
      >
        <Rss className="h-3.5 w-3.5 mr-1" />
        <span className="hidden sm:inline">Subscribe</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5 text-primary" />
              Subscribe to calendar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get every AYMS event in your personal calendar automatically.
            </p>

            <div className="space-y-2">
              <a
                href={feedUrl ? googleSubscribeUrl(origin) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (feedUrl) {
                    void navigator.clipboard.writeText(feedUrl);
                    toast.success(
                      "URL copied! If Google errors, paste it in Settings → From URL.",
                      { duration: 6000 },
                    );
                  }
                }}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block font-medium">Google Calendar</span>
                  <span className="block text-[10px] text-muted-foreground">
                    URL also copied as backup
                  </span>
                </div>
              </a>

              <a
                href={feedUrl ? webcalSubscribeUrl(origin) : "#"}
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                <Apple className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block font-medium">Apple Calendar</span>
                  <span className="block text-[10px] text-muted-foreground">
                    macOS / iOS subscribe
                  </span>
                </div>
              </a>

              <a
                href={feedUrl ? outlookSubscribeUrl(origin) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm hover:bg-primary/10 hover:border-primary/30 transition-colors"
              >
                <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                <div>
                  <span className="block font-medium">Outlook</span>
                  <span className="block text-[10px] text-muted-foreground">
                    Microsoft calendar
                  </span>
                </div>
              </a>
            </div>

            <Separator />

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                Or copy the feed URL
              </p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={feedUrl || "Loading..."}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                  className="flex-1 rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs font-mono select-all focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="button"
                  onClick={copyFeed}
                  size="sm"
                  variant="outline"
                  disabled={!feedUrl}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
