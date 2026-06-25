"use client";

/**
 * Branded US "chapters" map — adapts the AYMS regional graphic into the
 * site's palette. Leaflet renders the lower-48 state outlines from a
 * vendored GeoJSON with NO tile layer (so it reads as flat line-art on a
 * blush canvas, not a street map). Each region is a magenta pill that
 * links to that chapter's Instagram.
 *
 * Loaded client-only via next/dynamic({ ssr: false }) — Leaflet touches
 * `window` at import.
 */

import { useEffect, useState } from "react";
import { MapContainer, GeoJSON, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { FeatureCollection } from "geojson";

export interface ChapterRegion {
  id: string;
  /** Short label shown on the map pill (e.g. "SoCal"). */
  short: string;
  /** Instagram handle without the @. */
  ig: string;
  /** [lng, lat] label anchor. */
  coordinates: [number, number];
}

// Continental US bounds so Alaska/Hawaii don't shrink the view.
const CONUS_BOUNDS: [[number, number], [number, number]] = [
  [24.4, -125.0],
  [49.4, -66.9],
];

const STATE_STYLE = {
  color: "#B51760",
  weight: 1,
  fillColor: "#FAD3E7",
  fillOpacity: 0.45,
} as const;

function regionPill(label: string): L.DivIcon {
  const html =
    `<span style="display:inline-block;transform:translate(-50%,-50%);` +
    `background:#FAD3E7;color:#B51760;font-weight:700;font-size:11px;line-height:1;` +
    `padding:5px 10px;border-radius:9999px;border:1px solid #fff;` +
    `box-shadow:0 2px 8px rgba(181,23,96,.30);white-space:nowrap;cursor:pointer;` +
    `font-family:ui-sans-serif,system-ui,sans-serif">${label}</span>`;
  return L.divIcon({
    className: "ayms-region-pill",
    html,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export interface ChaptersMapProps {
  regions: ChapterRegion[];
  onSelect?: (id: string) => void;
}

export default function ChaptersMap({ regions, onSelect }: ChaptersMapProps) {
  const [geo, setGeo] = useState<FeatureCollection | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/data/us-states.json")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setGeo(d as FeatureCollection);
      })
      .catch(() => {
        /* map degrades to pills-only on a blank canvas */
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="relative z-0 isolate w-full overflow-hidden rounded-3xl border border-rosa/25 bg-[#FFF1F8] shadow-sm">
      <div className="aspect-[4/3] w-full sm:aspect-[16/9]">
        <MapContainer
          bounds={CONUS_BOUNDS}
          style={{ height: "100%", width: "100%", background: "#FFF1F8" }}
          dragging={false}
          doubleClickZoom={false}
          scrollWheelZoom={false}
          touchZoom={false}
          boxZoom={false}
          keyboard={false}
          zoomControl={false}
          attributionControl={false}
        >
          {geo && (
            <GeoJSON
              data={geo}
              style={() => STATE_STYLE}
              interactive={false}
              key="us-states"
              filter={(feature) => {
                // Drop AK/HI/territories so the lower-48 fills the frame.
                const name = (feature?.properties as { name?: string } | undefined)?.name;
                return name !== "Alaska" && name !== "Hawaii" && name !== "Puerto Rico";
              }}
            />
          )}
          {regions.map((r) => (
            <Marker
              key={r.id}
              position={[r.coordinates[1], r.coordinates[0]]}
              icon={regionPill(r.short)}
              eventHandlers={{
                click: () => {
                  onSelect?.(r.id);
                  if (typeof window !== "undefined") {
                    window.open(
                      `https://instagram.com/${r.ig}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }
                },
              }}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
