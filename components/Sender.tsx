/**
 * ██████████████████████████████████████████████████████████████
 * SENDER COMPONENT – LIVE TRACKER (v3.0 – Fully Integrated)
 * 
 * Fully compatible with the fixed deviceDetector.ts (v3.0)
 * • All device details (including fixed WebGL GPU detection) are captured
 * • Automatically sent to Firebase
 * • Connection hints (cellular/wifi/4g/5g) are passed to /api/isp
 * 
 * WiFi Behaviour:   → SIM detection confidence = very low
 * Mobile Data Behaviour: → High confidence + correct carrier name
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, update, onDisconnect, onValue } from "firebase/database";
import { getDeviceInfo, DeviceInfo } from "@/lib/deviceDetector";

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
};

type NetworkInfo = {
  type?: string;
  downlink?: number;
  rtt?: number;
  isp?: string;
  ipInfo?: IPInfo;
};

type Props = {
  sessionId: string;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdate = useRef<number>(0);

  const sessionRef = ref(db, `sessions/${sessionId}`);
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

  /* ---------------- FETCH ISP + SIM WITH CONNECTION HINTS ---------------- */
  const fetchNetworkData = async (connectionType = "unknown", effectiveType = "unknown") => {
    try {
      const params = new URLSearchParams({
        connectionType,
        effectiveType,
      }).toString();

      const res = await fetch(`/api/isp?${params}`, {
        cache: "no-store",
      });

      if (!res.ok) throw new Error("ISP API failed");
      return await res.json();
    } catch (err) {
      console.error("ISP fetch failed:", err);
      return null;
    }
  };

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!sessionId || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    /* DEVICE INFO – FULL INTEGRATION WITH FIXED deviceDetector.ts */
    (async () => {
      try {
        const info = await getDeviceInfo();
        setDevice(info);
        update(sessionRef, { device: info });
      } catch (err) {
        console.error("Device info capture failed:", err);
      }
    })();

    /* NETWORK BASE INFO (Connection API) */
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    const baseNetwork: NetworkInfo = conn
      ? {
          type: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
        }
      : {};

    setNetwork(baseNetwork);

    /* ISP + SIM DETECTION (with WiFi/Mobile hints) */
    const runNetwork = async () => {
      const data = await fetchNetworkData(
        conn?.type || "unknown",
        conn?.effectiveType || "unknown"
      );

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

      update(sessionRef, {
        network: net,
        sim: simData,
      });
    };

    runNetwork();

    /* BATTERY */
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((bat: any) => {
        const pushBattery = () => {
          const info: BatteryInfo = {
            level: bat.level,
            charging: bat.charging,
          };
          setBattery(info);
          update(sessionRef, { battery: info });
        };
        pushBattery();
        bat.addEventListener("levelchange", pushBattery);
        bat.addEventListener("chargingchange", pushBattery);
      });
    }

    /* PRESENCE + HEARTBEAT + GPS */
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

        setCoords({ lat, lng, accuracy });
        setStatus("online");

        update(sessionRef, {
          lat,
          lng,
          accuracy,
          timestamp: now,
          lastSeen: now,
          status: "online",
        });
      },
      () => setStatus("offline"),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    /* CLEANUP */
    return () => {
      if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      update(sessionRef, { status: "offline", lastSeen: Date.now() });
    };
  }, [sessionId]);

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.container}>
      <h3>📡 Live Sender (v3.0)</h3>

      <p>Status: <strong>{status}</strong></p>
      <p>Ping: {ping} ms</p>

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
          <p style={{ fontWeight: 600 }}>
            ISP: {network.isp}
          </p>
        </div>
      )}

      {sim && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600 }}>
            📶 SIM: {sim.carrier || "Unknown"}
          </p>
          <p style={{ opacity: 0.7 }}>
            Confidence: {sim.confidence}% 
            {sim.method && <span style={{ fontSize: "0.8em", marginLeft: 8 }}>({sim.method})</span>}
          </p>
        </div>
      )}

      {device && (
        <div style={{ marginTop: 12 }}>
          <p>
            📱 Device: {device.brand} {device.model}
          </p>
          {device.os && <p>OS: {device.os} {device.osVersion}</p>}
          {device.browser && <p>Browser: {device.browser}</p>}
        </div>
      )}

      {network && (
        <p>
          📡 Network: {network.type} | {network.downlink} Mbps
        </p>
      )}

      {battery && (
        <p>
          🔋 Battery: {Math.round((battery.level || 0) * 100)}%
          {battery.charging ? " ⚡ charging" : ""}
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 16,
    background: "#0f172a",
    color: "white",
    borderRadius: 12,
    maxWidth: 420,
    margin: "20px auto",
    fontFamily: "sans-serif",
    lineHeight: 1.5,
  },
};