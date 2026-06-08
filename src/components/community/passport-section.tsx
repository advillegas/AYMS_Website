"use client";

/**
 * Travel Passport section for the profile.
 *
 * A grid of self-declared stamps rendered as glass cards with a
 * per-country gradient — the most identity-affirming artifact we can
 * give this community: a map of where they've been, in their own voice.
 *
 * Shows on both the self profile (with an "Add stamp" affordance + the
 * ability to remove your own stamps) and other members' profiles
 * (read-only). On add, emits a persistent `passport` notification to
 * the member so the milestone shows up in their bell.
 */

import { useState } from "react";
import { Globe, Plus, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { usePassport, type NewStamp } from "@/lib/use-passport";
import { stampGradient } from "@/lib/game-data";
import { pushNotification } from "@/lib/notify";
import { PassportAddDialog } from "./passport-add-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PassportSectionProps {
  /** Profile owner uid (works on self + other profiles). */
  uid: string;
  isSelf: boolean;
  name?: string;
}

export function PassportSection({ uid, isSelf, name }: PassportSectionProps) {
  const { stamps, countries, addStamp, removeStamp, isFirebase } =
    usePassport(uid);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const existingTripIds = stamps
    .map((s) => s.tripId)
    .filter((id): id is string => Boolean(id));

  async function handleAdd(stamp: NewStamp): Promise<boolean> {
    const id = await addStamp(stamp);
    if (!id) {
      toast.error(
        isFirebase
          ? "Couldn't add your stamp. Please try again."
          : "Passport needs Firebase to be configured.",
      );
      return false;
    }
    const where = stamp.city ? `${stamp.city}, ${stamp.country}` : stamp.country;
    toast.success(`${stamp.emoji} ${where} added to your passport!`);
    // Persistent in-app notification to self — a small celebration.
    void pushNotification(uid, {
      kind: "passport",
      title: "New passport stamp 🛂",
      body: `You added ${where} to your travel passport.`,
      actorId: uid,
      actorName: name ?? undefined,
      href: "/community/profile",
    });
    return true;
  }

  async function handleRemove(id: string) {
    setRemovingId(id);
    const ok = await removeStamp(id);
    setRemovingId(null);
    if (ok) toast.success("Stamp removed.");
    else toast.error("Couldn't remove that stamp.");
  }

  const hasStamps = stamps.length > 0;

  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-gradient-brand">
          <Globe className="h-3.5 w-3.5 text-primary" />
          Travel Passport
        </h2>
        {isSelf && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="h-7 gap-1 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Add stamp
          </Button>
        )}
      </div>

      {/* Country summary */}
      {hasStamps && (
        <p className="mb-3 text-xs text-muted-foreground">
          {stamps.length} {stamps.length === 1 ? "stamp" : "stamps"}
          {countries.length > 0 && (
            <>
              {" · "}
              {countries.length}{" "}
              {countries.length === 1 ? "country" : "countries"}
            </>
          )}
        </p>
      )}

      {hasStamps ? (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {stamps.map((s) => (
            <div
              key={s.id}
              className="glass elevate-2 group relative overflow-hidden rounded-2xl p-3"
            >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-10",
                  stampGradient(s.country),
                )}
              />
              <div className="relative">
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-xl shadow-[0_4px_14px_rgb(255_0_153/0.25)]",
                      stampGradient(s.country),
                    )}
                  >
                    {s.emoji}
                  </span>
                  <span className="rounded-full bg-foreground/5 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground/60">
                    {s.year}
                  </span>
                </div>
                <p className="mt-2 truncate text-xs font-bold text-foreground">
                  {s.label}
                </p>
                {(s.city || s.country) && (
                  <p className="flex items-center gap-1 truncate text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {s.city && s.city !== s.label ? `${s.city}, ` : ""}
                    {s.country}
                  </p>
                )}
                {s.note && (
                  <p className="mt-1 line-clamp-2 text-[10px] italic leading-snug text-foreground/60">
                    “{s.note}”
                  </p>
                )}
              </div>

              {isSelf && (
                <button
                  type="button"
                  onClick={() => void handleRemove(s.id)}
                  disabled={removingId === s.id}
                  aria-label={`Remove ${s.label}`}
                  title="Remove stamp"
                  className="absolute right-1.5 top-1.5 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-card/80 text-muted-foreground opacity-0 backdrop-blur-sm transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-rosa/30 bg-card/40 px-4 py-8 text-center">
          <Globe className="mx-auto mb-2 h-8 w-8 text-primary/40" />
          {isSelf ? (
            <>
              <p className="text-sm font-medium text-foreground/80">
                Your passport is waiting for its first stamp
              </p>
              <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                Add the places you&apos;ve been — every trip is part of your
                story.
              </p>
              <Button
                size="sm"
                onClick={() => setDialogOpen(true)}
                className="mt-3 border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add your first stamp
              </Button>
            </>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {name ?? "She"} hasn&apos;t added any passport stamps yet.
            </p>
          )}
        </div>
      )}

      {isSelf && (
        <PassportAddDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onAdd={handleAdd}
          existingTripIds={existingTripIds}
        />
      )}
    </section>
  );
}
