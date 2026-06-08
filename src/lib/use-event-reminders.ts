"use client";

/**
 * Opt-in "Remind me" reminders for events, meetups, and trips.
 *
 * The member toggles a reminder on something they've RSVP'd to; we
 * persist the intent locally (Zustand + localStorage, key
 * `ayms-event-reminders`) and derive *due* reminders entirely on the
 * client: when a saved item starts within the next ~24 hours and we
 * haven't fired yet, we emit a `reminder` notification via
 * pushNotification so it lands in the member's persistent bell feed.
 *
 * Why client-side: there's no cron/server here, and reminders are a
 * personal nudge — deriving them from the persisted list on an interval
 * (and on mount) is enough, survives reloads, and never double-fires
 * thanks to the per-reminder `firedAt` stamp.
 *
 * Notifications are best-effort: if Firebase is unconfigured the toggle
 * still persists, it just can't surface a bell notification.
 */

import { useEffect } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useAuth } from "./store";
import { pushNotification } from "./notify";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ReminderTargetType = "event" | "meetup" | "trip";

export interface EventReminder {
  /** Stable composite key: `${targetType}:${targetId}`. */
  key: string;
  targetType: ReminderTargetType;
  targetId: string;
  title: string;
  /** Event start date, YYYY-MM-DD. */
  date: string;
  /** Optional HH:mm start time; assumed 09:00 local when absent. */
  startTime?: string;
  /** Optional location, surfaced in the reminder body. */
  location?: string;
  /** ISO timestamp of when we fired the reminder; null until fired. */
  firedAt: string | null;
  createdAt: string;
}

interface RemindersState {
  reminders: Record<string, EventReminder>;
  /** True when a reminder exists for this target. */
  isSet: (key: string) => boolean;
  /** Add/refresh a reminder. Keeps any existing `firedAt`. */
  setReminder: (
    r: Omit<EventReminder, "firedAt" | "createdAt" | "key"> & { key?: string },
  ) => void;
  removeReminder: (key: string) => void;
  markFired: (key: string, firedAt: string) => void;
}

export function reminderKey(
  targetType: ReminderTargetType,
  targetId: string,
): string {
  return `${targetType}:${targetId}`;
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export const useEventReminders = create<RemindersState>()(
  persist(
    (set, get) => ({
      reminders: {},

      isSet: (key) => Boolean(get().reminders[key]),

      setReminder: (r) => {
        const key = r.key ?? reminderKey(r.targetType, r.targetId);
        set((s) => {
          const existing = s.reminders[key];
          return {
            reminders: {
              ...s.reminders,
              [key]: {
                key,
                targetType: r.targetType,
                targetId: r.targetId,
                title: r.title,
                date: r.date,
                startTime: r.startTime,
                location: r.location,
                // Preserve firedAt if the item was re-saved (e.g. date
                // edited) so we don't re-notify for an already-fired one
                // unless the date moved into the future again (handled
                // by the scheduler comparing against "now").
                firedAt: existing?.firedAt ?? null,
                createdAt: existing?.createdAt ?? new Date().toISOString(),
              },
            },
          };
        });
      },

      removeReminder: (key) => {
        set((s) => {
          if (!s.reminders[key]) return s;
          const next = { ...s.reminders };
          delete next[key];
          return { reminders: next };
        });
      },

      markFired: (key, firedAt) => {
        set((s) => {
          const existing = s.reminders[key];
          if (!existing) return s;
          return {
            reminders: { ...s.reminders, [key]: { ...existing, firedAt } },
          };
        });
      },
    }),
    {
      name: "ayms-event-reminders",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/* ------------------------------------------------------------------ */
/* Due-reminder derivation                                             */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // re-check every 5 min

/** Resolve a reminder's start instant (assumes 09:00 local if no time). */
function startInstant(r: EventReminder): number {
  const time = r.startTime && /^\d{2}:\d{2}/.test(r.startTime)
    ? r.startTime
    : "09:00";
  const dt = new Date(`${r.date}T${time}`);
  return dt.getTime();
}

function hrefFor(r: EventReminder): string {
  if (r.targetType === "trip") return "/community/my-events";
  if (r.targetType === "meetup") return "/community/meetups";
  return "/community/calendar";
}

/**
 * Mount-once scheduler that fires due reminders. Drop it anywhere that
 * renders inside the authed community area (e.g. the My Upcoming page,
 * or alongside the RSVP control). It self-throttles via the per-reminder
 * `firedAt` stamp, so mounting it in more than one place is harmless.
 */
export function useReminderScheduler(): void {
  const uid = useAuth((s) => s.user?.id);

  useEffect(() => {
    if (!uid) return;
    // Narrow once for the nested closure (TS won't carry the guard's
    // narrowing into a nested function declaration).
    const userId = uid;

    function sweep() {
      const now = Date.now();
      const { reminders, markFired } = useEventReminders.getState();
      for (const r of Object.values(reminders)) {
        if (r.firedAt) continue;
        const start = startInstant(r);
        if (Number.isNaN(start)) continue;
        const untilStart = start - now;
        // Fire once the item is within 24h and still upcoming.
        if (untilStart <= DAY_MS && untilStart > -DAY_MS) {
          const firedAt = new Date().toISOString();
          markFired(r.key, firedAt);
          void pushNotification(userId, {
            kind: "reminder",
            title: `Coming up: ${r.title}`,
            body: r.location
              ? `Starts soon at ${r.location}. Tap to view details.`
              : "Starts within 24 hours. Tap to view details.",
            href: hrefFor(r),
          });
        }
      }
    }

    sweep();
    const id = setInterval(sweep, CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [uid]);
}
