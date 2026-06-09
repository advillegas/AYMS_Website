"use client";

/**
 * Admin "Leads & inquiries" — the revenue pipeline view.
 *
 * Read-only CRM that surfaces two live lead sources:
 *   1. Trip reservations  → flat `tripReservations` collection
 *   2. Newsletter signups  → `newsletterSignups` collection
 *
 * Reservations have no admin-wide hook (the shared ones are per-trip /
 * per-user), so we set up our OWN onSnapshot over the whole collection
 * here — Firestore rules let any signed-in user (incl. admin) read it.
 * Newsletter signups reuse the existing admin list hook.
 *
 * When Firebase isn't configured every listener is a graceful no-op and
 * the page shows a "connect Firebase" empty state (mirrors the calendar
 * + members admin pages).
 */

import { useEffect, useMemo, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  limit,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Inbox,
  Users,
  Ticket,
  Hourglass,
  Mail,
  Wifi,
  WifiOff,
} from "lucide-react";
import { format } from "date-fns";
import { getDb, isFirebaseConfigured } from "@/lib/firebase";
import { useTrips } from "@/lib/use-trips";
import { useNewsletterList } from "@/lib/use-newsletter";
import {
  type TripReservation,
  type ReservationStatus,
} from "@/lib/use-trip-reservations";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Local doc mapper (admin-wide reservations listener)                 */
/* ------------------------------------------------------------------ */

interface ReservationDoc {
  tripId?: string;
  userId?: string;
  userName?: string;
  userAvatar?: string | null;
  status?: ReservationStatus;
  note?: string | null;
  createdAt?: { toDate?: () => Date };
}

function docToReservation(
  d: QueryDocumentSnapshot<DocumentData, DocumentData>,
): TripReservation {
  const data = d.data() as ReservationDoc;
  let createdAt = "";
  try {
    createdAt = data.createdAt?.toDate?.()?.toISOString() ?? "";
  } catch {
    createdAt = "";
  }
  return {
    id: d.id,
    tripId: data.tripId ?? "",
    userId: data.userId ?? "",
    userName: data.userName ?? "Amiga",
    userAvatar: data.userAvatar ?? undefined,
    status:
      data.status === "waitlist"
        ? "waitlist"
        : data.status === "cancelled"
          ? "cancelled"
          : "reserved",
    note: data.note ?? undefined,
    createdAt,
  };
}

/** Live listener over ALL reservations (admin roster view). */
function useAllReservations(): {
  reservations: TripReservation[];
  loading: boolean;
  error: boolean;
} {
  const [reservations, setReservations] = useState<TripReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(isFirebaseConfigured);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const db = getDb();
    if (!db) {
      setLoading(false);
      return;
    }
    // No orderBy (avoids composite-index requirements); sort newest-first
    // client-side after the snapshot lands.
    const q = query(collection(db, "tripReservations"), limit(1000));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map(docToReservation)
          .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setReservations(list);
        setError(false);
        setLoading(false);
      },
      (err: FirestoreError) => {
        console.warn("[leads] reservations snapshot failed", err);
        // Surface the failure so admins don't read an empty roster as
        // "no reservations" when the listener was actually denied/offline.
        setError(true);
        setLoading(false);
      },
    );
    return () => unsub();
  }, []);

  return { reservations, loading, error };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "reserved", label: "Reserved" },
  { value: "waitlist", label: "Waitlist" },
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number]["value"];

