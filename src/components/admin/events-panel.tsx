"use client";

import { useEffect, useMemo, useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useEvents, type FirestoreEvent } from "@/lib/use-events";

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

/**
 * Embeddable Events manager for the unified /admin dashboard. Mirrors the
 * manual-event management of /community/admin/calendar (create/edit/
 * delete/publish) styled as a dark dashboard panel. Synced (Google
 * Calendar) events are surfaced read-only — their feeds are still
 * configured on the community calendar page. All business logic lives in
 * the shared `useEvents` hook.
 */
export function EventsPanel() {
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const { events, loading, addEvent, updateEvent, deleteEvent } = useEvents();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<FirestoreEvent | null>(null);

  const manualEvents = useMemo(
    () => events.filter((e) => !e.sourceCalendarId),
    [events],
  );
  const syncedEvents = useMemo(
    () => events.filter((e) => e.sourceCalendarId),
    [events],
  );

  async function handleTogglePublished(ev: FirestoreEvent) {
    const next = !isPublished(ev);
    const ok = await updateEvent(ev.id, { published: next });
    if (ok) toast.success(next ? "Event published." : "Moved to draft.");
    else toast.error("Couldn't update visibility.");
  }

  async function handleDelete(ev: FirestoreEvent) {
    const ok = await confirm({
      title: `Delete "${ev.title}"?`,
      description: "This event will be permanently removed.",
      confirmText: "Delete event",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteEvent(ev.id);
    if (done) toast.success("Event deleted.");
    else toast.error("Couldn't delete the event.");
  }

  async function handleSave(data: Partial<FirestoreEvent>) {
    if (editingEvent) {
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

          {/* Synced events (read-only — feeds are managed on the community calendar) */}
          {syncedEvents.length > 0 ? (
            <section className="space-y-2">
              <p className="flex items-center gap-1.5 px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
                <Globe className="h-3 w-3" /> Synced events ({syncedEvents.length})
                · from Google Calendar feeds
              </p>
              <div className="space-y-1">
                {syncedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-xs"
                  >
                    <span className="w-24 shrink-0 tabular-nums text-white/40">
                      {ev.date}
                    </span>
                    <span className="flex-1 truncate text-white/60">
                      {ev.title}
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-1.5 py-0.5 text-[9px] font-medium text-white/40">
                      Synced
                    </span>
                  </div>
                ))}
              </div>
              <p className="px-1 text-[10px] text-white/25">
                Synced events come from connected calendar feeds. Manage feeds on
                the community calendar page.
              </p>
            </section>
          ) : null}
        </div>
      </ScrollArea>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editingEvent}
        onSave={handleSave}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Event Dialog (create + edit)                                        */
/* ------------------------------------------------------------------ */

/**
 * Create / edit dialog for a community event. Mirrors the EventDialog on
 * the community calendar page (which isn't exported). Controlled fields
 * are (re)initialized whenever the dialog opens or the target event
 * changes (keyed on `[open, event?.id]`) so typing is never clobbered
 * mid-edit.
 */
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
              if (capNum !== undefined && (Number.isNaN(capNum) || capNum < 0)) {
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
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            {isEdit ? "Save Changes" : "Create Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
