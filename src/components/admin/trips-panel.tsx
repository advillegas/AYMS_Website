"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Plane,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Star,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/store";
import { useConfirm } from "@/components/ui/confirm-dialog";
import { useTrips, sortTrips, type Trip } from "@/lib/use-trips";
import { TripFormDialog, type TripFormData } from "@/components/admin/trip-form";

/** `undefined` published counts as published (legacy seeds). */
function isPublished(t: Trip): boolean {
  return t.published !== false;
}

const actionBtn =
  "rounded-md p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-25 disabled:hover:bg-transparent disabled:hover:text-white/40";

/**
 * Embeddable Trips manager for the unified /admin dashboard. Mirrors the
 * full CRM at /community/admin/trips (add/edit/delete/publish/feature/
 * reorder) but styled as a dark dashboard panel. All business logic lives
 * in the shared `useTrips` hook and the `TripFormDialog` — this is purely
 * the dashboard presentation of it.
 */
export function TripsPanel() {
  const user = useAuth((s) => s.user);
  const confirm = useConfirm();
  const { trips, loading, addTrip, updateTrip, deleteTrip } = useTrips();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);

  const sorted = sortTrips(trips);

  async function handleSave(data: TripFormData) {
    if (editingTrip) {
      const ok = await updateTrip(editingTrip.id, data);
      if (ok) {
        toast.success("Trip updated.");
        setDialogOpen(false);
      } else {
        toast.error("Couldn't update the trip.");
      }
    } else {
      const id = await addTrip({ ...data, createdBy: user?.id });
      if (id) {
        toast.success("Trip created.");
        setDialogOpen(false);
      } else {
        toast.error("Couldn't create the trip.");
      }
    }
  }

  async function handleTogglePublished(t: Trip) {
    const next = !isPublished(t);
    const ok = await updateTrip(t.id, { published: next });
    if (ok) toast.success(next ? "Trip published." : "Trip set to draft.");
    else toast.error("Couldn't update the trip.");
  }

  async function handleToggleFeatured(t: Trip) {
    const next = !t.featured;
    const ok = await updateTrip(t.id, { featured: next });
    if (ok) toast.success(next ? "Trip featured." : "Trip unfeatured.");
    else toast.error("Couldn't update the trip.");
  }

  // Swap order with the adjacent trip in the sorted list. Adding a raw
  // delta to one trip's `order` doesn't reorder anything when neighbors
  // share a value (e.g. legacy trips all at 0) — swapping the two values
  // is what actually moves the row past its neighbor.
  async function handleNudgeOrder(t: Trip, delta: number) {
    const idx = sorted.findIndex((x) => x.id === t.id);
    const swapIdx = idx + delta;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const other = sorted[swapIdx];
    const tOrder = typeof t.order === "number" ? t.order : idx;
    const oOrder = typeof other.order === "number" ? other.order : swapIdx;
    const [tNew, oNew] = tOrder === oOrder ? [swapIdx, idx] : [oOrder, tOrder];
    const [ok1, ok2] = await Promise.all([
      updateTrip(t.id, { order: tNew }),
      updateTrip(other.id, { order: oNew }),
    ]);
    if (!ok1 || !ok2) toast.error("Couldn't reorder the trip.");
  }

  async function handleDelete(t: Trip) {
    const ok = await confirm({
      title: `Delete "${t.title}"?`,
      description:
        "This trip will be permanently removed from the marketing site. This can't be undone.",
      confirmText: "Delete trip",
      destructive: true,
    });
    if (!ok) return;
    const done = await deleteTrip(t.id);
    if (done) toast.success("Trip deleted.");
    else toast.error("Couldn't delete the trip.");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center justify-between border-b border-white/10 px-6">
        <div>
          <h2 className="flex items-center gap-2 font-[family-name:var(--font-heading)] text-base font-bold">
            <Plane className="h-4 w-4 text-[#FF0099]" /> Trips
          </h2>
          <p className="text-[11px] text-white/40">
            Create, edit, publish &amp; feature the trips on your marketing site.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTrip(null);
            setDialogOpen(true);
          }}
          className="h-8 gap-1.5 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-xs text-white hover:brightness-110"
        >
          <Plus className="h-3.5 w-3.5" /> Create trip
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-2 p-6">
          <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-white/30">
            All trips ({trips.length}) · drafts stay hidden from the public site
          </p>
          {loading ? (
            <p className="py-10 text-center text-xs text-white/30">Loading...</p>
          ) : sorted.length === 0 ? (
            <p className="py-10 text-center text-xs text-white/30">
              No trips yet. Click &quot;Create trip&quot; to add one.
            </p>
          ) : (
            sorted.map((t, idx) => {
              const published = isPublished(t);
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-white/8 bg-white/[0.02] px-3 py-2.5 hover:bg-white/5"
                >
                  <span className="shrink-0 text-xl">{t.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium text-white/80">
                        {t.title}
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
                      {t.featured ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full border border-[#FF0099]/30 bg-[#FF0099]/10 px-1.5 py-0.5 text-[9px] font-medium text-[#FF66C4]">
                          <Star className="h-2.5 w-2.5 fill-current" /> Featured
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-[11px] text-white/40">
                      {[t.destination, t.country].filter(Boolean).join(", ")}
                      {t.dates ? ` · ${t.dates}` : ""}
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-[10px] tabular-nums text-white/40">
                      <span className="font-medium text-white/70">
                        ${t.price.toLocaleString()}
                      </span>
                      <span>
                        {t.spotsLeft}/{t.spots} spots left
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <div className="mr-1 flex flex-col">
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => handleNudgeOrder(t, -1)}
                        disabled={idx === 0}
                        aria-label="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        className={actionBtn}
                        onClick={() => handleNudgeOrder(t, 1)}
                        disabled={idx === sorted.length - 1}
                        aria-label="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      type="button"
                      className={actionBtn}
                      onClick={() => {
                        setEditingTrip(t);
                        setDialogOpen(true);
                      }}
                      aria-label="Edit trip"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className={actionBtn}
                      onClick={() => handleTogglePublished(t)}
                      aria-label={published ? "Unpublish trip" : "Publish trip"}
                    >
                      {published ? (
                        <EyeOff className="h-3.5 w-3.5" />
                      ) : (
                        <Eye className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      className={
                        t.featured
                          ? "rounded-md p-1.5 text-[#FF0099] transition-colors hover:bg-white/10"
                          : actionBtn
                      }
                      onClick={() => handleToggleFeatured(t)}
                      aria-label={t.featured ? "Unfeature trip" : "Feature trip"}
                    >
                      <Star
                        className={
                          t.featured ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"
                        }
                      />
                    </button>
                    <button
                      type="button"
                      className="rounded-md p-1.5 text-white/40 transition-colors hover:bg-red-500/10 hover:text-red-400"
                      onClick={() => handleDelete(t)}
                      aria-label="Delete trip"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <TripFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trip={editingTrip}
        onSave={handleSave}
      />
    </div>
  );
}
