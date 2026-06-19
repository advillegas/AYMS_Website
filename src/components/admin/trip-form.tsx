"use client";

import { useEffect, useRef, useState } from "react";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Trip } from "@/lib/trips-data";
import { useFormDraft } from "@/lib/use-form-draft";
import { DraftBanner, DraftSavedHint } from "@/components/admin/draft-banner";
import { EmojiField } from "@/components/admin/emoji-field";
import { resolveBooking } from "@/lib/url";

/** All editable fields, captured as a draft so interruptions don't lose work. */
interface TripDraft {
  title: string;
  destination: string;
  country: string;
  dates: string;
  duration: string;
  price: string;
  deposit: string;
  spots: string;
  spotsLeft: string;
  status: Trip["status"];
  description: string;
  highlights: string;
  includes: string;
  notIncluded: string;
  emoji: string;
  gradient: string;
  image: string;
  bookingUrl: string;
  bookingLabel: string;
  published: boolean;
  featured: boolean;
  order: string;
}

/** Sensible brand gradient seeded into the form for brand-new trips. */
const DEFAULT_GRADIENT = "from-[#FF0099] via-[#B51760] to-[#9B2C8A]";

const STATUS_OPTIONS = [
  { value: "available", label: "Available" },
  { value: "sold-out", label: "Sold out" },
  { value: "waitlist", label: "Waitlist" },
  { value: "coming-soon", label: "Coming soon" },
] as const;

/** The shape we hand back to the page on save (no id/timestamps). */
export type TripFormData = Omit<Trip, "id" | "createdAt" | "updatedAt">;

/** Shared styling so the multi-line fields match the Input primitive. */
const textareaClass =
  "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

/** One item per line <-> string[] helpers. */
function linesToArray(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}
function arrayToLines(value: string[] | undefined): string {
  return (value ?? []).join("\n");
}

/**
 * Create / edit dialog for a marketing Trip. Controlled fields are
 * (re)initialized whenever the dialog opens or the target trip changes
 * (keyed on `[open, trip?.id]`) so typing is never clobbered mid-edit,
 * and a `reset()` runs on close. Mirrors the calendar page's EventDialog.
 */
