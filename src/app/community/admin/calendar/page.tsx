"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Plus,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Loader2,
  Pencil,
  Globe,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useHasPermission } from "@/lib/use-roles-store";
import { getAuthInstance } from "@/lib/firebase";
import { getSupabase, useSupabaseBackend } from "@/lib/supabase";
import {
  useEvents,
  useSyncConfigs,
  type FirestoreEvent,
  type CalendarSyncConfig,
} from "@/lib/use-events";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { formatDistanceToNowStrict } from "date-fns";

/**
 * Google Calendar URLs come in many flavors. The admin might paste:
 *   - The embed URL: .../calendar/embed?src=CALENDAR_ID&...
 *   - The public HTML page: .../calendar/u/0?cid=CALENDAR_ID
 *   - The actual iCal URL: .../calendar/ical/CALENDAR_ID/public/basic.ics
 *
 * We normalize all of them to the iCal URL so the sync route gets
 * parseable iCal text instead of HTML.
 */
function normalizeGoogleCalendarUrl(raw: string): string {
  const trimmed = raw.trim();

  // Already an iCal URL? Keep it.
  if (trimmed.includes("/calendar/ical/") && trimmed.endsWith(".ics")) {
    return trimmed;
  }

  // Extract the calendar ID from embed or share URLs.
  // The ID is in the "src" query param (embed) or "cid" param (share).
  try {
    const url = new URL(trimmed);
    const calId =
      url.searchParams.get("src") ?? url.searchParams.get("cid");
    if (calId) {
      return `https://calendar.google.com/calendar/ical/${encodeURIComponent(calId)}/public/basic.ics`;
    }
  } catch {
    // Not a valid URL — return as-is and let the sync route handle the error.
  }

  return trimmed;
}

const EVENT_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "meetup", label: "Meetup" },
  { value: "camp", label: "Camp" },
  { value: "social", label: "Social" },
] as const;

