"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  RefreshCw,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { getAuthInstance } from "@/lib/firebase";
import { getSupabase, useSupabaseBackend } from "@/lib/supabase";
import {
  useEvents,
  useSyncConfigs,
  type FirestoreEvent,
  type CalendarSyncConfig,
} from "@/lib/use-events";
import { useMeetups, type Meetup } from "@/lib/use-meetups";
import { geocodeLocation } from "@/lib/geo";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";

interface EventDraft {
  title: string;
  description: string;
  date: string;
  endDate: string;
  startTime: string;
  endTime: string;
  type: string;
  location: string;
  link: string;
  linkLabel: string;
  capacity: string;
  published: boolean;
}

const EVENT_TYPES = [
  { value: "trip", label: "Trip" },
  { value: "meetup", label: "Meetup" },
  { value: "camp", label: "Camp" },
  { value: "social", label: "Social" },
] as const;

const actionBtn =
  "rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white";

/** `undefined` published counts as published (legacy seeds). */
function isPublished(e: FirestoreEvent): boolean {
  return e.published !== false;
}

/** Map a member meetup into the dialog's event shape for editing. */
function meetupToDialogEvent(m: Meetup): FirestoreEvent {
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    date: m.date,
    startTime: m.startTime,
    type: "meetup",
    location: m.location,
    capacity: m.capacity,
    link: m.link,
    linkLabel: m.linkLabel,
    lat: m.lat ?? undefined,
    lng: m.lng ?? undefined,
    hostId: m.hostId,
  };
}

/**
 * Embeddable Events manager for the unified /admin dashboard — the editor
 * the admin lands in from "/events → Edit this page". EVERY event that can
 * appear on /events is manageable here:
 *   • manual events — create / edit / publish / delete
 *   • feed-synced events — edit (detaches from the feed) / delete; both
 *     tombstone the feed UID so the 15-minute sync can't re-create them
 *   • connected calendar feeds — pause / resume / sync now / delete
 *   • member meetups — remove (moderation)
 * All business logic lives in the shared `useEvents` hooks.
 */
