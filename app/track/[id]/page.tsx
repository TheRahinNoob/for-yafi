/**
 * ██████████████████████████████████████████████████████████████
 * TRACKER PAGE – LIVE SESSION VIEW (v3.0 – Fully Adapted)
 * 
 * Now shows:
 *   • On mobile data → SIM provider name (Grameenphone, Robi, etc.)
 *   • On WiFi → WiFi broadband ISP name (BTCL, Fiber@Home, etc.)
 *   • Clear confidence + method so you always know what happened
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
});

/* ---------------- TYPES ---------------- */

type Pos = {
  lat: number;
  lng: number;
};

type DeviceInfo = {
  model?: string;
  brand?: string;
  os?: string;
  browser?: string;
  type?: string;
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
};

type IPInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string;
  source?: string;
};

type NetworkInfo = {
  type?: string;
  downlink?: number;
  rtt?: number;
  ipInfo?: IPInfo;
};

type SimInfo = {
  carrier?: string;      // can be SIM name OR WiFi ISP name
  confidence?: number;
  method?: string;
};

type SessionData = {
  lat?: number;
  lng?: number;
  status?: "online" | "offline";
  lastSeen?: number;
  timestamp?: number;
  pingMs?: number;
  accuracy?: number;
  device?: DeviceInfo;
  battery?: BatteryInfo;
  network?: NetworkInfo;
  sim?: SimInfo;
};

/* ---------------- PAGE ---------------- */

