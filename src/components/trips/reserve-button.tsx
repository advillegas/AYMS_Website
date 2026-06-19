"use client";

/**
 * Persistent trip reservation control. Replaces the old mailto: booking
 * flow on the trips page with a real Firestore-backed reservation:
 *
 *   - seats available → "Reserve my spot"
 *   - full            → "Join waitlist"
 *   - already in      → "You're in ✓ — cancel" (or "On waitlist — leave")
 *
 * Live seat math comes from useTripReservations(tripId, spots).
 * No payment is taken anywhere — this only saves the member's intent
 * and confirms it. The marketing "deposit/secure your spot" copy on the
 * page stays as copy.
 *
 * Logged-out viewers get a friendly "Sign in to reserve" prompt.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2, LogIn, Clock, Users, ArrowRight } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useTripReservations } from "@/lib/use-trip-reservations";
import { ensureHttp } from "@/lib/url";
import type { Trip } from "@/lib/trips-data";

interface ReserveButtonProps {
  trip: Trip;
  /** Compact layout for cards; full layout for the detail dialog. */
  variant?: "full" | "compact";
  signInHref?: string;
  className?: string;
}

export function ReserveButton({
  trip,
  variant = "full",
  signInHref = "/login",
  className,
}: ReserveButtonProps) {
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const {
    spotsLeft,
    isFull,
    reservedCount,
    waitlistCount,
    myReservation,
    loading,
    isFirebase,
    reserve,
    cancel,
  } = useTripReservations(trip.id, trip.spots);
  const [busy, setBusy] = useState(false);

  // Trips that are marketed as fully closed don't take reservations.
  const closed = trip.status === "sold-out" && !isFirebase;

  // Admin-provided booking link → a direct "Book Now" CTA to their payment or
  // details page. Takes priority over the free in-app hold and works for
  // logged-out viewers too.
  const bookingUrl = ensureHttp(trip.bookingUrl);
  if (bookingUrl) {
    const label = trip.bookingLabel?.trim() || "Book Now";
    return (
      <div className={cn(variant === "full" ? "space-y-2" : "space-y-1", className)}>
        <a
          href={bookingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 items-center justify-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-8 font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF0099] focus-visible:ring-offset-2"
        >
          {label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
        {variant === "full" && (
          <p className="text-[11px] text-muted-foreground">
            Opens the booking page in a new tab.
          </p>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className={cn("text-center", className)}>
        <Link
          href={signInHref}
          className="inline-flex h-12 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099] px-8 font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110 transition"
        >
          <LogIn className="h-4 w-4" />
          Sign in to reserve
        </Link>
        {variant === "full" && (
          <p className="mt-2 text-xs text-muted-foreground">
            Free to hold your spot — no payment online.
          </p>
        )}
      </div>
    );
  }

  async function handleReserve() {
    if (!isFirebase) {
      toast.error("Reservations need Firestore — set it up to enable this.");
      return;
    }
    setBusy(true);
    const status = await reserve();
    setBusy(false);
    if (status === "reserved") {
      toast.success(`Your spot on ${trip.title} is saved 🎉`);
    } else if (status === "waitlist") {
      toast.success(`You're on the waitlist for ${trip.title}`);
    } else {
      toast.error("Couldn't save your reservation. Try again.");
    }
  }

  async function handleCancel() {
    const onWaitlist = myReservation?.status === "waitlist";
    const ok = await confirm({
      title: onWaitlist ? "Leave the waitlist?" : "Cancel your reservation?",
      description: onWaitlist
        ? "You'll lose your place in line for this trip."
        : "Your held spot will be released for another amiga.",
      confirmText: onWaitlist ? "Leave waitlist" : "Cancel reservation",
      destructive: true,
    });
    if (!ok) return;
    setBusy(true);
    const done = await cancel();
    setBusy(false);
    if (done) {
      toast.success(onWaitlist ? "Left the waitlist." : "Reservation cancelled.");
    } else {
      toast.error("Couldn't cancel. Try again.");
    }
  }

  const reservedByMe = myReservation?.status === "reserved";
  const waitlistedByMe = myReservation?.status === "waitlist";

  // ---- Seat status line -------------------------------------------
  const statusLine = (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Users className="h-3.5 w-3.5 text-primary/60" />
      {loading ? (
        "Checking availability…"
      ) : isFull ? (
        <>
          <span className="font-semibold text-coral">Full</span>
          {waitlistCount > 0 && ` · ${waitlistCount} on waitlist`}
        </>
      ) : (
        <>
          <span className="font-semibold text-foreground">{spotsLeft}</span> of{" "}
          {trip.spots} spots left
          {reservedCount > 0 && ` · ${reservedCount} reserved`}
        </>
      )}
    </p>
  );

  // ---- Member already has a reservation ---------------------------
  if (reservedByMe || waitlistedByMe) {
    return (
      <div className={cn(variant === "full" ? "space-y-2" : "space-y-1", className)}>
        <Button
          type="button"
          onClick={handleCancel}
          disabled={busy}
          variant="outline"
          className={cn(
            "h-12 rounded-full px-6 font-semibold",
            reservedByMe
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 dark:text-emerald-300"
              : "border-amber-500/40 bg-amber-500/10 text-amber-700 hover:bg-amber-500/15 dark:text-amber-300",
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : reservedByMe ? (
            <Check className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          {reservedByMe ? "You're in ✓ — cancel" : "On waitlist — leave"}
        </Button>
        {statusLine}
      </div>
    );
  }

  // ---- No reservation yet -----------------------------------------
  return (
    <div className={cn(variant === "full" ? "space-y-2" : "space-y-1", className)}>
      <Button
        type="button"
        onClick={handleReserve}
        disabled={busy || closed}
        className={cn(
          "h-12 rounded-full border-0 px-8 font-semibold text-white shadow-[0_8px_30px_rgb(255_0_153/0.30)] hover:brightness-110",
          isFull
            ? "bg-gradient-to-r from-amber-500 to-amber-600"
            : "bg-gradient-to-r from-[#FF0099] via-[#B51760] to-[#FF0099]",
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isFull ? (
          <Clock className="h-4 w-4" />
        ) : null}
        {isFull ? "Join waitlist" : "Reserve my spot ♡"}
      </Button>
      {statusLine}
      {variant === "full" && (
        <p className="text-[11px] text-muted-foreground">
          Holding your spot is free — we&apos;ll follow up about deposit &amp;
          payment options. No payment online.
        </p>
      )}
    </div>
  );
}
