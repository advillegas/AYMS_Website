"use client";

/**
 * Add-a-stamp dialog for the Travel Passport.
 *
 * Two paths, both producing a self-declared stamp:
 *  1. Pick from real AYMS trips (TRIPS_DATA upcoming + PAST_TRIPS) so a
 *     member can quickly stamp a trip they actually went on.
 *  2. Free-add any country/city — the world is bigger than our catalog.
 *
 * trips-data.ts is READ-ONLY here; we only import the arrays. The actual
 * write happens through the addStamp() handler passed in by the section.
 */

import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { TRIPS_DATA, PAST_TRIPS } from "@/lib/trips-data";
import {
  tripToStamp,
  pastTripToStamp,
  stampFlag,
  stampGradient,
  COUNTRY_STAMPS,
  type PassportStamp,
} from "@/lib/game-data";
import type { NewStamp } from "@/lib/use-passport";
import { cn } from "@/lib/utils";
import { Search, MapPin, Plus, Check } from "lucide-react";

type DraftStamp = Omit<PassportStamp, "id" | "addedAt">;

interface PassportAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist a chosen stamp. Returns true on success. */
  onAdd: (stamp: NewStamp) => Promise<boolean>;
  /** Trip ids already stamped, so we can mark them as added. */
  existingTripIds?: string[];
}

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 12 }, (_, i) => CURRENT_YEAR - i);
const KNOWN_COUNTRIES = Object.keys(COUNTRY_STAMPS).sort();

export function PassportAddDialog({
  open,
  onOpenChange,
  onAdd,
  existingTripIds = [],
}: PassportAddDialogProps) {
  const [tab, setTab] = useState<"trips" | "custom">("trips");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  // Free-add form state.
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [note, setNote] = useState("");

  const existing = new Set(existingTripIds);

  const tripMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const upcoming = TRIPS_DATA.map((t) => ({
      key: t.id,
      tripId: t.id,
      draft: tripToStamp(t),
      sub: `${t.destination} · ${t.dates}`,
    }));
    const past = PAST_TRIPS.map((p, i) => ({
      key: `past-${i}-${p.title}`,
      tripId: undefined as string | undefined,
      draft: pastTripToStamp(p),
      sub: `${p.location} · ${p.year}`,
    }));
    const all = [...upcoming, ...past];
    if (!q) return all;
    return all.filter(
      (m) =>
        m.draft.label.toLowerCase().includes(q) ||
        m.draft.country.toLowerCase().includes(q) ||
        (m.draft.city ?? "").toLowerCase().includes(q),
    );
  }, [search]);

  async function commit(draft: DraftStamp) {
    if (saving) return;
    setSaving(true);
    const ok = await onAdd(draft);
    setSaving(false);
    if (ok) {
      // Reset + close.
      setCountry("");
      setCity("");
      setNote("");
      setYear(CURRENT_YEAR);
      setSearch("");
      onOpenChange(false);
    }
  }

  function commitCustom() {
    const c = country.trim();
    if (!c) return;
    void commit({
      country: c,
      city: city.trim() || undefined,
      label: city.trim() ? `${city.trim()}, ${c}` : c,
      emoji: stampFlag(c),
      year,
      note: note.trim() || undefined,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span aria-hidden>🛂</span> Add a passport stamp
          </DialogTitle>
          <DialogDescription>
            Stamp a place you&apos;ve been. Pick an AYMS trip or add anywhere
            in the world.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {(["trips", "custom"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                tab === t
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "trips" ? "AYMS trips" : "Add a country"}
            </button>
          ))}
        </div>

        {tab === "trips" ? (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search trips or countries..."
                aria-label="Search trips"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
              {tripMatches.map((m) => {
                const added = m.tripId ? existing.has(m.tripId) : false;
                return (
                  <button
                    key={m.key}
                    type="button"
                    disabled={added || saving}
                    onClick={() => void commit(m.draft)}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl border border-rosa/20 p-2.5 text-left transition-colors",
                      added
                        ? "opacity-50"
                        : "hover:border-primary/40 hover:bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-lg",
                        stampGradient(m.draft.country),
                      )}
                    >
                      {m.draft.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-semibold text-foreground">
                        {m.draft.label}
                      </span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {m.sub}
                      </span>
                    </span>
                    {added ? (
                      <Check className="h-4 w-4 shrink-0 text-primary" />
                    ) : (
                      <Plus className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    )}
                  </button>
                );
              })}
              {tripMatches.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No trips match. Try the “Add a country” tab.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Country</Label>
              <Input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="e.g. Portugal"
                list="passport-known-countries"
                className="h-9"
              />
              <datalist id="passport-known-countries">
                {KNOWN_COUNTRIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">City (optional)</Label>
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="e.g. Lisbon"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Year</Label>
                <select
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                >
                  {YEAR_OPTIONS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Note (optional)</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A favorite memory from this trip..."
                className="h-9"
                maxLength={140}
              />
            </div>

            {/* Live preview */}
            {country.trim() && (
              <div className="flex items-center gap-3 rounded-xl border border-rosa/20 bg-card/60 p-2.5">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br text-lg",
                    stampGradient(country.trim()),
                  )}
                >
                  {stampFlag(country.trim())}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-foreground">
                    {city.trim() ? `${city.trim()}, ${country.trim()}` : country.trim()}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <MapPin className="h-2.5 w-2.5" />
                    {year}
                  </span>
                </span>
              </div>
            )}

            <Button
              onClick={commitCustom}
              disabled={!country.trim() || saving}
              className="w-full border-0 bg-gradient-to-r from-[#FF0099] to-[#B51760] text-white shadow-[0_4px_14px_rgb(255_0_153/0.3)] hover:brightness-110"
            >
              {saving ? "Adding..." : "Add stamp"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
