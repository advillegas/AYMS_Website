"use client";

/**
 * RSVP control for a calendar event or member meetup.
 *
 * Renders a Going / Interested toggle, an avatar stack of who's coming,
 * a capacity-aware "X going · N spots left" line, and an opt-in
 * "Remind me" toggle wired to the client-side reminder scheduler.
 *
 * Backed by useRsvps(targetType, targetId) so events and meetups share
 * one attendee model. When the viewer is logged out we show a friendly
 * "Sign in to RSVP" prompt instead of the controls.
 *
 * Emits an `rsvp` confirmation notification to the member on "Going".
 */

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Check, Star, Bell, BellRing, Loader2, Users, LogIn } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useRsvps, type RsvpStatus, type RsvpTargetType } from "@/lib/use-rsvps";
import {
  useEventReminders,
  useReminderScheduler,
  reminderKey,
  type ReminderTargetType,
} from "@/lib/use-event-reminders";
import { pushNotification } from "@/lib/notify";

interface EventRsvpProps {
  targetType: RsvpTargetType;
  targetId: string;
  /** Event/meetup title — used in toasts + reminder copy. */
  title: string;
  /** Start date (YYYY-MM-DD) — drives the reminder schedule. */
  date?: string;
  startTime?: string;
  location?: string;
  /** Optional attendance cap; when set, drives the "spots left" math. */
  capacity?: number;
  /** Sign-in link target; defaults to /login. */
  signInHref?: string;
  className?: string;
}

const MAX_AVATARS = 6;

