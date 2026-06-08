"use client";

/**
 * "Host a meetup" dialog form.
 *
 * A member fills in title / description / date / time / location /
 * optional capacity and we create a `meetups/{autoId}` doc via
 * useMeetups().createMeetup. Location is captured two ways:
 *
 *   - Pick from the LocationAutocomplete dropdown → we already have
 *     verified lat/lng and pass them through (no geocode round-trip).
 *   - Type free text and skip the dropdown → the hook geocodes it.
 *
 * Validation is zod at the submit boundary; the dialog resets on close.
 * Renders nothing destructive — purely additive — so it's safe to mount
 * anywhere on the meetups page.
 */

import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  LocationAutocomplete,
  type LocationResult,
} from "@/components/community/location-autocomplete";
import { useMeetups, type MeetupInput } from "@/lib/use-meetups";

/*
 * Location is captured with a discovery autocomplete *plus* a plain
 * controlled text field below it:
 *
 *   - Picking a suggestion fills the text field AND pins lat/lng, so the
 *     meetup sorts by distance immediately (no geocode round-trip).
 *   - Typing freely in the text field is always honoured — if it no
 *     longer matches the pinned label we drop the coords and let the
 *     hook geocode the text on save.
 *
 * This keeps the autocomplete's nice UX without depending on it to
 * surface free-typed input (it only reports picks).
 */

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

// HTML <input type="date"> emits YYYY-MM-DD; time emits HH:mm.
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

const MeetupSchema = z.object({
  title: z.string().trim().min(3, "Give your meetup a name (3+ characters).").max(120),
  description: z
    .string()
    .trim()
    .min(10, "Add a sentence or two so amigas know what to expect.")
    .max(2000),
  date: z.string().regex(DATE_RE, "Pick a date."),
  startTime: z
    .string()
    .regex(TIME_RE, "Use a valid time.")
    .optional()
    .or(z.literal("")),
  location: z.string().trim().min(2, "Where is it? Add a place or city."),
  capacity: z
    .number()
    .int()
    .min(0)
    .max(10000)
    .optional(),
});

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface MeetupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the new meetup id after a successful create. */
  onCreated?: (id: string) => void;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function MeetupForm({ open, onOpenChange, onCreated }: MeetupFormProps) {
  const { createMeetup, isFirebase } = useMeetups();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [location, setLocation] = useState("");
  // Pre-resolved coords + the exact label they belong to. If the host
  // later hand-edits the text away from `pinnedLabel`, the coords no
  // longer match and we fall back to geocoding on submit.
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [pinnedLabel, setPinnedLabel] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busy, setBusy] = useState(false);

  function reset() {
    setTitle("");
    setDescription("");
    setDate("");
    setStartTime("");
    setLocation("");
    setCoords(null);
    setPinnedLabel("");
    setCapacity("");
  }

  function handlePick(result: LocationResult) {
    setLocation(result.label);
    setCoords({ lat: result.lat, lng: result.lng });
    setPinnedLabel(result.label);
  }

  // Free typing in the text field always wins; once it diverges from the
  // pinned label the coords no longer describe it, so forget them.
  function handleLocationText(value: string) {
    setLocation(value);
    if (value !== pinnedLabel) setCoords(null);
  }

  const isPinned = coords !== null && location === pinnedLabel;

  async function handleSubmit() {
    if (!isFirebase) {
      toast.error("Hosting meetups needs Firestore — set it up to enable this.");
      return;
    }

    const capNum = capacity.trim() ? Number(capacity) : undefined;
    const parsed = MeetupSchema.safeParse({
      title,
      description,
      date,
      startTime: startTime || undefined,
      location,
      capacity: Number.isNaN(capNum) ? undefined : capNum,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }

    const input: MeetupInput = {
      title: parsed.data.title,
      description: parsed.data.description,
      date: parsed.data.date,
      startTime: parsed.data.startTime || undefined,
      location: parsed.data.location,
      capacity: parsed.data.capacity,
      // Pass coords only while the text still matches the picked result;
      // otherwise let the hook geocode the free text.
      ...(isPinned ? { lat: coords!.lat, lng: coords!.lng } : {}),
    };

    setBusy(true);
    const id = await createMeetup(input);
    setBusy(false);

    if (id) {
      toast.success("Your meetup is live 🎉 Amigas nearby can RSVP now.");
      reset();
      onOpenChange(false);
      onCreated?.(id);
    } else {
      toast.error("Couldn't create the meetup. Please try again.");
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Host a meetup
          </DialogTitle>
          <DialogDescription>
            Gather your amigas for coffee, a hike, a salsa night — anything.
            It&apos;ll show up for members nearby.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="meetup-title">Title</Label>
            <Input
              id="meetup-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Sunday café & cuaderno meetup"
              autoFocus
              maxLength={120}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="meetup-desc">What&apos;s the plan?</Label>
            <textarea
              id="meetup-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Tell amigas what to expect, what to bring, who it's for…"
              rows={3}
              maxLength={2000}
              className="min-h-[72px] w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="meetup-date">Date</Label>
              <Input
                id="meetup-date"
                type="date"
                value={date}
                min={todayISO()}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="meetup-time">Start time (optional)</Label>
              <Input
                id="meetup-time"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="meetup-loc">Location</Label>
            <LocationAutocomplete
              onSelect={handlePick}
              clearOnSelect
              placeholder="Search a place, city, or zip"
            />
            <Input
              id="meetup-loc"
              value={location}
              onChange={(e) => handleLocationText(e.target.value)}
              placeholder="…or type an address / city"
            />
            {isPinned ? (
              <p className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                <MapPin className="h-3 w-3" />
                Pinned — amigas can sort this by distance.
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Pick a suggestion to pin it, or just type — we&apos;ll look it
                up.
              </p>
            )}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="meetup-cap">Capacity (optional)</Label>
            <Input
              id="meetup-cap"
              type="number"
              inputMode="numeric"
              min={0}
              max={10000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="Leave blank for no limit"
              className="max-w-[180px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={busy}
            className="bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white hover:brightness-110 border-0"
          >
            {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
            Publish meetup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
