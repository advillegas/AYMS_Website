"use client";

/**
 * Admin "Concierge inquiries" — the trip-planning lead pipeline.
 *
 * Lists every inquiry submitted through the public /concierge form
 * (newest first) with search, per-stage filters, a detail pane, and a
 * one-click status cycle (new → contacted → closed) persisted to the
 * live backend (Supabase `concierge_inquiries` in production; the
 * Firestore mirror when the flag is off). Data + mutations live in
 * src/lib/use-concierge.ts.
 */

import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  ConciergeBell,
  Search,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  Users,
  Wallet,
  RotateCcw,
  CircleDot,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BackendBadge, BACKEND_LIVE } from "@/components/admin/backend-badge";
import {
  useConciergeInquiries,
  CONCIERGE_STATUS_CYCLE,
  type ConciergeInquiry,
  type ConciergeStatus,
} from "@/lib/use-concierge";

/* ------------------------------------------------------------------ */
/* Status presentation                                                 */
/* ------------------------------------------------------------------ */

const STATUS_META: Record<
  ConciergeStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    chip: string;
  }
> = {
  new: {
    label: "New",
    icon: CircleDot,
    chip: "border-pink-500/40 bg-pink-500/10 text-pink-700 dark:text-pink-300",
  },
  contacted: {
    label: "Contacted",
    icon: Clock,
    chip: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  closed: {
    label: "Closed",
    icon: CheckCircle2,
    chip: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
};

function nextStatus(s: ConciergeStatus): ConciergeStatus {
  const i = CONCIERGE_STATUS_CYCLE.indexOf(s);
  return CONCIERGE_STATUS_CYCLE[(i + 1) % CONCIERGE_STATUS_CYCLE.length];
}

function StatusChip({ status }: { status: ConciergeStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] h-5 gap-1 shrink-0", meta.chip)}
    >
      <meta.icon className="h-2.5 w-2.5" />
      {meta.label}
    </Badge>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "closed", label: "Closed" },
] as const;

type Filter = (typeof FILTERS)[number]["value"];

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminConciergePage() {
  const { inquiries, loading, isLive, setStatus } = useConciergeInquiries();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = { new: 0, contacted: 0, closed: 0 };
    for (const i of inquiries) c[i.status] += 1;
    return c;
  }, [inquiries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inquiries.filter((i) => {
      if (filter !== "all" && i.status !== filter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        i.email.toLowerCase().includes(q) ||
        (i.destination ?? "").toLowerCase().includes(q)
      );
    });
  }, [inquiries, query, filter]);

  const selected = visible.find((i) => i.id === selectedId) ?? null;

  async function cycleStatus(inq: ConciergeInquiry) {
    const to = nextStatus(inq.status);
    const ok = await setStatus(inq.id, to);
    if (ok) {
      toast.success(`${inq.name || "Lead"} marked ${STATUS_META[to].label.toLowerCase()}`);
    } else {
      toast.error("Couldn't update the lead status. Check your connection and try again.");
    }
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* ---- Header ---- */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
              <ConciergeBell className="h-6 w-6 text-primary" />
              Concierge inquiries
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Trip-planning requests from the concierge form — triage them
              new → contacted → closed.
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {(["new", "contacted", "closed"] as const).map((s) => (
                <span
                  key={s}
                  className={cn(
                    "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
                    STATUS_META[s].chip,
                  )}
                >
                  {counts[s]} {STATUS_META[s].label.toLowerCase()}
                </span>
              ))}
            </div>
          </div>
          <BackendBadge />
        </div>

        {!BACKEND_LIVE && (
          <Card className="border-amber-500/30 bg-amber-500/5">
            <CardContent className="pt-4 text-sm text-amber-900 dark:text-amber-200">
              Connect a backend to see concierge leads. Add the Supabase (or{" "}
              <code className="text-xs">NEXT_PUBLIC_FIREBASE_*</code>) env vars
              so inquiries sync here in real time.
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          {/* ---- List ---- */}
          <Card>
            <CardHeader className="space-y-3">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or destination"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <div className="flex items-center gap-1">
                {FILTERS.map((f) => (
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
            <CardContent className="p-0">
              <div className="max-h-[65vh] overflow-y-auto divide-y divide-border">
                {loading && visible.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground italic">
                    Loading inquiries…
                  </p>
                )}
                {!loading && visible.length === 0 && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    {inquiries.length === 0
                      ? isLive
                        ? "No concierge inquiries yet. They'll appear here the moment someone submits the form."
                        : "No backend connected."
                      : "No inquiries match that search."}
                  </p>
                )}
                {visible.map((inq) => (
                  <button
                    key={inq.id}
                    type="button"
                    onClick={() => setSelectedId(inq.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                      selectedId === inq.id ? "bg-primary/10" : "hover:bg-primary/5",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm truncate">
                        {inq.name || "(no name)"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {inq.email}
                        {inq.destination ? ` · ${inq.destination}` : ""}
                      </p>
                    </div>
                    <StatusChip status={inq.status} />
                    <span className="text-[11px] text-muted-foreground tabular-nums shrink-0 w-20 text-right">
                      {formatDate(inq.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ---- Detail ---- */}
          <div className="lg:sticky lg:top-4 self-start">
            {selected ? (
              <InquiryDetail
                inquiry={selected}
                onCycle={() => cycleStatus(selected)}
                onClose={() => setSelectedId(null)}
              />
            ) : (
              <Card>
                <CardContent className="p-12 text-center text-sm text-muted-foreground">
                  Pick an inquiry on the left to see the full request and work
                  the lead.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Detail pane                                                         */
/* ------------------------------------------------------------------ */

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="break-words">{value}</p>
      </div>
    </div>
  );
}

function InquiryDetail({
  inquiry,
  onCycle,
  onClose,
}: {
  inquiry: ConciergeInquiry;
  onCycle: () => void;
  onClose: () => void;
}) {
  const ago = inquiry.createdAt
    ? formatDistanceToNow(new Date(inquiry.createdAt), { addSuffix: true })
    : "unknown";
  const to = nextStatus(inquiry.status);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold truncate">
              {inquiry.name || "(no name)"}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Received {ago}
            </p>
          </div>
          <StatusChip status={inquiry.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <DetailRow icon={Mail} label="Email" value={inquiry.email} />
          <DetailRow icon={Phone} label="Phone" value={inquiry.phone} />
          <DetailRow
            icon={MapPin}
            label="Destination"
            value={inquiry.destination}
          />
          <DetailRow
            icon={CalendarDays}
            label="Travel dates"
            value={inquiry.travelDates}
          />
          <DetailRow icon={Users} label="Party size" value={inquiry.partySize} />
          <DetailRow icon={Wallet} label="Budget" value={inquiry.budget} />
        </div>

        {inquiry.details && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
              Details
            </p>
            <p className="text-sm text-foreground/85 whitespace-pre-wrap break-words">
              {inquiry.details}
            </p>
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={onCycle}
            className="bg-primary hover:bg-magenta"
          >
            Mark {STATUS_META[to].label.toLowerCase()}
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<a href={`mailto:${inquiry.email}`} />}
          >
            <Mail className="h-3.5 w-3.5 mr-1" /> Reply by email
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <RotateCcw className="h-3.5 w-3.5 mr-1" /> Close
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
