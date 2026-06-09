"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export default function AdminTripsPage() {
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
    // If both resolve to the same value, fall back to index positions so
    // the swap still produces two distinct, ordered values.
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
    <div className="p-4 lg:p-6 overflow-auto h-full">
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2 font-[family-name:var(--font-heading)]">
            <Plane className="h-6 w-6 text-primary" />
            Trips
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, publish, and feature the trips on your marketing
            site.
          </p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold flex items-center gap-2">
                <Plane className="h-4 w-4 text-primary" />
                All Trips ({trips.length})
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Drafts stay hidden from the public site until you publish
                them.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingTrip(null);
                setDialogOpen(true);
              }}
              className="bg-primary hover:bg-magenta"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Trip
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Loading...
              </p>
            ) : sorted.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No trips yet. Click &quot;Create Trip&quot; to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {sorted.map((t, idx) => {
                  const published = isPublished(t);
                  return (
                    <div
                      key={t.id}
                      className="flex items-center gap-3 rounded-lg border border-rosa/20 px-3 py-2 hover:bg-primary/5"
                    >
                      <span className="text-xl shrink-0">{t.emoji}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">
                            {t.title}
                          </p>
                          <Badge
                            variant={published ? "default" : "secondary"}
                            className="text-[9px] h-4"
                          >
                            {published ? "Published" : "Draft"}
                          </Badge>
                          {t.featured ? (
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 gap-0.5"
                            >
                              <Star className="h-2.5 w-2.5" /> Featured
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {[t.destination, t.country]
                            .filter(Boolean)
                            .join(", ")}
                          {t.dates ? ` · ${t.dates}` : ""}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
                          <span className="font-medium text-foreground">
                            ${t.price.toLocaleString()}
                          </span>
                          <span>
                            {t.spotsLeft}/{t.spots} spots left
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        <div className="flex flex-col mr-1">
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="h-4 w-6"
                            onClick={() => handleNudgeOrder(t, -1)}
                            disabled={idx === 0}
                            aria-label="Move up"
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon-xs"
                            variant="ghost"
                            className="h-4 w-6"
                            onClick={() => handleNudgeOrder(t, 1)}
                            disabled={idx === sorted.length - 1}
                            aria-label="Move down"
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => {
                            setEditingTrip(t);
                            setDialogOpen(true);
                          }}
                          aria-label="Edit trip"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() => handleTogglePublished(t)}
                        >
                          {published ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className={
                            t.featured
                              ? "h-7 px-2 text-xs text-primary"
                              : "h-7 px-2 text-xs"
                          }
                          onClick={() => handleToggleFeatured(t)}
                          aria-label={
                            t.featured ? "Unfeature trip" : "Feature trip"
                          }
                        >
                          <Star
                            className={
                              t.featured
                                ? "h-3.5 w-3.5 fill-current"
                                : "h-3.5 w-3.5"
                            }
                          />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                          onClick={() => handleDelete(t)}
                          aria-label="Delete trip"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <TripFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        trip={editingTrip}
        onSave={handleSave}
      />
    </div>
  );
}