export function EventsPanel() {
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useEvents();
  const { configs, loading: configsLoading, updateConfig, deleteConfig } =
    useSyncConfigs();
  const { meetups, loading: meetupsLoading, updateMeetup, deleteMeetup } =
    useMeetups();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FirestoreEvent | null>(null);
  const [editingMeetup, setEditingMeetup] = useState<Meetup | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  const manualEvents = useMemo(
    () => events.filter((e) => !e.sourceCalendarId),
    [events],
  );
  const syncedEvents = useMemo(
    () => events.filter((e) => e.sourceCalendarId),
    [events],
  );
  const feedNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of configs) m.set(c.id, c.name);
    return m;
  }, [configs]);

  async function handleTogglePublished(ev: FirestoreEvent) {
    const next = !isPublished(ev);
    const ok = await updateEvent(ev.id, { published: next });
    if (ok) toast.success(next ? "Event published." : "Moved to draft.");
    else toast.error("Couldn't update visibility.");
  }

  async function handleDelete(ev: FirestoreEvent) {
    const synced = Boolean(ev.sourceCalendarId);
    const ok = await confirm({
      title: `Delete "${ev.title}"?`,
      description: synced
        ? "This event will be permanently removed, and the calendar feed is blocked from re-adding it."
        : "This event will be permanently removed.",
      confirmText: "Delete event",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteEvent(ev.id);
    if (done) toast.success("Event deleted — it won't come back.");
    else toast.error("Couldn't delete the event.");
  }

  async function handleDeleteMeetup(id: string, title: string) {
    const ok = await confirm({
      title: `Remove "${title}"?`,
      description:
        "This member-hosted meetup will be removed from the calendar and /events for everyone.",
      confirmText: "Remove meetup",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteMeetup(id);
    if (done) toast.success("Meetup removed.");
    else toast.error("Couldn't remove the meetup.");
  }

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
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ? body.error : `HTTP ${res.status}`);
      }
      const data = await res.json();
      const result = data.results?.find(
        (r: { configId: string }) => r.configId === configId,
      );
      if (result?.error) toast.error(`Sync error: ${result.error}`);
      else
        toast.success(
          `Synced ${result?.upserted ?? 0} events, removed ${result?.deleted ?? 0}.`,
        );
    } catch (err) {
      toast.error(
        `Sync failed: ${err instanceof Error ? err.message : "Unknown"}`,
      );
    } finally {
      setSyncing(null);
    }
  }

  async function handleDeleteFeed(config: CalendarSyncConfig) {
    const ok = await confirm({
      title: `Disconnect "${config.name}"?`,
      description:
        "The feed and every event it synced will be removed. This can't be undone.",
      confirmText: "Disconnect feed",
      destructive: true,
    });
    if (!ok) return;
    const sourceEvents = events.filter(
      (e) => e.sourceCalendarId === config.id,
    );
    for (const e of sourceEvents) {
      await deleteEvent(e.id);
    }
    const done = await deleteConfig(config.id);
    if (done) toast.success(`Disconnected "${config.name}" and removed its events.`);
    else toast.error("Couldn't disconnect the feed.");
  }

  async function handleSave(data: Partial<FirestoreEvent>) {
    if (editingMeetup) {
      // Member meetups live in their own table — apply only the fields a
      // meetup has (the dialog hides the rest in meetup mode).
      const ok = await updateMeetup(editingMeetup.id, {
        title: data.title,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        location: data.location,
        capacity: data.capacity,
        link: data.link,
        linkLabel: data.linkLabel,
      });
      if (ok) {
        toast.success("Meetup updated.");
        setDialogOpen(false);
      } else {
        toast.error("Couldn't update the meetup.");
      }
    } else if (editingEvent) {
      const ok = await updateEvent(editingEvent.id, data);
      if (ok) {
        toast.success("Event updated.");
        setDialogOpen(false);
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
        link: data.link,
        linkLabel: data.linkLabel,
        lat: data.lat,
        lng: data.lng,
        capacity: data.capacity,
        published: data.published ?? true,
        createdBy: user?.id,
      });
      if (id) {
        toast.success("Event created.");
        setDialogOpen(false);
      } else {
        toast.error("Couldn't create the event.");
      }
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-base font-bold">
            <CalendarDays className="h-4 w-4 text-[#FF0099]" /> Events
          </h2>
          <p className="text-[11px] text-white/40">
            Create, edit, publish &amp; remove the events on your community
            calendar.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href="/community/admin/calendar"
            className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-transparent px-2.5 text-xs text-white/60 transition-colors hover:bg-white/5 hover:text-white"
            title="Configure Google Calendar feeds"
          >
            <Globe className="h-3.5 w-3.5" /> Calendar feeds
          </a>
          <Button
            onClick={() => {
              setEditingEvent(null);
              setEditingMeetup(null);
              setDialogOpen(true);
            }}
            className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Create event
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {/* Manual events */}
          <section className="space-y-2">
            <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
              Manual events ({manualEvents.length}) · drafts stay hidden from the
              public site
            </p>
            {loading ? (
              <p className="py-10 text-center text-xs text-white/30">
                Loading...
              </p>
            ) : manualEvents.length === 0 ? (
              <p className="py-10 text-center text-xs text-white/30">
                No manual events yet. Click &quot;Create event&quot; to add one.
              </p>
            ) : (
              manualEvents.map((ev) => {
                const published = isPublished(ev);
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 hover:bg-white/5"
                  >
                    <span className="w-24 shrink-0 text-[11px] tabular-nums text-white/40">
                      {ev.date}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-medium text-white/80">
                          {ev.title}
                        </p>
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                            published
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                              : "border-white/15 bg-white/5 text-white/50"
                          }`}
                        >
                          {published ? "Published" : "Draft"}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium capitalize text-white/50">
                          {ev.type}
                        </span>
                      </div>
                      {ev.location ? (
                        <p className="truncate text-[11px] text-white/40">
                          {ev.location}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => {
                          setEditingEvent(ev);
                          setEditingMeetup(null);
                          setDialogOpen(true);
                        }}
                        aria-label="Edit event"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => handleTogglePublished(ev)}
                        aria-label={
                          published ? "Unpublish event" : "Publish event"
                        }
                      >
                        {published ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => handleDelete(ev)}
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          {/* Connected calendar feeds — pause / sync / disconnect */}
          {(configsLoading ? false : configs.length > 0) ? (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <Globe className="h-3 w-3" /> Connected feeds ({configs.length})
              </p>
              {configs.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white/80">
                      {c.name}
                    </p>
                    <p className="truncate text-[10px] text-white/35">
                      {c.icalUrl}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-medium ${
                      c.enabled
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                        : "border-white/15 bg-white/5 text-white/50"
                    }`}
                  >
                    {c.enabled ? "Syncing" : "Paused"}
                  </span>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      className={actionBtn}
                      onClick={() => handleSyncNow(c.id)}
                      disabled={syncing === c.id}
                      aria-label="Sync now"
                      title="Sync now"
                    >
                      {syncing === c.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className="rounded-md px-2 py-1.5 text-[11px] font-medium text-white/40 transition-colors hover:bg-white/10 hover:text-white"
                      onClick={async () => {
                        const ok = await updateConfig(c.id, { enabled: !c.enabled });
                        if (!ok) toast.error("Couldn't update the feed.");
                      }}
                    >
                      {c.enabled ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => handleDeleteFeed(c)}
                      aria-label="Disconnect feed"
                      title="Disconnect feed and remove its events"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {/* Synced events — deletable & editable; deletes are tombstoned */}
          {syncedEvents.length > 0 ? (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <Globe className="h-3 w-3" /> Synced events ({syncedEvents.length})
                · from calendar feeds
              </p>
              <div className="space-y-1">
                {syncedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-xs hover:bg-white/5"
                  >
                    <span className="w-24 shrink-0 tabular-nums text-white/40">
                      {ev.date}
                    </span>
                    <span className="flex-1 truncate text-white/60">
                      {ev.title}
                    </span>
                    <span
                      className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-white/40"
                      title={
                        ev.sourceCalendarId
                          ? `From feed: ${feedNameById.get(ev.sourceCalendarId) ?? ev.sourceCalendarId}`
                          : undefined
                      }
                    >
                      Synced
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => {
                          setEditingEvent(ev);
                          setEditingMeetup(null);
                          setDialogOpen(true);
                        }}
                        aria-label="Edit event (detaches it from the feed)"
                        title="Edit — this detaches the event from the feed so your changes stick"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => handleDelete(ev)}
                        aria-label="Delete event"
                        title="Delete — the feed is blocked from re-adding it"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="px-1 text-[10px] text-white/25">
                Deleting a synced event blocks the feed from re-adding it.
                Editing one detaches it from the feed so your changes stick.
              </p>
            </section>
          ) : null}

          {/* Member-hosted meetups (also shown on /events) — moderation */}
          {!meetupsLoading && meetups.length > 0 ? (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <Users className="h-3 w-3" /> Member meetups ({meetups.length})
                · hosted by members, shown on /events
              </p>
              <div className="space-y-1">
                {meetups.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-xs hover:bg-white/5"
                  >
                    <span className="w-24 shrink-0 tabular-nums text-white/40">
                      {m.date}
                    </span>
                    <span className="flex-1 truncate text-white/60">
                      {m.title}
                    </span>
                    <span className="max-w-28 truncate rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-white/40">
                      {m.hostName}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => {
                          setEditingMeetup(m);
                          setEditingEvent(null);
                          setDialogOpen(true);
                        }}
                        aria-label="Edit meetup"
                        title="Edit this member meetup"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                        onClick={() => handleDeleteMeetup(m.id, m.title)}
                        aria-label="Remove meetup"
                        title="Remove this member meetup"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </ScrollArea>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingMeetup ? meetupToDialogEvent(editingMeetup) : editingEvent}
        meetup={!!editingMeetup}
        onSave={handleSave}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event Dialog (create + edit)                                        */
/* ------------------------------------------------------------------ */

/**
 * Create / edit dialog for a community event. Exported so /events can
 * reuse it for in-place editing (list, map and detail views). Controlled
 * fields are (re)initialized whenever the dialog opens or the target
 * event changes (keyed on `[open, event?.id]`) so typing is never
 * clobbered mid-edit. With `meetup` set the fields that don't exist on a
 * member meetup (end date/time, type, publish gate) are hidden and the
 * save payload simply omits them.
 */
export function EventDialog({
  open,
  onOpenChange,
  event,
  onSave,
  meetup = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: FirestoreEvent | null;
  onSave: (data: Partial<FirestoreEvent>) => Promise<void>;
  /** Editing a member-hosted meetup (fewer fields, different copy). */
  meetup?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [type, setType] = useState<string>("social");
  const [location, setLocation] = useState("");
  const [link, setLink] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [published, setPublished] = useState(true);
  const [busy, setBusy] = useState(false);

  const isEdit = !!event;

  // Draft autosave — survives accidental close / refresh.
  const draftKey = open ? (event ? `event:${event.id}` : "event:new") : null;
  const draft = useFormDraft<EventDraft>(draftKey);
  const baselineRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const data: EventDraft = {
    title, description, date, endDate, startTime, endTime, type, location, link, linkLabel, capacity, published,
  };
  const dataJson = JSON.stringify(data);
  const latestRef = useRef<EventDraft>(data);
  latestRef.current = data;
  const dirty = baselineRef.current !== null && dataJson !== baselineRef.current;

  function applyDraft(d: EventDraft) {
    setTitle(d.title); setDescription(d.description); setDate(d.date); setEndDate(d.endDate);
    setStartTime(d.startTime); setEndTime(d.endTime); setType(d.type); setLocation(d.location);
    setLink(d.link ?? ""); setLinkLabel(d.linkLabel ?? "");
    setCapacity(d.capacity); setPublished(d.published);
  }
  function handleRestore() {
    const d = draft.getDraft();
    if (d) applyDraft(d);
    draft.dismiss();
  }

  useEffect(() => {
    if (!open || !readyRef.current || baselineRef.current === null) return;
    if (dataJson !== baselineRef.current) draft.save(JSON.parse(dataJson) as EventDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataJson]);

  useEffect(() => {
    if (!open) return;
    setTitle(event?.title ?? "");
    setDescription(event?.description ?? "");
    setDate(event?.date ?? "");
    setEndDate(event?.endDate ?? "");
    setStartTime(event?.startTime ?? "");
    setEndTime(event?.endTime ?? "");
    // "synced" isn't a pickable type — editing a synced event detaches it,
    // so it needs a real category (defaults to Social).
    setType(event?.type && event.type !== "synced" ? event.type : "social");
    setLocation(event?.location ?? "");
    setLink(event?.link ?? "");
    setLinkLabel(event?.linkLabel ?? "");
    setCapacity(
      typeof event?.capacity === "number" && event.capacity > 0
        ? String(event.capacity)
        : "",
    );
    setPublished(event?.published !== false);
    baselineRef.current = JSON.stringify({
      title: event?.title ?? "", description: event?.description ?? "", date: event?.date ?? "",
      endDate: event?.endDate ?? "", startTime: event?.startTime ?? "", endTime: event?.endTime ?? "",
      type: event?.type && event.type !== "synced" ? event.type : "social",
      location: event?.location ?? "",
      link: event?.link ?? "", linkLabel: event?.linkLabel ?? "",
      capacity: typeof event?.capacity === "number" && event.capacity > 0 ? String(event.capacity) : "",
      published: event?.published !== false,
    } satisfies EventDraft);
    readyRef.current = false;
    const t = setTimeout(() => { readyRef.current = true; }, 0);
    return () => clearTimeout(t);
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
    setLink("");
    setLinkLabel("");
    setCapacity("");
    setPublished(true);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          if (dirty) draft.saveNow(latestRef.current);
          reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {meetup ? "Edit Meetup" : isEdit ? "Edit Event" : "Create Event"}
          </DialogTitle>
          <DialogDescription>
            {meetup
              ? "Update this member-hosted meetup for everyone."
              : isEdit
                ? "Update the event details."
                : "Add a new community event to the calendar."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label={isEdit ? "edit to this event" : "event draft"}
              onRestore={handleRestore}
              onDiscard={draft.clear}
            />
          )}
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
            {meetup ? (
              <div className="grid gap-1.5">
                <Label>Start time (optional)</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label>End date (optional)</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            )}
          </div>
          {!meetup && (
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
          )}
          <div className="grid grid-cols-2 gap-3">
            {!meetup && (
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
            )}
            <div className={meetup ? "col-span-2 grid gap-1.5" : "grid gap-1.5"}>
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Blue Bottle Coffee, Los Angeles, CA"
              />
            </div>
          </div>
          <p className="-mt-2 text-[11px] text-muted-foreground">
            Use a full address or place name — we drop a map pin on it
            automatically so members can find it.
          </p>
          <div className="grid gap-1.5">
            <Label>Link (optional)</Label>
            <Input
              type="url"
              inputMode="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://your-payment-or-rsvp-page.com"
            />
            <p className="text-[11px] text-muted-foreground">
              A payment, ticket, or details page. Shown as a button on the event.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>Link button text (optional)</Label>
            <Input
              value={linkLabel}
              onChange={(e) => setLinkLabel(e.target.value)}
              placeholder="e.g. Buy tickets, Pay deposit, RSVP"
            />
          </div>
          {!meetup && (
            <div className="grid gap-1.5">
              <Label>Visibility</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={published ? "default" : "outline"}
                  onClick={() => setPublished((p) => !p)}
                  className={published ? "bg-primary hover:bg-magenta" : undefined}
                >
                  {published ? (
                    <Globe className="mr-1 h-3.5 w-3.5" />
                  ) : (
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                  )}
                  {published ? "Published" : "Draft"}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Drafts are hidden from the public site.
              </p>
            </div>
          )}
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
          {dirty && (
            <div className="mr-auto flex items-center sm:self-center">
              <DraftSavedHint savedAt={draft.draftSavedAt} />
            </div>
          )}
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
              if (capNum !== undefined && (Number.isNaN(capNum) || capNum < 0)) {
                toast.error("Capacity must be a positive number.");
                return;
              }
              setBusy(true);
              try {
                // Geocode the location to a map pin. Reuse existing coords when
                // the address is unchanged on an edit so we don't re-hit the API.
                const loc = location.trim();
                let lat: number | undefined;
                let lng: number | undefined;
                if (loc) {
                  if (event && event.location === loc && event.lat != null && event.lng != null) {
                    lat = event.lat;
                    lng = event.lng;
                  } else {
                    const geo = await geocodeLocation(loc);
                    if (geo) {
                      lat = geo.lat;
                      lng = geo.lng;
                    }
                  }
                }
                await onSave({
                  title: title.trim(),
                  description: description.trim(),
                  date,
                  endDate: endDate || undefined,
                  startTime: startTime || undefined,
                  endTime: endTime || undefined,
                  type: type as FirestoreEvent["type"],
                  location: loc,
                  link: link.trim() || undefined,
                  linkLabel: linkLabel.trim() || undefined,
                  lat,
                  lng,
                  capacity: capNum,
                  published,
                });
                draft.clear();
              } finally {
                setBusy(false);
              }
            }}
            disabled={busy}
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
