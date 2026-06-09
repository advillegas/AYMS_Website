"use client";

/**
 * Interactive map of member meetups (react-leaflet + OpenStreetMap tiles,
 * no API key — same OSM stack the geocoder uses). Renders a brand-pink pin
 * for every meetup that has resolved coordinates; clicking a pin opens a
 * popup with the essentials and a "View details" button that hands the
 * meetup back to the page (which owns the detail dialog).
 *
 * Loaded client-only via next/dynamic({ ssr: false }) from the meetups
 * page, because Leaflet touches `window` at import time.
 */

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format, parseISO, isValid } from "date-fns";
import { Navigation } from "lucide-react";
import { haversineDistance, type GeoCoord } from "@/lib/geo";
import type { Meetup } from "@/lib/use-meetups";

/* ------------------------------------------------------------------ */
/* Pin                                                                 */
/* ------------------------------------------------------------------ */

// Teardrop pin drawn with inline styles (raw Leaflet divIcon HTML isn't
// seen by Tailwind's scanner) so it needs no external marker image and
// no globals.css edit — and it matches the AYMS magenta palette.
const PIN_HTML =
  '<span style="display:block;width:20px;height:20px;border-radius:50% 50% 50% 0;' +
  "transform:rotate(-45deg);background:linear-gradient(135deg,#FF0099,#B51760);" +
  'box-shadow:0 2px 6px rgba(181,23,96,.5);border:2px solid #fff"></span>';

const pinIcon = L.divIcon({
  className: "ayms-meetup-pin",
  html: PIN_HTML,
  iconSize: [24, 24],
  iconAnchor: [12, 24],
  popupAnchor: [0, -24],
});

/* ------------------------------------------------------------------ */
/* Fit-to-markers helper                                               */
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

/* ------------------------------------------------------------------ */
/* Map                                                                 */
/* ------------------------------------------------------------------ */

const US_CENTER: [number, number] = [39.5, -98.35];

function prettyDate(date: string): string {
  if (!date) return "Date TBD";
  const d = parseISO(date);
  return isValid(d) ? format(d, "EEE, MMM d") : date;
}

export interface MeetupsMapProps {
  meetups: Meetup[];
  coords: GeoCoord | null;
  onSelect: (m: Meetup) => void;
}

export default function MeetupsMap({
  meetups,
  coords,
  onSelect,
}: MeetupsMapProps) {
  // Only meetups with resolved coordinates can be plotted.
  const mappable = useMemo(
    () =>
      meetups.filter(
        (m): m is Meetup & { lat: number; lng: number } =>
          m.lat != null && m.lng != null,
      ),
    [meetups],
  );

  const points = useMemo<Array<[number, number]>>(
    () => mappable.map((m) => [m.lat, m.lng]),
    [mappable],
  );

  // Initial view: the viewer's location if known, else the first meetup,
  // else the continental US. FitBounds refines this once markers mount.
  const center: [number, number] = coords
    ? [coords.lat, coords.lng]
    : points[0] ?? US_CENTER;
  const initialZoom = coords || points.length ? 10 : 4;

  return (
    <div className="relative z-0 isolate h-[460px] w-full overflow-hidden rounded-2xl border border-rosa/20 shadow-sm sm:h-[520px]">
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
        <FitBounds points={points} />
        {mappable.map((m) => {
          const distance =
            coords != null
              ? haversineDistance(coords.lat, coords.lng, m.lat, m.lng)
              : null;
          return (
            <Marker key={m.id} position={[m.lat, m.lng]} icon={pinIcon}>
              <Popup>
                <div className="min-w-[12rem] space-y-1.5">
                  <p className="text-sm font-semibold leading-snug text-foreground">
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {prettyDate(m.date)}
                    {m.startTime ? ` · ${m.startTime}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{m.location}</p>
                  {distance != null && (
                    <p className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Navigation className="h-3 w-3" />
                      {distance < 1 ? "< 1 mi" : `${Math.round(distance)} mi away`}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelect(m)}
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
