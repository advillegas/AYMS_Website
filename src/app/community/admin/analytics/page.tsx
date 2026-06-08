"use client";

/**
 * Admin analytics dashboard (community admin · LIGHT Card theme).
 *
 * Read-only at-a-glance metrics aggregated client-side from the live
 * Firestore snapshots the rest of the app already reads (no new deps,
 * no backend job). Charts are hand-rolled inline SVG — a line for
 * member growth, bars for daily message volume + per-channel activity.
 *
 * Gated by `viewAdminPanel` (the admin layout already gates the whole
 * /community/admin area, but we re-check so a direct hit still degrades
 * gracefully).
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  BarChart3,
  ShieldOff,
  Users,
  UserPlus,
  MessageSquare,
  CalendarDays,
  Hash,
  Wifi,
  WifiOff,
  TrendingUp,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useMe } from "@/lib/use-roles-store";
import {
  useAdminMetrics,
  type MonthPoint,
  type DayPoint,
  type ChannelActivity,
  type UpcomingEvent,
} from "@/lib/use-admin-metrics";

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
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
          <p className="text-xs font-medium text-foreground/80 mt-1">
            {label}
          </p>
          {hint ? (
            <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
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
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-foreground/10 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Member-growth line chart (cumulative total + per-month joins)       */
/* ------------------------------------------------------------------ */