function StatusBadge({ status }: { status: ReservationStatus }) {
  if (status === "reserved") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      >
        Reserved
      </Badge>
    );
  }
  if (status === "waitlist") {
    return (
      <Badge
        variant="outline"
        className="text-[10px] h-5 border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      >
        Waitlist
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="text-[10px] h-5 text-muted-foreground">
      Cancelled
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminLeadsPage() {
  const {
    reservations,
    loading: resLoading,
    error: resError,
  } = useAllReservations();
  const { trips } = useTrips();
  const { signups, loading: newsLoading } = useNewsletterList();
  const [filter, setFilter] = useState<StatusFilter>("all");

  // tripId → title lookup for resolving reservations to trip names.
  const tripTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of trips) map.set(t.id, t.title);
    return map;
  }, [trips]);

  const reservedCount = useMemo(
    () => reservations.filter((r) => r.status === "reserved").length,
    [reservations],
  );
  const waitlistCount = useMemo(
    () => reservations.filter((r) => r.status === "waitlist").length,
    [reservations],
  );

  const visibleReservations = useMemo(() => {
    if (filter === "all") return reservations;
    return reservations.filter((r) => r.status === filter);
  }, [reservations, filter]);

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ---- Header ---- */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <Inbox className="h-6 w-6 text-primary" />
              Leads &amp; inquiries
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your revenue pipeline — trip reservations and newsletter
              signups as they come in, live from Firestore.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
              isFirebaseConfigured
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            )}
          >
            {isFirebaseConfigured ? (
              <>
                <Wifi className="h-3 w-3" /> Firebase live
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" /> Local only
              </>
            )}
          </span>
        </div>

        {!isFirebaseConfigured && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 text-sm text-amber-900 dark:text-amber-200">
              Connect Firebase to see leads. Add the{" "}
              <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code> env vars
              so reservations and newsletter signups sync here in real time.
            </CardContent>
          </Card>
        )}

        {/* ---- Summary stats ---- */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-4 w-4" />}
            label="Reservations"
            value={reservations.length}
          />
          <StatCard
            icon={<Ticket className="h-4 w-4" />}
            label="Reserved"
            value={reservedCount}
            tone="emerald"
          />
          <StatCard
            icon={<Hourglass className="h-4 w-4" />}
            label="Waitlist"
            value={waitlistCount}
            tone="amber"
          />
          <StatCard
            icon={<Mail className="h-4 w-4" />}
            label="Subscribers"
            value={signups.length}
          />
        </div>

        {/* ---- Reservations ---- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Ticket className="h-4 w-4 text-primary" />
                Reservations
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Every trip reservation, newest first.
              </p>
            </div>
            <div className="flex items-center gap-1">
              {STATUS_FILTERS.map((f) => (
                <Button
                  key={f.value}
                  size="sm"
                  variant={filter === f.value ? "default" : "ghost"}
                  onClick={() => setFilter(f.value)}
                  className={cn(
                    "h-7 px-2.5 text-xs",
                    filter === f.value && "bg-primary hover:bg-magenta",
                  )}
                >
                  {f.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {resLoading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading reservations…
              </p>
            ) : resError ? (
              <p className="text-xs text-destructive py-4 text-center">
                Couldn&apos;t load reservations. Check your connection and
                Firestore permissions, then refresh — this isn&apos;t an empty
                pipeline.
              </p>
            ) : visibleReservations.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                {reservations.length === 0
                  ? "No reservations yet. They'll appear here the moment a member books a trip."
                  : "No reservations match this filter."}
              </p>
            ) : (
              <div className="overflow-x-auto">
                {/* Column header (hidden on small screens) */}
                <div className="hidden sm:grid grid-cols-[1.4fr_1.6fr_auto_auto] gap-3 px-2 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
                  <span>Member</span>
                  <span>Trip</span>
                  <span>Status</span>
                  <span className="text-right">Date</span>
                </div>
                <div className="divide-y divide-border">
                  {visibleReservations.map((r) => (
                    <div
                      key={r.id}
                      className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1.6fr_auto_auto] items-center gap-x-3 gap-y-1 px-2 py-2.5 text-sm hover:bg-primary/5 rounded-md"
                    >
                      <span className="font-medium truncate">
                        {r.userName}
                      </span>
                      <span className="text-muted-foreground truncate order-3 sm:order-none col-span-2 sm:col-span-1 text-xs sm:text-sm">
                        {tripTitleById.get(r.tripId) ?? r.tripId ?? "—"}
                      </span>
                      <span className="justify-self-end sm:justify-self-start">
                        <StatusBadge status={r.status} />
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums text-right order-4 sm:order-none">
                        {formatDate(r.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Newsletter signups ---- */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Newsletter signups
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Marketing list captured across the site, newest first.
            </p>
          </CardHeader>
          <CardContent>
            {newsLoading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading signups…
              </p>
            ) : signups.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No newsletter signups yet.
              </p>
            ) : (
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {signups.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 px-2 py-2 text-sm hover:bg-primary/5 rounded-md"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {s.email}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] h-4 capitalize shrink-0"
                    >
                      {s.source}
                    </Badge>
                    {s.tripId && (
                      <span
                        className="text-[10px] text-muted-foreground truncate max-w-[140px] hidden sm:inline"
                        title={s.tripId}
                      >
                        {tripTitleById.get(s.tripId) ?? s.tripId}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground tabular-nums shrink-0">
                      {formatDate(s.createdAt ?? "")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stat card                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone?: "emerald" | "amber";
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : "text-primary";
  return (
    <Card className="border-rosa/20">
      <CardContent className="p-4">
        <div
          className={cn(
            "flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider",
            toneClass,
          )}
        >
          {icon}
          {label}
        </div>
        <p className="mt-1.5 text-2xl font-bold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}
