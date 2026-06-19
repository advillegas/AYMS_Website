"use client";

/**
 * Single-pin map for an event's location (react-leaflet + OpenStreetMap, no
 * API key). Loaded client-only via next/dynamic({ ssr: false }) because
 * Leaflet touches `window` at import time.
 */

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Brand teardrop pin drawn inline (no external marker image, no globals edit).
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

export interface EventMapProps {
  lat: number;
  lng: number;
  title: string;
  location?: string;
}

export default function EventMap({ lat, lng, title, location }: EventMapProps) {
  return (
    <div className="relative z-0 isolate h-56 w-full overflow-hidden rounded-xl border border-rosa/20">
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[lat, lng]} icon={pinIcon}>
          <Popup>
            <div className="space-y-1">
              <p className="text-sm font-semibold leading-snug text-foreground">{title}</p>
              {location && <p className="text-xs text-muted-foreground">{location}</p>}
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
