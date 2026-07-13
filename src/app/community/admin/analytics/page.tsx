"use client";

/**
 * Admin analytics dashboard (community admin · LIGHT Card theme).
 *
 * Full CRM overview built on two data planes:
 *   1. Existing community collections (users, messages, events,
 *      newsletter signups, reservations, agreements, concierge
 *      inquiries) — real data from day one, via the dual-backend hooks
 *      (Supabase primary in production, Firestore behind the flag).
 *   2. The tracked `activity_events` stream (src/lib/activity-tracker.ts)
 *      — page views, DAU/WAU, funnels, RSVP tallies and the live feed.
 *      Empty until the first deploy with tracking; every activity-based
 *      block degrades to a "collecting…" empty state.
 *
 * Charts are recharts (already a dependency). Gated by `viewAdminPanel`
 * (the admin layout gates the whole area; we re-check for direct hits).
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Activity,
  BarChart3,
  CalendarDays,
  ConciergeBell,
  Eye,
  FileSignature,
  Hourglass,
  LogIn,
  Mail,
  MailPlus,
  MessageSquare,
  MousePointerClick,
  ShieldOff,
  Ticket,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/use-roles-store";
import { BackendBadge } from "@/components/admin/backend-badge";
import {
  useAdminMetrics,
  type MonthPoint,
  type StackedDailyMessages,
  type UpcomingEvent,
} from "@/lib/use-admin-metrics";
import {
  useActivityAnalytics,
  type ActivityDayPoint,
  type ActionSlice,
  type TopPage,
} from "@/lib/use-activity-analytics";
import { type ActivityEvent } from "@/lib/activity-tracker";
import { useNewsletterList } from "@/lib/use-newsletter";
import { useAllReservations } from "@/lib/use-all-reservations";
import { useAgreements } from "@/lib/use-agreements";
import { useConciergeInquiries } from "@/lib/use-concierge";
import { useCommunityMembers } from "@/lib/use-community-members";
import { useEvents } from "@/lib/use-events";
import { useMeetups } from "@/lib/use-meetups";
import { useTrips } from "@/lib/use-trips";
import { useChannels } from "@/lib/use-channels-store";

/* ------------------------------------------------------------------ */
/* Brand palette + shared chart bits                                   */
/* ------------------------------------------------------------------ */

const PINK = "#FF0099";
const MAGENTA = "#B51760";
const SERIES_COLORS = [
  PINK,
  "#7C3AED",
  "#0EA5E9",
  "#F59E0B",
  "#10B981",
  "#94A3B8",
];

const TOOLTIP_STYLE: React.CSSProperties = {
  fontSize: 12,
  borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.08)",
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const AXIS_TICK = { fontSize: 10 } as const;