export function EventRsvp({
  targetType,
  targetId,
  title,
  date,
  startTime,
  location,
  capacity,
  signInHref = "/login",
  className,
}: EventRsvpProps) {
  const user = useAuth((s) => s.user);
  const {
    going,
    goingCount,
    interestedCount,
    myRsvp,
    loading,
    isFirebase,
    toggle,
  } = useRsvps(targetType, targetId);

  const [busy, setBusy] = useState<RsvpStatus | null>(null);

  // Reminders
  useReminderScheduler();
  const rKey = reminderKey(targetType as ReminderTargetType, targetId);
  const reminderOn = useEventReminders((s) => Boolean(s.reminders[rKey]));
  const setReminder = useEventReminders((s) => s.setReminder);
  const removeReminder = useEventReminders((s) => s.removeReminder);

  const hasCap = typeof capacity === "number" && capacity > 0;
  const spotsLeft = hasCap ? Math.max(0, capacity - goingCount) : null;
  const full = hasCap && spotsLeft === 0;

  // ---- Logged-out state -------------------------------------------
  if (!user) {
    return (
      <div
        className={cn(
          "rounded-xl border border-rosa/25 bg-rosa/5 p-4 text-center",
          className,
        )}
      >
        <p className="text-sm font-medium text-foreground/80">
          Want in? RSVP to let your amigas know you&apos;re coming.
        </p>
        <Link
          href={signInHref}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgb(255_0_153/0.30)] hover:brightness-110 transition"
        >
          <LogIn className="h-3.5 w-3.5" />
          Sign in to RSVP
        </Link>
      </div>
    );
  }

  async function handleToggle(status: RsvpStatus) {
    if (!isFirebase) {
      toast.error("RSVPs need Firestore — set it up to enable this feature.");
      return;
    }
    setBusy(status);
    const result = await toggle(status);
    setBusy(null);
    if (result === "going") {
      toast.success(`You're going to ${title} 🎉`);
      void pushNotification(user!.id, {
        kind: "rsvp",
        title: `You're going to ${title} 🎉`,
        body: location ? `See you at ${location}.` : "See you there!",
        href:
          targetType === "meetup"
            ? "/community/meetups"
            : "/community/calendar",
      });
      // Auto-arm a reminder for confirmed attendance (opt-out via toggle).
      if (date) {
        setReminder({
          targetType: targetType as ReminderTargetType,
          targetId,
          title,
          date,
          startTime,
          location,
        });
      }
    } else if (result === "interested") {
      toast.success(`Marked as interested in ${title}`);
    } else {
      // Cleared — also drop the reminder so it doesn't fire for an
      // event the member backed out of.
      removeReminder(rKey);
      toast("RSVP removed");
    }
  }

  function handleReminderToggle() {
    if (reminderOn) {
      removeReminder(rKey);
      toast("Reminder off");
      return;
    }
    if (!date) {
      toast.error("This event has no date yet — can't set a reminder.");
      return;
    }
    setReminder({
      targetType: targetType as ReminderTargetType,
      targetId,
      title,
      date,
      startTime,
      location,
    });
    toast.success("We'll remind you ~24h before ♡");
  }

  const isGoing = myRsvp?.status === "going";
  const isInterested = myRsvp?.status === "interested";

  return (
    <section className={cn("space-y-3", className)}>
      {!isFirebase && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-900 dark:text-amber-200">
          RSVPs are stored in Firestore. Connect Firebase to enable
          going/interested tracking.
        </div>
      )}

      {/* Going / Interested toggle */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          onClick={() => handleToggle("going")}
          disabled={busy !== null || (full && !isGoing)}
          aria-pressed={isGoing}
          className={cn(
            "h-10 rounded-full px-5 font-semibold transition border-0",
            isGoing
              ? "bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_4px_14px_rgb(255_0_153/0.30)] hover:brightness-110"
              : "bg-primary/10 text-primary hover:bg-primary/15",
          )}
        >
          {busy === "going" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isGoing ? "Going" : full ? "Full" : "Going"}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={() => handleToggle("interested")}
          disabled={busy !== null}
          aria-pressed={isInterested}
          className={cn(
            "h-10 rounded-full px-5 font-semibold transition",
            isInterested
              ? "border-primary bg-primary/10 text-primary"
              : "border-primary/30 text-primary hover:bg-primary/5",
          )}
        >
          {busy === "interested" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className="h-4 w-4" />
          )}
          Interested
        </Button>

        {/* Remind me */}
        <button
          type="button"
          onClick={handleReminderToggle}
          aria-pressed={reminderOn}
          title={
            reminderOn
              ? "Reminder on — we'll nudge you ~24h before"
              : "Remind me ~24h before"
          }
          className={cn(
            "ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-medium transition",
            reminderOn
              ? "border-primary bg-primary text-primary-foreground"
              : "border-rosa/30 text-foreground/70 hover:bg-primary/10",
          )}
        >
          {reminderOn ? (
            <BellRing className="h-3.5 w-3.5" />
          ) : (
            <Bell className="h-3.5 w-3.5" />
          )}
          {reminderOn ? "Reminder on" : "Remind me"}
        </button>
      </div>

      {/* Avatar stack + count line */}
      <div className="flex items-center gap-3">
        {goingCount > 0 ? (
          <div className="flex -space-x-2" aria-hidden="true">
            {going.slice(0, MAX_AVATARS).map((r) => (
              <Avatar
                key={r.userId}
                className="h-7 w-7 ring-2 ring-background"
              >
                {r.userAvatar && (
                  <AvatarImage src={r.userAvatar} alt={r.userName} />
                )}
                <AvatarFallback className="bg-gradient-to-br from-primary/25 to-rosa/40 text-primary text-[10px] font-semibold">
                  {initials(r.userName)}
                </AvatarFallback>
              </Avatar>
            ))}
            {goingCount > MAX_AVATARS && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[10px] font-semibold text-muted-foreground">
                +{goingCount - MAX_AVATARS}
              </span>
            )}
          </div>
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          {loading && goingCount === 0 ? (
            "Loading RSVPs…"
          ) : goingCount === 0 ? (
            <>Be the first to RSVP{interestedCount > 0 && ` · ${interestedCount} interested`}</>
          ) : (
            <>
              <span className="font-semibold text-foreground">
                {goingCount}
              </span>{" "}
              going
              {hasCap && (
                <>
                  {" · "}
                  <span
                    className={cn(
                      "font-semibold",
                      full ? "text-coral" : "text-foreground",
                    )}
                  >
                    {full ? "Full" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`}
                  </span>
                </>
              )}
              {interestedCount > 0 && (
                <span className="text-muted-foreground">
                  {" · "}
                  {interestedCount} interested
                </span>
              )}
            </>
          )}
        </p>
      </div>
    </section>
  );
}