export default function TrackPage() {
  const { id } = useParams() as { id: string };

  const [pos, setPos] = useState<Pos | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "loading">("loading");

  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [sim, setSim] = useState<SimInfo | null>(null);

  /* ---------------- FIREBASE LISTENER ---------------- */
  useEffect(() => {
    if (!id) return;

    const sessionRef = ref(db, `sessions/${id}`);

    const unsubscribe = onValue(sessionRef, (snap) => {
      const data = snap.val() as SessionData | null;

      if (!data) {
        setStatus("offline");
        setPos(null);
        return;
      }

      if (typeof data.lat === "number" && typeof data.lng === "number") {
        setPos({ lat: data.lat, lng: data.lng });
      }

      const last = data.lastSeen ?? data.timestamp ?? null;
      if (typeof last === "number") setLastSeen(last);

      if (typeof data.pingMs === "number") setPing(data.pingMs);
      if (typeof data.accuracy === "number") setAccuracy(data.accuracy);

      setDevice(data.device ?? null);
      setBattery(data.battery ?? null);
      setNetwork(data.network ?? null);
      setSim(data.sim ?? null);

      const now = Date.now();
      const lastTime = typeof last === "number" ? last : 0;
      const isOffline = data.status === "offline" || now - lastTime > 25000;

      setStatus(isOffline ? "offline" : "online");
    });

    return () => unsubscribe();
  }, [id]);

  /* ---------------- HELPERS ---------------- */
  const ipInfo = network?.ipInfo ?? null;

  const getStrength = () => {
    if (status !== "online") return 0;
    let score = 100;
    if (ping !== null) {
      if (ping > 400) score -= 50;
      else if (ping > 250) score -= 35;
      else if (ping > 150) score -= 20;
      else if (ping > 80) score -= 10;
    }
    if (accuracy !== null) {
      if (accuracy > 150) score -= 40;
      else if (accuracy > 80) score -= 25;
      else if (accuracy > 40) score -= 10;
    }
    if (lastSeen) {
      const diff = Date.now() - lastSeen;
      if (diff > 15000) score -= 25;
      if (diff > 30000) score -= 45;
    }
    return Math.max(0, Math.min(100, score));
  };

  const strength = getStrength();

  const formatLastSeen = () => {
    if (!lastSeen) return "unknown";
    const diff = Date.now() - lastSeen;
    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min} min ago`;
    return `${hr} hr ago`;
  };

  /* ---------------- LOADING STATE ---------------- */
  if (!pos) {
    return (
      <div style={styles.loading}>
        <h2>📡 Waiting for location data...</h2>
        <p>Session ID: {id}</p>
        <p style={{ opacity: 0.6, marginTop: 10 }}>
          Make sure Sender is running on the target device
        </p>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div style={styles.page}>
      {/* LEFT PANEL - MAP */}
      <div style={styles.leftPanel}>
        <div style={styles.mapBox}>
          <LiveMap lat={pos.lat} lng={pos.lng} />
        </div>

        <div style={styles.infoStack}>
          <div style={styles.card}>
            <p>Status</p>
            <h3 style={{ color: status === "online" ? "#22c55e" : "#ef4444" }}>
              {status.toUpperCase()}
            </h3>
          </div>

          <div style={styles.card}>
            <p>Latitude</p>
            <h3>{pos.lat.toFixed(6)}</h3>
            <p style={{ marginTop: 10 }}>Longitude</p>
            <h3>{pos.lng.toFixed(6)}</h3>
          </div>

          <div style={styles.card}>
            <p>Last Seen</p>
            <h3>{formatLastSeen()}</h3>
          </div>

          <div style={styles.card}>
            <p>Ping</p>
            <h3>{ping !== null ? `${ping} ms` : "—"}</h3>
          </div>

          <div style={styles.card}>
            <p>Connection Strength</p>
            <h3 style={{ color: strength > 70 ? "#22c55e" : strength > 40 ? "#facc15" : "#ef4444" }}>
              {strength}%
            </h3>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - DASHBOARD */}
      <div style={styles.rightPanel}>
        <h2>📊 Live Dashboard</h2>
        <p style={{ opacity: 0.7, marginBottom: 20 }}>Session ID: {id}</p>

        {/* DEVICE INFO */}
        <div style={styles.cardRight}>
          <h3>📱 Device Info</h3>
          {device ? (
            <>
              <p style={{ fontSize: 18, fontWeight: 600 }}>
                {device.brand ?? "Unknown"} {device.model ?? ""}
              </p>
              <p>{device.os ?? "Unknown OS"} • {device.browser ?? "Unknown"}</p>
              <p style={{ opacity: 0.6 }}>Type: {device.type ?? "Unknown"}</p>

              <div style={styles.subSection}>
                <p>
                  🔋 Battery:{" "}
                  {battery?.level !== undefined ? `${Math.round(battery.level * 100)}%` : "Unknown"}
                  {battery?.charging ? " ⚡ Charging" : ""}
                </p>
              </div>
            </>
          ) : (
            <p>Loading device info...</p>
          )}
        </div>

        {/* NETWORK + ISP */}
        <div style={styles.cardRight}>
          <h3>🌐 Network & ISP</h3>
          {network ? (
            <>
              <p>Connection Type: {network.type ?? "unknown"}</p>
              <p>Speed: {network.downlink ?? "?"} Mbps</p>
              <p>RTT: {network.rtt ?? "?"} ms</p>

              <div style={styles.subSection}>
                <p style={{ fontWeight: 600 }}>🌍 ISP Information</p>
                <p><strong>ISP:</strong> {ipInfo?.org ?? "Detecting..."}</p>
                <p><strong>City:</strong> {ipInfo?.city ?? "Unknown"}</p>
                <p><strong>Region:</strong> {ipInfo?.region ?? "Unknown"}</p>
                <p><strong>Country:</strong> {ipInfo?.country ?? "Unknown"}</p>
                {ipInfo?.source && <p style={{ opacity: 0.6, fontSize: 13 }}>Detected via: {ipInfo.source}</p>}
              </div>
            </>
          ) : (
            <p>Loading network info...</p>
          )}
        </div>

        {/* INTERNET PROVIDER (SIM or WiFi ISP) */}
        <div style={styles.cardRight}>
          <h3>🌐 Internet Provider</h3>
          {sim && sim.carrier ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
                {sim.carrier}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
                <div style={{
                  background: (sim.confidence ?? 0) > 60 ? "#22c55e" : (sim.confidence ?? 0) > 30 ? "#eab308" : "#ef4444",
                  color: "white",
                  padding: "4px 12px",
                  borderRadius: 999,
                  fontSize: 14,
                  fontWeight: 600
                }}>
                  Confidence: {sim.confidence ?? 0}%
                </div>
              </div>

              {sim.method && (
                <p style={{ marginTop: 12, fontSize: 13, opacity: 0.75, wordBreak: "break-all" }}>
                  Method: <span style={{ fontFamily: "monospace" }}>{sim.method}</span>
                </p>
              )}

              <div style={styles.subSection}>
                <p style={{ fontSize: 13, opacity: 0.7 }}>
                  {sim.method?.includes("wifi") 
                    ? "📶 Connected via WiFi – showing broadband ISP name" 
                    : "📱 Connected via Mobile Data – showing SIM provider"}
                </p>
              </div>
            </>
          ) : (
            <p>Waiting for provider detection...</p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const styles: Record<string, React.CSSProperties> = {
  page: { display: "flex", height: "100vh", background: "#0b1220", color: "white", padding: 16, gap: 20 },
  leftPanel: { width: 340, display: "flex", flexDirection: "column", gap: 12 },
  mapBox: { width: 340, height: 340, borderRadius: 16, overflow: "hidden", border: "1px solid #1f2937" },
  infoStack: { display: "flex", flexDirection: "column", gap: 10 },
  rightPanel: { flex: 1, padding: 24, background: "#111827", borderRadius: 16, overflowY: "auto" },
  card: { padding: 14, borderRadius: 12, background: "#1f2937" },
  cardRight: { marginTop: 20, padding: 18, borderRadius: 12, background: "#1f2937" },
  subSection: { marginTop: 12, paddingTop: 12, borderTop: "1px solid #374151" },
  loading: { height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", background: "#0b1220", color: "white", textAlign: "center" },
};