export function TripFormDialog({
  open,
  onOpenChange,
  trip,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  trip: Trip | null;
  onSave: (data: TripFormData) => Promise<void>;
}) {
  const isEdit = !!trip;

  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [country, setCountry] = useState("");
  const [dates, setDates] = useState("");
  const [duration, setDuration] = useState("");
  const [price, setPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [spots, setSpots] = useState("");
  const [spotsLeft, setSpotsLeft] = useState("");
  const [status, setStatus] = useState<Trip["status"]>("available");
  const [description, setDescription] = useState("");
  const [highlights, setHighlights] = useState("");
  const [includes, setIncludes] = useState("");
  const [notIncluded, setNotIncluded] = useState("");
  const [emoji, setEmoji] = useState("");
  const [gradient, setGradient] = useState(DEFAULT_GRADIENT);
  const [image, setImage] = useState("");
  const [bookingUrl, setBookingUrl] = useState("");
  const [bookingLabel, setBookingLabel] = useState("");
  const [published, setPublished] = useState(true);
  const [featured, setFeatured] = useState(false);
  const [order, setOrder] = useState("");
  const [busy, setBusy] = useState(false);

  // Draft autosave so an accidental close / refresh never loses the form.
  const draftKey = open ? (trip ? `trip:${trip.id}` : "trip:new") : null;
  const draft = useFormDraft<TripDraft>(draftKey);
  const baselineRef = useRef<string | null>(null);
  const readyRef = useRef(false);

  const data: TripDraft = {
    title, destination, country, dates, duration, price, deposit, spots, spotsLeft,
    status, description, highlights, includes, notIncluded, emoji, gradient, image,
    bookingUrl, bookingLabel, published, featured, order,
  };
  const dataJson = JSON.stringify(data);
  const latestRef = useRef<TripDraft>(data);
  latestRef.current = data;
  const dirty = baselineRef.current !== null && dataJson !== baselineRef.current;

  function applyDraft(d: TripDraft) {
    setTitle(d.title); setDestination(d.destination); setCountry(d.country);
    setDates(d.dates); setDuration(d.duration); setPrice(d.price); setDeposit(d.deposit);
    setSpots(d.spots); setSpotsLeft(d.spotsLeft); setStatus(d.status);
    setDescription(d.description); setHighlights(d.highlights); setIncludes(d.includes);
    setNotIncluded(d.notIncluded); setEmoji(d.emoji); setGradient(d.gradient);
    setImage(d.image); setBookingUrl(d.bookingUrl); setBookingLabel(d.bookingLabel);
    setPublished(d.published); setFeatured(d.featured); setOrder(d.order);
  }

  function handleRestore() {
    const d = draft.getDraft();
    if (d) applyDraft(d);
    draft.dismiss();
  }
  function handleDiscard() {
    draft.clear();
  }

  // Autosave the draft whenever the form differs from what it opened with.
  useEffect(() => {
    if (!open || !readyRef.current || baselineRef.current === null) return;
    if (dataJson !== baselineRef.current) draft.save(JSON.parse(dataJson) as TripDraft);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dataJson]);

  useEffect(() => {
    if (!open) return;
    setTitle(trip?.title ?? "");
    setDestination(trip?.destination ?? "");
    setCountry(trip?.country ?? "");
    setDates(trip?.dates ?? "");
    setDuration(trip?.duration ?? "");
    setPrice(trip ? String(trip.price) : "");
    setDeposit(trip ? String(trip.deposit) : "");
    setSpots(trip ? String(trip.spots) : "");
    setSpotsLeft(trip ? String(trip.spotsLeft) : "");
    setStatus(trip?.status ?? "available");
    setDescription(trip?.description ?? "");
    setHighlights(arrayToLines(trip?.highlights));
    setIncludes(arrayToLines(trip?.includes));
    setNotIncluded(arrayToLines(trip?.notIncluded));
    setEmoji(trip?.emoji ?? "");
    setGradient(trip?.gradient || DEFAULT_GRADIENT);
    setImage(trip?.image ?? "");
    setBookingUrl(trip?.bookingUrl ?? "");
    setBookingLabel(trip?.bookingLabel ?? "");
    // `undefined` published counts as published (legacy seeds).
    setPublished(trip ? trip.published !== false : true);
    setFeatured(trip ? !!trip.featured : false);
    setOrder(
      trip && typeof trip.order === "number" ? String(trip.order) : "",
    );
    // Snapshot the opened baseline so autosave only fires on real changes.
    baselineRef.current = JSON.stringify({
      title: trip?.title ?? "", destination: trip?.destination ?? "", country: trip?.country ?? "",
      dates: trip?.dates ?? "", duration: trip?.duration ?? "", price: trip ? String(trip.price) : "",
      deposit: trip ? String(trip.deposit) : "", spots: trip ? String(trip.spots) : "",
      spotsLeft: trip ? String(trip.spotsLeft) : "", status: trip?.status ?? "available",
      description: trip?.description ?? "", highlights: arrayToLines(trip?.highlights),
      includes: arrayToLines(trip?.includes), notIncluded: arrayToLines(trip?.notIncluded),
      emoji: trip?.emoji ?? "", gradient: trip?.gradient || DEFAULT_GRADIENT, image: trip?.image ?? "",
      bookingUrl: trip?.bookingUrl ?? "", bookingLabel: trip?.bookingLabel ?? "",
      published: trip ? trip.published !== false : true, featured: trip ? !!trip.featured : false,
      order: trip && typeof trip.order === "number" ? String(trip.order) : "",
    } satisfies TripDraft);
    readyRef.current = false;
    const t = setTimeout(() => { readyRef.current = true; }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, trip?.id]);

  function reset() {
    setTitle("");
    setDestination("");
    setCountry("");
    setDates("");
    setDuration("");
    setPrice("");
    setDeposit("");
    setSpots("");
    setSpotsLeft("");
    setStatus("available");
    setDescription("");
    setHighlights("");
    setIncludes("");
    setNotIncluded("");
    setEmoji("");
    setGradient(DEFAULT_GRADIENT);
    setImage("");
    setBookingUrl("");
    setBookingLabel("");
    setPublished(true);
    setFeatured(false);
    setOrder("");
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required.");
      return;
    }
    const numFields: Array<[string, string]> = [
      ["Price", price],
      ["Deposit", deposit],
      ["Spots", spots],
      ["Spots left", spotsLeft],
    ];
    for (const [label, raw] of numFields) {
      const n = Number(raw);
      if (raw.trim() === "" || Number.isNaN(n) || n < 0) {
        toast.error(`${label} must be a non-negative number.`);
        return;
      }
    }
    let orderNum: number | undefined;
    if (order.trim() !== "") {
      orderNum = Number(order);
      if (Number.isNaN(orderNum)) {
        toast.error("Order must be a number.");
        return;
      }
    }

    setBusy(true);
    try {
      const payload: TripFormData = {
        title: title.trim(),
        destination: destination.trim(),
        country: country.trim(),
        dates: dates.trim(),
        duration: duration.trim(),
        price: Number(price),
        deposit: Number(deposit),
        status,
        spots: Number(spots),
        spotsLeft: Number(spotsLeft),
        description: description.trim(),
        highlights: linesToArray(highlights),
        includes: linesToArray(includes),
        notIncluded: linesToArray(notIncluded),
        emoji: emoji.trim(),
        gradient: gradient.trim() || DEFAULT_GRADIENT,
        image: image.trim(),
        // Normalize so a link pasted into the wrong field still works and a
        // raw URL never ends up as the button text.
        bookingUrl: resolveBooking(bookingUrl, bookingLabel).url || undefined,
        bookingLabel:
          resolveBooking(bookingUrl, bookingLabel).label === "Book Now"
            ? undefined
            : resolveBooking(bookingUrl, bookingLabel).label,
        published,
        featured,
      };
      // Only send `order` when explicitly set, so editing a trip and
      // leaving Order blank doesn't reset its position to the end.
      if (orderNum !== undefined) payload.order = orderNum;
      await onSave(payload);
      // Saved for real — drop the recovery draft.
      draft.clear();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          // Flush any in-progress edits to the draft BEFORE closing, so even an
          // accidental backdrop click keeps the work for next time.
          if (dirty) draft.saveNow(latestRef.current);
          reset();
        }
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Trip" : "Create Trip"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the trip details shown on the marketing site."
              : "Add a new trip to the marketing site."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {draft.hasDraft && (
            <DraftBanner
              savedAt={draft.draftSavedAt}
              label={isEdit ? "edit to this trip" : "trip draft"}
              onRestore={handleRestore}
              onDiscard={handleDiscard}
            />
          )}
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cancún, Mexico"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Destination</Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Cancún"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Mexico"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Dates</Label>
              <Input
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                placeholder="e.g. August 20–25, 2026"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Duration</Label>
              <Input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g. 6 days / 5 nights"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Price ($)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="1850"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Deposit ($)</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Spots</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={spots}
                onChange={(e) => setSpots(e.target.value)}
                placeholder="20"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Spots left</Label>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={spotsLeft}
                onChange={(e) => setSpotsLeft(e.target.value)}
                placeholder="8"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as Trip["status"])
                }
                className="h-8 rounded-lg border border-input bg-background px-2.5 text-sm"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Order (optional)</Label>
              <Input
                type="number"
                inputMode="numeric"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Description</Label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short marketing blurb for the trip."
              rows={3}
              className={textareaClass}
            />
          </div>

          <div className="grid gap-1.5">
            <Label>Highlights</Label>
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              placeholder={"One per line\nChichén Itzá day trip\nCenote swimming"}
              rows={4}
              className={textareaClass}
            />
            <p className="text-[11px] text-muted-foreground">
              One item per line.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Includes</Label>
            <textarea
              value={includes}
              onChange={(e) => setIncludes(e.target.value)}
              placeholder={"One per line\n5 nights all-inclusive resort\nAirport transfers"}
              rows={4}
              className={textareaClass}
            />
            <p className="text-[11px] text-muted-foreground">
              One item per line.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Not included</Label>
            <textarea
              value={notIncluded}
              onChange={(e) => setNotIncluded(e.target.value)}
              placeholder={"One per line\nInternational flights\nTravel insurance"}
              rows={3}
              className={textareaClass}
            />
            <p className="text-[11px] text-muted-foreground">
              One item per line.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Emoji</Label>
              <EmojiField value={emoji} onChange={setEmoji} />
              <p className="text-[11px] text-muted-foreground">
                Optional — shown on the trip card. Remove it to show none.
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label>Image path</Label>
              <Input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="/trips/your-trip.jpg"
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Booking link</Label>
            <Input
              type="url"
              inputMode="url"
              value={bookingUrl}
              onChange={(e) => setBookingUrl(e.target.value)}
              placeholder="https://your-payment-or-details-page.com"
            />
            <p className="text-[11px] text-muted-foreground">
              The trip&apos;s button opens this payment or details page in a new
              tab. Leave blank to use the in-app &ldquo;reserve a spot&rdquo; hold instead.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Button text</Label>
            <Input
              value={bookingLabel}
              onChange={(e) => setBookingLabel(e.target.value)}
              placeholder="Book Now"
            />
            <p className="text-[11px] text-muted-foreground">
              The single call-to-action shown on the card &amp; details. Defaults
              to &ldquo;Book Now&rdquo;. Try &ldquo;Reserve &amp; Pay&rdquo; or &ldquo;Get Tickets&rdquo;.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label>Gradient</Label>
            <Input
              value={gradient}
              onChange={(e) => setGradient(e.target.value)}
              placeholder={DEFAULT_GRADIENT}
            />
            <p className="text-[11px] text-muted-foreground">
              Tailwind gradient stops used on the trip card.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant={published ? "default" : "outline"}
              onClick={() => setPublished((p) => !p)}
              className={published ? "bg-primary hover:bg-magenta" : ""}
            >
              {published ? "Published" : "Draft"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={featured ? "default" : "outline"}
              onClick={() => setFeatured((f) => !f)}
              className={featured ? "bg-primary hover:bg-magenta" : ""}
            >
              {featured ? "Featured" : "Not featured"}
            </Button>
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
            onClick={handleSave}
            disabled={busy}
            className="bg-primary hover:bg-magenta"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
            {isEdit ? "Save Changes" : "Create Trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
