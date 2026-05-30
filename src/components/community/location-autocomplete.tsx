"use client";

/**
 * Location autocomplete with debounced Nominatim search.
 *
 * Renders an input + dropdown of matching locations. As the user
 * types, queries the free OpenStreetMap Nominatim API (no API key
 * required) and surfaces verified addresses, cities, and zip codes
 * with their coordinates. Selecting a result fires `onSelect` with
 * a {label, lat, lng} payload — every location is geocoded so
 * downstream filters (geo channels, event radius, #local chat) can
 * trust the coordinates.
 */

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
  type?: string;
  class?: string;
}

export interface LocationResult {
  label: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  /** Called when the user picks a result from the dropdown. */
  onSelect: (result: LocationResult) => void;
  /** Initial / current text in the input. Optional. */
  initialValue?: string;
  /** Reset the input to empty after a successful selection. Default true. */
  clearOnSelect?: boolean;
  placeholder?: string;
  /** Tailwind class merged onto the wrapping div. */
  className?: string;
  /** Smaller, denser styling for inline grids / channel dialogs. */
  compact?: boolean;
  /** Optional debounce in ms. Defaults to 300. */
  debounceMs?: number;
  /** Limit on how many suggestions show. Defaults to 6. */
  limit?: number;
  /** Disable the input (parent-controlled). */
  disabled?: boolean;
}

/* Normalize a Nominatim display_name down to its first 3 segments
 * so the dropdown isn't dominated by deeply-nested "Cityville,
 * County, State, Country, Continent, Planet" labels. */
function shortLabel(displayName: string): string {
  return displayName.split(",").slice(0, 3).join(",").trim();
}

export function LocationAutocomplete({
  onSelect,
  initialValue = "",
  clearOnSelect = true,
  placeholder = "City, state, or zip code",
  className,
  compact = false,
  debounceMs = 300,
  limit = 6,
  disabled = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(initialValue);
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  // Tracks the in-flight request so a slow response from an older
  // query can't overwrite the dropdown after the user has typed more.
  const requestSeqRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced fetch loop. Re-runs every time the query changes.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    const seq = ++requestSeqRef.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          q: trimmed,
          format: "json",
          limit: String(limit),
          addressdetails: "0",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params}`,
          { headers: { "User-Agent": "AYMS-Community/1.0" } },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as NominatimResult[];
        // Bail if a newer query has been issued in the meantime.
        if (seq !== requestSeqRef.current) return;
        const mapped: LocationResult[] = data.map((r) => ({
          label: shortLabel(r.display_name),
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        }));
        setResults(mapped);
        setOpen(mapped.length > 0);
        setHighlight(0);
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        console.warn("[location-autocomplete] search failed", err);
        setResults([]);
        setOpen(false);
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, limit]);

  // Click-outside dismissal so the dropdown doesn't follow the user
  // around the page.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function handleSelect(result: LocationResult) {
    onSelect(result);
    if (clearOnSelect) setQuery("");
    else setQuery(result.label);
    setResults([]);
    setOpen(false);
    setHighlight(0);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) {
      if (e.key === "Escape") {
        setOpen(false);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = results[highlight];
      if (item) handleSelect(item);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <MapPin
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none",
            compact ? "h-3.5 w-3.5" : "h-4 w-4",
          )}
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (results.length > 0) setOpen(true);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "pl-8 pr-8",
            compact ? "h-8 text-xs" : "h-9 text-sm",
          )}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls="location-autocomplete-listbox"
        />
        {(loading || query) && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {loading && (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground/70" />
            )}
            {query && !loading && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                  inputRef.current?.focus();
                }}
                className="rounded-full p-0.5 text-muted-foreground/70 hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Clear"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
      {open && results.length > 0 && (
        <ul
          id="location-autocomplete-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border border-rosa/30 bg-card shadow-lg py-1"
        >
          {results.map((r, i) => (
            <li
              key={`${r.lat},${r.lng},${i}`}
              role="option"
              aria-selected={i === highlight}
              className={cn(
                "flex items-start gap-2 px-2.5 py-1.5 cursor-pointer text-xs",
                i === highlight
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/60",
              )}
              onMouseEnter={() => setHighlight(i)}
              onMouseDown={(e) => {
                // mousedown (not click) to fire before the input loses
                // focus and the click-outside handler closes the menu.
                e.preventDefault();
                handleSelect(r);
              }}
            >
              <MapPin className="h-3 w-3 mt-0.5 text-muted-foreground/70 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{r.label}</div>
                <div className="text-[10px] text-muted-foreground/80 tabular-nums">
                  {r.lat.toFixed(3)}, {r.lng.toFixed(3)}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