function ChartBox({
  height = "h-52",
  children,
}: {
  height?: string;
  children: React.ReactElement;
}) {
  return (
    <div className={cn("w-full", height)}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle?: string;
}) {
  return (
    <CardHeader className="pb-0">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      {subtitle ? (
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
    </CardHeader>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-foreground/10 px-6 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

/** Empty state for blocks fed by the (new) tracking pipeline. */
const TRACKING_EMPTY =
  "No tracked activity yet — collection starts with the first deploy of the tracker. Check back soon.";

/* ------------------------------------------------------------------ */
/* KPI cards                                                           */
/* ------------------------------------------------------------------ */

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="h-full">
      <CardContent className="flex items-start gap-3 pt-1">
        <span className="rounded-lg bg-primary/10 p-2 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none tabular-nums">
            {value}
          </p>
          <p className="text-xs font-medium text-foreground/80 mt-1">{label}</p>
          {hint ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Charts                                                              */
/* ------------------------------------------------------------------ */

function MemberGrowthChart({ data }: { data: MonthPoint[] }) {
  if (!data.some((d) => d.total > 0)) {
    return <EmptyChart message="No member history yet." />;
  }
  return (
    <ChartBox>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="memberFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={PINK} stopOpacity={0.28} />
            <stop offset="100%" stopColor={MAGENTA} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="joined" name="New joins" fill={MAGENTA} fillOpacity={0.3} radius={[3, 3, 0, 0]} />
        <Area
          type="monotone"
          dataKey="total"
          name="Total members"
          stroke={PINK}
          strokeWidth={2.5}
          fill="url(#memberFill)"
        />
      </ComposedChart>
    </ChartBox>
  );
}

function NewsletterGrowthChart({ data }: { data: MonthPoint[] }) {
  if (!data.some((d) => d.total > 0)) {
    return <EmptyChart message="No newsletter signups yet." />;
  }
  return (
    <ChartBox>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="newsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7C3AED" stopOpacity={0.25} />
            <stop offset="100%" stopColor="#7C3AED" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="joined" name="New signups" fill="#7C3AED" fillOpacity={0.3} radius={[3, 3, 0, 0]} />
        <Area
          type="monotone"
          dataKey="total"
          name="Total subscribers"
          stroke="#7C3AED"
          strokeWidth={2.5}
          fill="url(#newsFill)"
        />
      </ComposedChart>
    </ChartBox>
  );
}

function MessagesStackedChart({ data }: { data: StackedDailyMessages }) {
  const hasData = data.days.some((d) =>
    data.channelNames.some((n) => ((d[n] as number) ?? 0) > 0),
  );
  if (!hasData) {
    return <EmptyChart message="No messages in the last 14 days." />;
  }
  return (
    <ChartBox>
      <BarChart data={data.days} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {data.channelNames.map((name, i) => (
          <Bar
            key={name}
            dataKey={name}
            stackId="msgs"
            fill={SERIES_COLORS[i % SERIES_COLORS.length]}
          />
        ))}
      </BarChart>
    </ChartBox>
  );
}

function PageViewsChart({
  data,
  hasData,
}: {
  data: ActivityDayPoint[];
  hasData: boolean;
}) {
  if (!hasData || !data.some((d) => d.count > 0)) {
    return <EmptyChart message={TRACKING_EMPTY} />;
  }
  return (
    <ChartBox>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis dataKey="label" tick={AXIS_TICK} interval={1} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Area
          type="monotone"
          dataKey="count"
          name="Page views"
          stroke="#0EA5E9"
          strokeWidth={2.5}
          fill="url(#viewsFill)"
        />
      </ComposedChart>
    </ChartBox>
  );
}

function ActionsPieChart({
  data,
  hasData,
}: {
  data: ActionSlice[];
  hasData: boolean;
}) {
  if (!hasData || data.length === 0) {
    return <EmptyChart message={TRACKING_EMPTY} />;
  }
  return (
    <ChartBox>
      <PieChart>
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          innerRadius={42}
          outerRadius={70}
          paddingAngle={2}
          strokeWidth={0}
        >
          {data.map((s, i) => (
            <Cell key={s.type} fill={SERIES_COLORS[i % SERIES_COLORS.length]} />
          ))}
        </Pie>
      </PieChart>
    </ChartBox>
  );
}

function RsvpsChart({
  data,
  hasData,
}: {
  data: Array<{ name: string; count: number }>;
  hasData: boolean;
}) {
  if (!hasData || data.length === 0) {
    return <EmptyChart message={TRACKING_EMPTY} />;
  }
  return (
    <ChartBox>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,0,0,0.06)" />
        <XAxis type="number" tick={AXIS_TICK} allowDecimals={false} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={130}
          tick={AXIS_TICK}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Bar dataKey="count" name="RSVPs" fill={PINK} radius={[0, 3, 3, 0]} />
      </BarChart>
    </ChartBox>
  );
}

/* ------------------------------------------------------------------ */
/* Reservation funnel (real collections + tracked views)               */
/* ------------------------------------------------------------------ */

function FunnelBars({
  stages,
}: {
  stages: Array<{ label: string; value: number; note?: string }>;
}) {
  const max = Math.max(1, ...stages.map((s) => s.value));
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        return (
          <div key={s.label}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="text-xs font-medium">{s.label}</span>
              <span className="text-xs font-semibold tabular-nums">
                {s.value.toLocaleString()}
                {s.note ? (
                  <span className="ml-1 font-normal text-muted-foreground">
                    {s.note}
                  </span>
                ) : null}
              </span>
            </div>
            <div className="h-5 overflow-hidden rounded bg-foreground/5">
              <div
                className="h-full rounded bg-gradient-to-r from-[#FF0099] to-[#B51760]"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  opacity: 1 - i * 0.18,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Top pages table                                                     */
/* ------------------------------------------------------------------ */

function TopPagesTable({
  pages,
  hasData,
}: {
  pages: TopPage[];
  hasData: boolean;
}) {
  if (!hasData || pages.length === 0) {
    return <EmptyChart message={TRACKING_EMPTY} />;
  }
  const max = Math.max(1, ...pages.map((p) => p.count));
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
        <span>Path</span>
        <span>Views (7d)</span>
      </div>
      {pages.map((p) => (
        <div key={p.path} className="relative overflow-hidden rounded-md">
          <div
            className="absolute inset-y-0 left-0 bg-primary/5"
            style={{ width: `${(p.count / max) * 100}%` }}
          />
          <div className="relative flex items-center justify-between gap-3 px-2 py-1.5 text-sm">
            <span className="truncate font-mono text-xs">{p.path}</span>
            <span className="shrink-0 text-xs font-semibold tabular-nums">
              {p.count.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Live activity feed                                                  */
/* ------------------------------------------------------------------ */

const FEED_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  page_view: Eye,
  sign_in: LogIn,
  sign_up: UserPlus,
  trip_reservation: Ticket,
  waitlist_join: Hourglass,
  newsletter_signup: MailPlus,
  concierge_inquiry: ConciergeBell,
  message_sent: MessageSquare,
  event_rsvp: CalendarDays,
  agreement_signed: FileSignature,
};

interface FeedLookups {
  nameById: Map<string, string>;
  tripTitleById: Map<string, string>;
  eventTitleById: Map<string, string>;
  channelNameById: Map<string, string>;
}

function feedLine(e: ActivityEvent, l: FeedLookups): string {
  const name = e.userId
    ? (l.nameById.get(e.userId) ?? "A member")
    : "Anonymous";
  const tripId = typeof e.meta.tripId === "string" ? e.meta.tripId : "";
  const trip = l.tripTitleById.get(tripId) ?? "a trip";
  switch (e.type) {
    case "page_view":
      return `${name} viewed ${e.path || "/"}`;
    case "sign_in":
      return `${name} signed in`;
    case "sign_up":
      return `${name} created an account`;
    case "trip_reservation":
      return `${name} reserved a spot on ${trip}`;
    case "waitlist_join":
      return `${name} joined the waitlist for ${trip}`;
    case "newsletter_signup": {
      const source = typeof e.meta.source === "string" ? e.meta.source : "";
      return `New newsletter signup${source ? ` (${source})` : ""}`;
    }
    case "concierge_inquiry": {
      const dest =
        typeof e.meta.destination === "string" ? e.meta.destination : "";
      return `New concierge inquiry${dest ? ` — ${dest}` : ""}`;
    }
    case "message_sent": {
      const ch =
        typeof e.meta.channelId === "string"
          ? (l.channelNameById.get(e.meta.channelId) ?? e.meta.channelId)
          : "chat";
      return `${name} posted in #${ch}`;
    }
    case "event_rsvp": {
      const targetId =
        typeof e.meta.targetId === "string" ? e.meta.targetId : "";
      const title = l.eventTitleById.get(targetId) ?? "an event";
      const interested = e.meta.status === "interested";
      return interested
        ? `${name} is interested in ${title}`
        : `${name} RSVP'd to ${title}`;
    }
    case "agreement_signed":
      return `${name} signed an agreement`;
    default:
      return `${name} · ${e.type}`;
  }
}

function ActivityFeed({
  events,
  lookups,
  hasData,
}: {
  events: ActivityEvent[];
  lookups: FeedLookups;
  hasData: boolean;
}) {
  if (!hasData || events.length === 0) {
    return <EmptyChart message={TRACKING_EMPTY} />;
  }
  return (
    <ul className="divide-y divide-border max-h-96 overflow-y-auto overscroll-contain">
      {events.map((e) => {
        const Icon = FEED_ICON[e.type] ?? MousePointerClick;
        let ago = "";
        if (e.tsISO) {
          try {
            ago = formatDistanceToNow(new Date(e.tsISO), { addSuffix: true });
          } catch {
            ago = "";
          }
        }
        return (
          <li key={e.id} className="flex items-center gap-3 px-2 py-2">
            <span
              className={cn(
                "rounded-md p-1.5 shrink-0",
                e.type === "page_view"
                  ? "bg-foreground/5 text-muted-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <p className="min-w-0 flex-1 truncate text-sm">
              {feedLine(e, lookups)}
            </p>
            <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
              {ago}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming events (carried over from the previous dashboard)          */
/* ------------------------------------------------------------------ */

const EVENT_TONE: Record<string, string> = {
  trip: "bg-blue-500/10 text-blue-600",
  meetup: "bg-purple-500/10 text-purple-600",
  camp: "bg-emerald-500/10 text-emerald-600",
  social: "bg-pink-500/10 text-pink-600",
  synced: "bg-amber-500/10 text-amber-600",
};

function safeDate(raw: string): string {
  const d = new Date(`${raw.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  return format(d, "EEE, MMM d");
}

function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return <EmptyChart message="No upcoming events scheduled." />;
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li
          key={e.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-foreground/5 px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{e.title}</p>
            <p className="truncate text-xs text-muted-foreground">
              {safeDate(e.date)}
              {e.location ? ` · ${e.location}` : ""}
            </p>
          </div>
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize",
              EVENT_TONE[e.type] ?? "bg-foreground/5 text-foreground/70",
            )}
          >
            {e.type}
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const { hasPermission } = useMe();
  const canView = hasPermission("viewAdminPanel");

  const m = useAdminMetrics();
  const a = useActivityAnalytics();
  const { signups } = useNewsletterList();
  const { reservations } = useAllReservations();
  const { agreements } = useAgreements();
  const { inquiries } = useConciergeInquiries();
  const { members } = useCommunityMembers();
  const { events: calEvents } = useEvents();
  const { meetups } = useMeetups();
  const { trips } = useTrips();
  const channels = useChannels((s) => s.channels);

  /* ---- lookups for the feed + RSVP chart ------------------------- */
  const lookups = useMemo<FeedLookups>(() => {
    const nameById = new Map<string, string>();
    for (const mem of members) nameById.set(mem.id, mem.name);
    const tripTitleById = new Map<string, string>();
    for (const t of trips) tripTitleById.set(t.id, t.title);
    const eventTitleById = new Map<string, string>();
    for (const e of calEvents) eventTitleById.set(e.id, e.title);
    for (const mu of meetups) eventTitleById.set(mu.id, mu.title);
    const channelNameById = new Map<string, string>();
    for (const c of channels) channelNameById.set(c.id, c.name);
    return { nameById, tripTitleById, eventTitleById, channelNameById };
  }, [members, trips, calEvents, meetups, channels]);

  /* ---- newsletter growth (12 months, cumulative) ------------------ */
  const newsletterGrowth = useMemo<MonthPoint[]>(() => {
    const now = new Date();
    const byMonth = new Map<string, number>();
    for (const s of signups) {
      if (!s.createdAt) continue;
      const d = new Date(s.createdAt);
      if (Number.isNaN(d.getTime())) continue;
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      byMonth.set(k, (byMonth.get(k) ?? 0) + 1);
    }
    const keys: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    let total = 0;
    for (const [k, n] of byMonth) if (k < keys[0]) total += n;
    const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return keys.map((k) => {
      const joined = byMonth.get(k) ?? 0;
      total += joined;
      const mi = Math.max(0, Math.min(11, Number(k.slice(5)) - 1));
      return { key: k, label: `${MONTHS[mi]} ’${k.slice(2, 4)}`, joined, total };
    });
  }, [signups]);

  /* ---- funnel + KPI derivations ----------------------------------- */
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status !== "cancelled"),
    [reservations],
  );
  const waitlistCount = useMemo(
    () => reservations.filter((r) => r.status === "waitlist").length,
    [reservations],
  );
  const signedAgreements = useMemo(
    () =>
      agreements.filter(
        (ag) => ag.status === "prospect_signed" || ag.status === "completed",
      ).length,
    [agreements],
  );
  const openLeads = useMemo(
    () => inquiries.filter((i) => i.status !== "closed").length,
    [inquiries],
  );

  const rsvpChartData = useMemo(
    () =>
      a.rsvpsByTarget.slice(0, 8).map((r) => {
        const raw =
          lookups.eventTitleById.get(r.targetId) ??
          (r.targetType === "meetup" ? "A meetup" : "An event");
        return {
          name: raw.length > 22 ? `${raw.slice(0, 21)}…` : raw,
          count: r.count,
        };
      }),
    [a.rsvpsByTarget, lookups.eventTitleById],
  );

  if (!canView) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center">
          <ShieldOff className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">No access</h2>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have permission to view analytics.
          </p>
        </div>
      </div>
    );
  }

  const dash = (v: string | number) => (m.loading ? "—" : v);

  return (
    <div className="h-full overflow-auto p-4 lg:p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-2xl font-bold">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Members, traffic, engagement, and the revenue funnel — live
              from your backend.
            </p>
          </div>
          <BackendBadge className="mt-1" />
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total members"
            value={dash(m.totalMembers.toLocaleString())}
            hint={m.loading ? undefined : `+${m.newMembers30d} in 30 days`}
          />
          <StatCard
            icon={UserPlus}
            label="New members (7d)"
            value={dash(m.newMembers7d.toLocaleString())}
            hint={m.loading ? undefined : `${m.newMembers30d} in 30 days`}
          />
          <StatCard
            icon={Activity}
            label="Active today"
            value={a.hasData ? a.dau.toLocaleString() : "—"}
            hint={
              a.hasData ? `${a.wau.toLocaleString()} this week` : "tracked"
            }
          />
          <StatCard
            icon={Eye}
            label="Page views (7d)"
            value={a.hasData ? a.pageViews7d.toLocaleString() : "—"}
            hint={a.hasData ? undefined : "tracked"}
          />
          <StatCard
            icon={MessageSquare}
            label="Messages (24h)"
            value={dash(m.messages24h.toLocaleString())}
            hint={m.loading ? undefined : `${m.messages7d} in 7 days`}
          />
          <StatCard
            icon={Mail}
            label="Newsletter subscribers"
            value={signups.length.toLocaleString()}
          />
          <StatCard
            icon={ConciergeBell}
            label="Open concierge leads"
            value={openLeads.toLocaleString()}
            hint={`${inquiries.length} total inquiries`}
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming events"
            value={dash(m.upcomingCount.toLocaleString())}
          />
        </div>

        {/* Growth charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader
              icon={TrendingUp}
              title="Member growth"
              subtitle="Cumulative members + monthly joins, last 12 months"
            />
            <CardContent>
              {m.loading ? (
                <EmptyChart message="Loading…" />
              ) : (
                <MemberGrowthChart data={m.memberGrowth} />
              )}
            </CardContent>
          </Card>
          <Card>
            <SectionHeader
              icon={MailPlus}
              title="Newsletter growth"
              subtitle="Cumulative subscribers + monthly signups, last 12 months"
            />
            <CardContent>
              <NewsletterGrowthChart data={newsletterGrowth} />
            </CardContent>
          </Card>
        </div>

        {/* Engagement charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader
              icon={MessageSquare}
              title="Messages per day"
              subtitle="Last 14 days, stacked by channel"
            />
            <CardContent>
              {m.loading ? (
                <EmptyChart message="Loading…" />
              ) : (
                <MessagesStackedChart data={m.stackedDailyMessages} />
              )}
            </CardContent>
          </Card>
          <Card>
            <SectionHeader
              icon={Eye}
              title="Page views per day"
              subtitle="Last 14 days, from the activity tracker"
            />
            <CardContent>
              <PageViewsChart data={a.pageViewsPerDay} hasData={a.hasData} />
            </CardContent>
          </Card>
        </div>

        {/* Funnel + top pages */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader
              icon={Ticket}
              title="Reservation funnel"
              subtitle="Trip traffic → reservations → signed agreements"
            />
            <CardContent>
              <FunnelBars
                stages={[
                  {
                    label: "Trip page views (30d, tracked)",
                    value: a.tripViews30d,
                    note: a.hasData ? undefined : "collecting…",
                  },
                  {
                    label: "Reservations (all time)",
                    value: activeReservations.length,
                    note:
                      waitlistCount > 0
                        ? `incl. ${waitlistCount} waitlisted`
                        : undefined,
                  },
                  {
                    label: "Agreements signed (all time)",
                    value: signedAgreements,
                  },
                ]}
              />
              <p className="mt-3 text-[11px] text-muted-foreground">
                Reservations and agreements come from your live pipeline;
                trip views start counting from the tracker&apos;s first
                deploy.
              </p>
            </CardContent>
          </Card>
          <Card>
            <SectionHeader
              icon={MousePointerClick}
              title="Top pages"
              subtitle="Most-viewed paths, last 7 days"
            />
            <CardContent>
              <TopPagesTable pages={a.topPages} hasData={a.hasData} />
            </CardContent>
          </Card>
        </div>

        {/* RSVPs + action mix */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader
              icon={CalendarDays}
              title="RSVPs per event"
              subtitle="Tracked RSVP taps by event or meetup"
            />
            <CardContent>
              <RsvpsChart data={rsvpChartData} hasData={a.hasData} />
            </CardContent>
          </Card>
          <Card>
            <SectionHeader
              icon={Activity}
              title="Action mix"
              subtitle="Tracked member actions, last 7 days"
            />
            <CardContent>
              <ActionsPieChart
                data={a.actionBreakdown7d}
                hasData={a.hasData}
              />
            </CardContent>
          </Card>
        </div>

        {/* Live feed + upcoming */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
          <Card>
            <SectionHeader
              icon={Activity}
              title="Live activity"
              subtitle="Latest tracked events across the site"
            />
            <CardContent>
              <ActivityFeed
                events={a.events.slice(0, 30)}
                lookups={lookups}
                hasData={a.hasData}
              />
            </CardContent>
          </Card>
          <Card>
            <SectionHeader
              icon={CalendarDays}
              title="Upcoming events"
              subtitle={
                m.upcomingCount > 0
                  ? `${m.upcomingCount} scheduled`
                  : "Nothing scheduled yet"
              }
            />
            <CardContent>
              {m.loading ? (
                <EmptyChart message="Loading…" />
              ) : (
                <UpcomingEvents events={m.upcomingEvents} />
              )}
              <div className="mt-3 text-right">
                <Link
                  href="/community/admin/calendar"
                  className="text-xs font-medium text-primary hover:underline"
                >
                  Manage calendar →
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