function GrowthChart({ data }: { data: MonthPoint[] }) {
  const hasData = data.some((d) => d.total > 0);
  const geom = useMemo(() => {
    const W = 640;
    const H = 200;
    const padX = 8;
    const padTop = 12;
    const padBottom = 28;
    const innerW = W - padX * 2;
    const innerH = H - padTop - padBottom;
    const maxTotal = Math.max(1, ...data.map((d) => d.total));
    const n = data.length;
    const stepX = n > 1 ? innerW / (n - 1) : 0;
    const x = (i: number) => padX + i * stepX;
    const y = (v: number) => padTop + innerH - (v / maxTotal) * innerH;

    const linePts = data.map((d, i) => `${x(i)},${y(d.total)}`).join(" ");
    const areaPts =
      n > 0
        ? `${x(0)},${padTop + innerH} ${linePts} ${x(n - 1)},${padTop + innerH}`
        : "";
    return { W, H, padTop, innerH, x, y, linePts, areaPts, maxTotal };
  }, [data]);

  if (!hasData) {
    return <EmptyChart message="No member history yet." />;
  }

  return (
    <svg
      viewBox={`0 0 ${geom.W} ${geom.H}`}
      className="w-full"
      role="img"
      aria-label="Cumulative member growth over the last 12 months"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF0099" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#B51760" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line
        x1="0"
        y1={geom.padTop + geom.innerH}
        x2={geom.W}
        y2={geom.padTop + geom.innerH}
        className="stroke-foreground/10"
        strokeWidth="1"
      />
      {geom.areaPts ? (
        <polygon points={geom.areaPts} fill="url(#growthFill)" />
      ) : null}
      <polyline
        points={geom.linePts}
        fill="none"
        stroke="#FF0099"
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d, i) => (
        <g key={d.key}>
          <circle cx={geom.x(i)} cy={geom.y(d.total)} r="2.5" fill="#B51760">
            <title>
              {d.label}: {d.total} members
              {d.joined ? ` (+${d.joined})` : ""}
            </title>
          </circle>
          {i % 2 === 0 ? (
            <text
              x={geom.x(i)}
              y={geom.H - 8}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: 10 }}
            >
              {d.label}
            </text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Daily message-volume bar chart (last 14 days)                       */
/* ------------------------------------------------------------------ */

function DailyVolumeChart({ data }: { data: DayPoint[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const hasData = data.some((d) => d.count > 0);
  if (!hasData) {
    return <EmptyChart message="No messages in the last 14 days." />;
  }
  return (
    <div className="flex h-40 items-end gap-1.5">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        const showLabel = i % 2 === 0;
        return (
          <div
            key={d.key}
            className="group/bar flex flex-1 flex-col items-center justify-end gap-1"
            title={`${d.label}: ${d.count} message${d.count === 1 ? "" : "s"}`}
          >
            <span className="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover/bar:opacity-100">
              {d.count}
            </span>
            <div
              className="w-full rounded-t bg-gradient-to-t from-[#B51760] to-[#FF0099] transition-all"
              style={{ height: `${Math.max(2, pct)}%` }}
            />
            <span className="text-[9px] text-muted-foreground">
              {showLabel ? d.label.split(" ")[1] : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Channel-activity horizontal bars (last 30 days)                     */
/* ------------------------------------------------------------------ */

function ChannelActivityChart({ data }: { data: ChannelActivity[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  if (data.length === 0) {
    return <EmptyChart message="No channel activity in the last 30 days." />;
  }
  return (
    <div className="space-y-2.5">
      {data.map((c) => {
        const pct = (c.count / max) * 100;
        return (
          <div key={c.channelId} className="flex items-center gap-3">
            <div className="flex w-32 shrink-0 items-center gap-1 truncate text-xs font-medium">
              <Hash className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="truncate">{c.name}</span>
            </div>
            <div className="relative h-5 flex-1 overflow-hidden rounded bg-foreground/5">
              <div
                className="absolute inset-y-0 left-0 rounded bg-gradient-to-r from-[#FF0099] to-[#B51760]"
                style={{ width: `${Math.max(3, pct)}%` }}
              />
            </div>
            <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums">
              {c.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Upcoming events list                                                */
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

  return (
    <div className="h-full overflow-auto p-4 lg:p-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-2xl font-bold">
              <BarChart3 className="h-6 w-6 text-primary" />
              Analytics
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Member growth, channel activity, and what&apos;s coming up.
            </p>
          </div>
          <span
            className={cn(
              "mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium",
              m.isLive
                ? "bg-emerald-500/10 text-emerald-600"
                : "bg-foreground/5 text-muted-foreground",
            )}
            title={
              m.isLive
                ? "Live data from Firestore"
                : "Firestore not configured — showing empty states"
            }
          >
            {m.isLive ? (
              <Wifi className="h-3 w-3" />
            ) : (
              <WifiOff className="h-3 w-3" />
            )}
            {m.isLive ? "Live" : "Offline"}
          </span>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon={Users}
            label="Total members"
            value={m.loading ? "—" : m.totalMembers.toLocaleString()}
          />
          <StatCard
            icon={UserPlus}
            label="New this month"
            value={m.loading ? "—" : m.newThisMonth.toLocaleString()}
            hint={format(new Date(), "MMMM")}
          />
          <StatCard
            icon={MessageSquare}
            label="Messages (30d)"
            value={m.loading ? "—" : m.messages30d.toLocaleString()}
          />
          <StatCard
            icon={CalendarDays}
            label="Upcoming events"
            value={m.loading ? "—" : m.upcomingCount.toLocaleString()}
          />
        </div>

        {/* Member growth */}
        <Card className="mt-4">
          <SectionHeader
            icon={TrendingUp}
            title="Member growth"
            subtitle="Cumulative members over the last 12 months"
          />
          <CardContent>
            {m.loading ? (
              <EmptyChart message="Loading…" />
            ) : (
              <GrowthChart data={m.memberGrowth} />
            )}
          </CardContent>
        </Card>

        {/* Daily volume + channel activity */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Card>
            <SectionHeader
              icon={MessageSquare}
              title="Message volume"
              subtitle="Messages per day, last 14 days"
            />
            <CardContent>
              {m.loading ? (
                <EmptyChart message="Loading…" />
              ) : (
                <DailyVolumeChart data={m.dailyMessages} />
              )}
            </CardContent>
          </Card>

          <Card>
            <SectionHeader
              icon={Hash}
              title="Channel activity"
              subtitle="Most active channels, last 30 days"
            />
            <CardContent>
              {m.loading ? (
                <EmptyChart message="Loading…" />
              ) : (
                <ChannelActivityChart data={m.channelActivity} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming events */}
        <Card className="mt-4">
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
  );
}
