"use client";

/**
 * Interactive multi-pin map for the unified events feed (react-leaflet +
 * OpenStreetMap tiles — no API key, same OSM stack as the geocoder).
 *
 * Renders a brand-magenta pin for every event/meetup that has resolved
 * coordinates. An optional `origin` (the viewer's searched or current
 * location) is shown as a distinct blue dot and drives "x mi away" in each
 * popup; when `focus` changes the map flies there so location search and
 * "use my location" recenter the view. Clicking a pin hands the event back
 * to the page, which owns the detail dialog.
 *
 * Loaded client-only via next/dynamic({ ssr: false }) because Leaflet
 * touches `window` at import time.
 */

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format, parseISO, isValid } from "date-fns";
import { Navigation } from "lucide-react";
import { haversineDistance, type GeoCoord } from "@/lib/geo";
import type { CalendarEvent } from "@/lib/events-data";

/* ------------------------------------------------------------------ */
/* Pins                                                                */
/* ------------------------------------------------------------------ */

// Teardrop pin drawn with inline styles (raw Leaflet divIcon HTML isn't
// seen by Tailwind's scanner) so it needs no external marker image.
const PIN_HTML =
  '<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;' +
  "transform:rotate(-45deg);background:linear-gradient(135deg,#FF0099,#B51760);" +
  'box-shadow:0 2px 6px rgba(181,23,96,.5);border:2px solid #fff"></span>';

const pinIcon = L.divIcon({
  className: "ayms-event-pin",
  html: PIN_HTML,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

// Pulsing blue dot for the viewer's own/searched location.
const ORIGIN_HTML =
  '<span style="display:block;width:16px;height:16px;border-radius:50%;' +
  "background:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.25),0 0 0 8px rgba(37,99,235,.12);" +
  'border:2px solid #fff"></span>';

const originIcon = L.divIcon({
  className: "ayms-origin-pin",
  html: ORIGIN_HTML,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [44, 44], maxZoom: 13 });
  }, [map, points]);
  return null;
}

/** Flies the map to `focus` whenever it changes (search pick / locate me). */
function Recenter({ focus }: { focus: GeoCoord | null | undefined }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], 11, { duration: 0.8 });
  }, [map, focus]);
  return null;
}

const US_CENTER: [number, number] = [39.5, -98.35];

function prettyDate(date: string): string {
  if (!date) return "Date TBD";
  const d = parseISO(date);
  return isValid(d) ? format(d, "EEE, MMM d") : date;
}

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

export interface EventsMapProps {
  events: CalendarEvent[];
  /** Viewer's location for distance labels + a blue dot. */
  origin?: GeoCoord | null;
  /** Recenter target (changes on search / locate). */
  focus?: GeoCoord | null;
  onSelect: (e: CalendarEvent) => void;
  heightClass?: string;
}

export default function EventsMap({
  events,
  origin,
  focus,
  onSelect,
  heightClass = "h-[460px] sm:h-[560px]",
}: EventsMapProps) {
  const mappable = useMemo(
    () =>
      events.filter(
        (e): e is CalendarEvent & { lat: number; lng: number } =>
          e.lat != null && e.lng != null,
      ),
    [events],
  );

  const points = useMemo<Array<[number, number]>>(
    () => mappable.map((e) => [e.lat, e.lng]),
    [mappable],
  );

  const center: [number, number] = origin
    ? [origin.lat, origin.lng]
    : points[0] ?? US_CENTER;
  const initialZoom = origin || points.length ? 10 : 4;

  return (
    <div
      className={`relative z-0 isolate w-full overflow-hidden rounded-2xl border border-rosa/20 shadow-sm ${heightClass}`}
    >
      <MapContainer
        center={center}
        zoom={initialZoom}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* Only auto-fit when the viewer hasn't picked a focus point. */}
        {!focus && <FitBounds points={points} />}
        <Recenter focus={focus} />

        {origin && (
          <Marker position={[origin.lat, origin.lng]} icon={originIcon}>
            <Popup>
              <span className="text-xs font-medium">You are here</span>
            </Popup>
          </Marker>
        )}

        {mappable.map((e) => {
          const distance = origin
            ? haversineDistance(origin.lat, origin.lng, e.lat, e.lng)
            : null;
          return (
            <Marker key={e.id} position={[e.lat, e.lng]} icon={pinIcon}>
              <Popup>
                <div className="min-w-[12rem] space-y-1.5">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {e.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prettyDate(e.date)}
                    {e.startTime ? ` · ${e.startTime}` : ""}
                  </p>
                  {e.location && (
                    <p className="text-xs text-muted-foreground">{e.location}</p>
                  )}
                  {distance != null && (
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Navigation className="h-3 w-3" />
                      {distance < 1 ? "< 1 mi" : `${Math.round(distance)} mi away`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(e)}
                    className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#FF0099] to-[#B51760] px-3 py-1.5 text-xs font-semibold text-white transition hover:brightness-110"
                  >
                    View details &rarr;
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
