"use client";

/**
 * One unified "Events" feed.
 *
 * Historically the product had two redundant concepts: admin/synced
 * **events** (the `events` table, RLS = admins write) and member
 * **meetups** (the `meetups` table, RLS = members write their own). They
 * are the same thing to a member — a dated, located, RSVP-able gathering —
 * so everywhere in the UI we now present a single "Events" category.
 *
 * The two storage tables stay separate (their security rules differ), but
 * this hook merges them into one `CalendarEvent[]` so the marketing
 * `/events` page, the community calendar, and the map all read one feed.
 * `meetupIds` / `isMeetup` let callers route RSVPs to the correct backend
 * (member meetups RSVP under `meetups/{id}`, events under `events/{id}`).
 */

import { useMemo } from "react";
import { useEvents } from "./use-events";
import { useMeetups } from "./use-meetups";
import type { CalendarEvent } from "./events-data";

export interface CombinedEventsResult {
  /** Published admin events + all member meetups, mapped to one shape. */
  events: CalendarEvent[];
  /** Ids that came from the member `meetups` table. */
  meetupIds: Set<string>;
  /** True while either source is still loading. */
  loading: boolean;
  /** Resolve the RSVP target backend for an id in the merged feed. */
  isMeetup: (id: string) => boolean;
  /** Which synced-source (if any) an event id came from, for badges. */
  isSynced: (id: string) => boolean;
  /**
   * Delete any item in the merged feed, routing to the correct backend
   * (meetup vs event). Feed-synced events are tombstoned so the cron
   * sync can't re-create them. Admin-only by security rules.
   */
  deleteItem: (id: string) => Promise<boolean>;
}

export function useCombinedEvents(): CombinedEventsResult {
  const { events: rawEvents, loading: eventsLoading, deleteEvent } = useEvents();
  const { meetups, loading: meetupsLoading, deleteMeetup } = useMeetups();

  const meetupIds = useMemo(
    () => new Set(meetups.map((m) => m.id)),
    [meetups],
  );

  const events = useMemo<CalendarEvent[]>(() => {
    const mappedMeetups: CalendarEvent[] = meetups.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      date: m.date,
      startTime: m.startTime,
      type: "meetup",
      location: m.location,
      capacity: m.capacity,
      lat: m.lat ?? undefined,
      lng: m.lng ?? undefined,
      link: m.link,
      linkLabel: m.linkLabel,
      hostId: m.hostId,
    }));
    // Admin drafts (published === false) must never leak onto member-facing
    // surfaces. Member meetups have no publish gate.
    const publishedEvents = rawEvents.filter((e) => e.published !== false);
    return [...publishedEvents, ...mappedMeetups];
  }, [rawEvents, meetups]);

  const syncedIds = useMemo(
    () =>
      new Set(
        rawEvents.filter((e) => e.sourceCalendarId).map((e) => e.id),
      ),
    [rawEvents],
  );

  return {
    events,
    meetupIds,
    loading: eventsLoading || meetupsLoading,
    isMeetup: (id: string) => meetupIds.has(id),
    isSynced: (id: string) => syncedIds.has(id),
    deleteItem: (id: string) =>
      meetupIds.has(id) ? deleteMeetup(id) : deleteEvent(id),
  };
}
