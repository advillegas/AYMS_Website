"use client";

import { useState, useMemo } from "react";
import { useEvents, type CalendarEvent } from "@/lib/store";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Calendar as CalIcon, MapPin, Clock } from "lucide-react";
import { format, isSameDay, isSameMonth, parseISO } from "date-fns";

const TYPE_COLORS: Record<string, string> = {
  trip: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  meetup:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  camp: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  social:
    "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300",
};

export default function CalendarPage() {
  const events = useEvents((s) => s.events);
  const [selected, setSelected] = useState<Date>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const [detail, setDetail] = useState<CalendarEvent | null>(null);

  const eventDates = useMemo(
    () => events.map((e) => parseISO(e.date)),
    [events],
  );

  const selectedEvents = events.filter((e) =>
    isSameDay(parseISO(e.date), selected),
  );

  const monthEvents = events
    .filter((e) => isSameMonth(parseISO(e.date), month))
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="flex h-full flex-col lg:flex-row">
      {/* Calendar and selected day */}
      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalIcon className="h-6 w-6 text-primary" />
            Events Calendar
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View upcoming events, trips, and meetups
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
          <Card className="w-fit">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selected}
                onSelect={(d) => d && setSelected(d)}
                month={month}
                onMonthChange={setMonth}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{
                  hasEvent:
                    "relative after:absolute after:bottom-0.5 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                }}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold">
                {format(selected, "EEEE, MMMM d, yyyy")}
              </h2>
            </CardHeader>
            <CardContent>
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No events scheduled for this day.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedEvents.map((ev) => (
                    <button
                      key={ev.id}
                      onClick={() => setDetail(ev)}
                      className="w-full rounded-lg border border-border p-4 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold">{ev.title}</h3>
                        <Badge
                          variant="secondary"
                          className={TYPE_COLORS[ev.type]}
                        >
                          {ev.type}
                        </Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {ev.description}
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {ev.location}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Upcoming events sidebar */}
      <aside className="w-full border-t lg:w-80 lg:border-l lg:border-t-0 border-border bg-muted/20">
        <div className="p-4">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {format(month, "MMMM yyyy")} Events
          </h3>
          <ScrollArea className="h-[calc(100vh-180px)]">
            <div className="space-y-2">
              {monthEvents.length === 0 && (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No events this month.
                </p>
              )}
              {monthEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    setSelected(parseISO(ev.date));
                    setDetail(ev);
                  }}
                  className="w-full rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <span className="text-[10px] font-medium uppercase leading-none">
                        {format(parseISO(ev.date), "MMM")}
                      </span>
                      <span className="text-base font-bold leading-tight">
                        {format(parseISO(ev.date), "d")}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {ev.title}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {ev.location}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Event detail dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl">{detail?.title}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <Badge
                variant="secondary"
                className={TYPE_COLORS[detail.type]}
              >
                {detail.type}
              </Badge>
              <p className="text-muted-foreground">{detail.description}</p>
              <Separator />
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>
                    {format(parseISO(detail.date), "MMMM d, yyyy")}
                    {detail.endDate &&
                      ` — ${format(parseISO(detail.endDate), "MMMM d, yyyy")}`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{detail.location}</span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