export default function AdminCalendarPage() {
  const user = useAuth((s) => s.user);
  const canManageCalendar = useHasPermission("manageCalendar");
  const confirm = useConfirm();
  const {
    events,
    loading: eventsLoading,
    addEvent,
    updateEvent,
    deleteEvent,
  } = useEvents();
  const {
    configs,
    loading: configsLoading,
    addConfig,
    updateConfig,
    deleteConfig,
  } = useSyncConfigs();

  const [addFeedOpen, setAddFeedOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FirestoreEvent | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const manualEvents = useMemo(
    () => events.filter((e) => !e.sourceCalendarId),
    [events],
  );
  const syncedEvents = useMemo(
    () => events.filter((e) => e.sourceCalendarId),
    [events],
  );

  async function handleSyncNow(configId: string) {
    setSyncing(configId);
    try {
      const headers: Record<string, string> = {};
      try {
        if (useSupabaseBackend) {
          const accessToken = (await getSupabase()?.auth.getSession())?.data
            .session?.access_token;
          if (accessToken) headers.authorization = `Bearer ${accessToken}`;
        } else {
          const idToken = await getAuthInstance()?.currentUser?.getIdToken();
          if (idToken) headers.authorization = `Bearer ${idToken}`;
        }
      } catch {
        /* no session — proxy will reject if auth is required */
      }
      const res = await fetch("/api/calendar/sync-now", {
        method: "POST",
        headers,
      });
      if (!res.ok) {
        // Surface the server's own message (e.g. "CRON_SECRET unset",
        // "SUPABASE_SERVICE_ROLE_KEY not set", "Admin access required")
        // instead of an opaque status code.
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ? body.error : `HTTP ${res.status}`);
      }
      const data = await res.json();
      const result = data.results?.find(
        (r: { configId: string }) => r.configId === configId,
      );
      if (result?.error) {
        toast.error(`Sync error: ${result.error}`);
      } else {
        toast.success(
          `Synced ${result?.upserted ?? 0} events, removed ${result?.deleted ?? 0}`,
        );
      }
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setSyncing(null);
    }
  }

  async function handleDeleteFeed(config: CalendarSyncConfig) {
    const confirmed = await confirm({
      title: `Delete "${config.name}"?`,
      description:
        "All synced events from this feed will also be removed. This can't be undone.",
      confirmText: "Delete feed",
      destructive: true,
    });
    if (!confirmed) return;
    // Delete all events from this source
    const sourceEvents = events.filter(
      (e) => e.sourceCalendarId === config.id,
    );
    for (const e of sourceEvents) {
      await deleteEvent(e.id);
    }
    const ok = await deleteConfig(config.id);
    if (ok) toast.success(`Deleted "${config.name}" and its events.`);
    else toast.error("Couldn't delete the feed.");
  }

  async function handleDeleteManualEvent(ev: FirestoreEvent) {
    const confirmed = await confirm({
      title: `Delete "${ev.title}"?`,
      description: "This event will be permanently removed.",
      confirmText: "Delete event",
      destructive: true,
    });
    if (!confirmed) return;
    const ok = await deleteEvent(ev.id);
    if (ok) toast.success("Event deleted.");
    else toast.error("Couldn't delete the event.");
  }

  // Calendar management (adding feeds, creating/editing events) is gated
  // by the `manageCalendar` role permission — not just admin-panel access.
  // Admins have it by default; it can be granted to any role from
  // Admin → Roles & permissions.
  if (!canManageCalendar) {
    return (
      <div className="p-4 lg:p-6 overflow-auto h-full">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Calendar className="h-6 w-6 text-primary" />
            Calendar Management
          </h1>
          <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-6 text-center">
            <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
              You don&apos;t have permission to manage the calendar.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Ask an admin to grant your role the{" "}
              <span className="font-semibold">Manage calendar</span>{" "}
              permission (Admin → Roles &amp; permissions).
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Calendar className="h-6 w-6 text-primary" />
            Calendar Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sync Google Calendar feeds, create manual events, and manage
            the community calendar.
          </p>
        </div>

        {/* ---- Sync Feeds ---- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary" />
                Synced Feeds
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Paste a public Google Calendar iCal URL and events sync
                automatically every 15 minutes.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setAddFeedOpen(true)}
              className="bg-primary hover:bg-magenta"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Feed
            </Button>
          </CardHeader>
          <CardContent>
            {configsLoading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading...
              </p>
            ) : configs.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No feeds connected yet. Click &quot;Add Feed&quot; to sync a
                Google Calendar.
              </p>
            ) : (
              <div className="space-y-2">
                {configs.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-3 rounded-lg border border-rosa/20 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {c.icalUrl}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-[10px]">
                        {c.lastSyncError ? (
                          <span className="inline-flex items-center gap-1 text-destructive">
                            <XCircle className="h-3 w-3" />
                            {c.lastSyncError}
                          </span>
                        ) : c.lastSyncAt ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Synced{" "}
                            {formatDistanceToNowStrict(new Date(c.lastSyncAt), {
                              addSuffix: true,
                            })}
                            {c.lastSyncCount != null &&
                              ` · ${c.lastSyncCount} events`}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Never synced
                          </span>
                        )}
                        <Badge
                          variant={c.enabled ? "default" : "secondary"}
                          className="text-[9px] h-4"
                        >
                          {c.enabled ? "Active" : "Paused"}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleSyncNow(c.id)}
                        disabled={syncing === c.id}
                        className="h-7 px-2 text-xs"
                      >
                        {syncing === c.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          updateConfig(c.id, { enabled: !c.enabled })
                        }
                        className="h-7 px-2 text-xs"
                      >
                        {c.enabled ? "Pause" : "Resume"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFeed(c)}
                        className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- Manual Events ---- */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Pencil className="h-4 w-4 text-primary" />
                Manual Events
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Create events that aren&apos;t tied to an external calendar.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingEvent(null);
                setAddEventOpen(true);
              }}
              className="bg-primary hover:bg-magenta"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Event
            </Button>
          </CardHeader>
          <CardContent>
            {eventsLoading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading...
              </p>
            ) : manualEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No manual events. Click &quot;Create Event&quot; to add one.
              </p>
            ) : (
              <div className="space-y-1">
                {manualEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-primary/5"
                  >
                    <span className="text-xs text-muted-foreground w-24 shrink-0 tabular-nums">
                      {ev.date}
                    </span>
                    <span className="text-sm truncate flex-1">
                      {ev.title}
                    </span>
                    {ev.published === false && (
                      <Badge variant="outline" className="text-[9px] h-4">
                        Draft
                      </Badge>
                    )}
                    <Badge variant="secondary" className="text-[9px] h-4">
                      {ev.type}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2 text-xs"
                      onClick={async () => {
                        const next = ev.published === false;
                        const ok = await updateEvent(ev.id, {
                          published: next,
                        });
                        if (ok)
                          toast.success(
                            next ? "Event published." : "Moved to draft.",
                          );
                        else toast.error("Couldn't update visibility.");
                      }}
                    >
                      {ev.published === false ? "Publish" : "Unpublish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5"
                      onClick={() => {
                        setEditingEvent(ev);
                        setAddEventOpen(true);
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-1.5 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteManualEvent(ev)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- All Events Summary ---- */}
        <Card>
          <CardHeader>
            <h2 className="text-base font-semibold">
              All Events ({events.length})
            </h2>
            <p className="text-xs text-muted-foreground">
              {manualEvents.length} manual · {syncedEvents.length} synced
            </p>
          </CardHeader>
          <CardContent>
            <div className="max-h-80 overflow-y-auto space-y-1">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 text-xs px-2 py-1 rounded hover:bg-primary/5"
                >
                  <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                    {ev.date}
                  </span>
                  <span className="truncate flex-1">{ev.title}</span>
                  {ev.published === false && (
                    <Badge variant="outline" className="text-[8px] h-4">
                      Draft
                    </Badge>
                  )}
                  <Badge
                    variant={ev.sourceCalendarId ? "outline" : "secondary"}
                    className="text-[8px] h-4"
                  >
                    {ev.sourceCalendarId ? "Synced" : "Manual"}
                  </Badge>
                  <Badge variant="secondary" className="text-[8px] h-4">
                    {ev.type}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <AddFeedDialog
        open={addFeedOpen}
        onOpenChange={setAddFeedOpen}
        onSave={async (name, url, interval) => {
          if (!user) return;
          const icalUrl = normalizeGoogleCalendarUrl(url);
          const id = await addConfig({
            name,
            icalUrl,
            syncIntervalMinutes: interval,
            enabled: true,
            createdBy: user.id,
          });
          if (id) {
            toast.success(
              icalUrl !== url.trim()
                ? `Added "${name}". Auto-converted to iCal URL. Click Sync Now to fetch events.`
                : `Added "${name}". Click Sync Now to fetch events.`,
            );
            setAddFeedOpen(false);
          } else {
            toast.error(
              "Couldn't add the feed — the database rejected the write. " +
                "Make sure your account has the admin role (not just admin-panel access), then try again.",
            );
          }
        }}
      />
      <EventDialog
        open={addEventOpen}
        onOpenChange={setAddEventOpen}
        event={editingEvent}
        onSave={async (data) => {
          if (editingEvent) {
            const ok = await updateEvent(editingEvent.id, data);
            if (ok) {
              toast.success("Event updated.");
              setAddEventOpen(false);
            } else {
              toast.error("Couldn't update the event.");
            }
          } else {
            const id = await addEvent({
              title: data.title ?? "",
              description: data.description ?? "",
              date: data.date ?? "",
              endDate: data.endDate,
              startTime: data.startTime,
              endTime: data.endTime,
              type: data.type ?? "social",
              location: data.location ?? "",
              capacity: data.capacity,
              published: data.published ?? true,
              createdBy: user?.id,
            });
            if (id) {
              toast.success("Event created.");
              setAddEventOpen(false);
            } else {
              toast.error("Couldn't create the event.");
            }
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add Feed Dialog                                                     */
/* ------------------------------------------------------------------ */

function AddFeedDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (name: string, url: string, interval: number) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState(15);
  const [busy, setBusy] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setName("");
          setUrl("");
          setInterval(15);
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Calendar Feed</DialogTitle>
          <DialogDescription>
            Paste a public Google Calendar iCal URL. Find it in Google Calendar
            Settings &gt; your calendar &gt; &quot;Secret address in iCal
            format&quot;.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="feed-name">Feed name</Label>
            <Input
              id="feed-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. AYMS Main Calendar"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="feed-url">iCal URL</Label>
            <Input
              id="feed-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://calendar.google.com/calendar/ical/..."
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="feed-interval">Sync every (minutes)</Label>
            <select
              id="feed-interval"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value={15}>15 min</option>
              <option value={30}>30 min</option>
              <option value={60}>1 hour</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!name.trim() || !url.trim()) {
                toast.error("Name and URL are required.");
                return;
              }
              setBusy(true);
              try {
                await onSave(name.trim(), url.trim(), interval);
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            Add Feed
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Event Dialog (create + edit)                                         */
/* ------------------------------------------------------------------ */

function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: FirestoreEvent | null;
  onSave: (data: Partial<FirestoreEvent>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState<string>("social");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);

  const isEdit = !!event;

  // Initialize the form whenever the dialog opens or the target event
  // changes. Keying on event?.id (not a live field compare) means typing
  // in any field — including the title — is never clobbered mid-edit,
  // and start/end times are populated too.
  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setDate(event?.date ?? "");
    setEndDate(event?.endDate ?? "");
    setStartTime(event?.startTime ?? "");
    setEndTime(event?.endTime ?? "");
    setType(event?.type ?? "social");
    setLocation(event?.location ?? "");
    setCapacity(
      typeof event?.capacity === "number" && event.capacity > 0
        ? String(event.capacity)
        : "",
    );
    setPublished(event?.published !== false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, event?.id]);

  function reset() {
    setTitle("");
    setDescription("");
    setDate("");
    setEndDate("");
    setStartTime("");
    setEndTime("");
    setType("social");
    setLocation("");
    setCapacity("");
    setPublished(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Event" : "Create Event"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the event details."
              : "Add a new community event to the calendar."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Coffee & Cuties"
              autoFocus
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this event about?"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>End date (optional)</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Start time (optional)</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>End time (optional)</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Café, LA"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="event-published">Visibility</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={published ? "default" : "outline"}
                onClick={() => setPublished((p) => !p)}
                className={
                  published ? "bg-primary hover:bg-magenta" : undefined
                }
              >
                {published ? (
                  <Globe className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <Pencil className="h-3.5 w-3.5 mr-1" />
                )}
                {published ? "Published" : "Draft"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Drafts are hidden from the public site.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Capacity (optional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Max attendees — blank for unlimited"
              className="max-w-[220px]"
            />
            <p className="text-[11px] text-muted-foreground">
              When set, RSVPs show &quot;X going · N spots left&quot; and
              &quot;Going&quot; locks once it&apos;s full.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              if (!title.trim() || !date) {
                toast.error("Title and date are required.");
                return;
              }
              const capNum = capacity.trim() ? Number(capacity) : undefined;
              if (
                capNum !== undefined &&
                (Number.isNaN(capNum) || capNum < 0)
              ) {
                toast.error("Capacity must be a positive number.");
                return;
              }
              setBusy(true);
              try {
                await onSave({
                  title: title.trim(),
                  description: description.trim(),
                  date,
                  endDate: endDate || undefined,
                  startTime: startTime || undefined,
                  endTime: endTime || undefined,
                  type: type as FirestoreEvent["type"],
                  location: location.trim(),
                  capacity: capNum,
                  published,
                });
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {isEdit ? "Save Changes" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
