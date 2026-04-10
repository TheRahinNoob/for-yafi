"use client";

import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ---------------------------
   Fix Leaflet marker icons
---------------------------- */
delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ---------------------------
   Smooth Recenter Component
---------------------------- */
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), {
      animate: true,
      duration: 0.5,
    });
  }, [lat, lng, map]);

  return null;
}

/* ---------------------------
   Main Map Component
---------------------------- */
export default function LiveMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
}) {
  const [mounted, setMounted] = useState(false);

  // ✅ Always run hooks (NO conditional hooks)
  const center = useMemo<[number, number]>(() => [lat, lng], [lat, lng]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%" }}>
      {mounted ? (
        <MapContainer
          center={center}
          zoom={16}
          style={{ width: "100%", height: "100%" }}
          scrollWheelZoom={true}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />

          <RecenterMap lat={lat} lng={lng} />

          <Marker position={center}>
            <Popup>📍 Live Location</Popup>
          </Marker>
        </MapContainer>
      ) : (
        /* 🧊 Skeleton (prevents crash + looks smooth) */
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0b1220",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#94a3b8",
            fontSize: 14,
          }}
        >
          Loading map...
        </div>
      )}
    </div>
  );
}