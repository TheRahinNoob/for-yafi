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
  org?: string;
  source?: string;
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
};

type NetworkInfo = {
  type?: string;
  downlink?: number;
  rtt?: number;
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

  /* ---------------- FETCH WITH TIMEOUT ---------------- */
  const fetchWithTimeout = async (url: string, timeout = 7000): Promise<any> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  };

  /* ---------------- SUPER ISP DETECTION (Detects ALL BD ISPs) ---------------- */
  const fetchISP = async (): Promise<IPInfo | null> => {
    console.info("🔍 Starting advanced ISP detection for Bangladesh...");

    const apis = [
      { url: "https://ip-api.com/json/", name: "ip-api.com" },
      { url: "https://freeipapi.com/json/", name: "freeipapi.com" },
      { url: "https://ipbase.com/json", name: "ipbase.com" },
      { url: "https://api.bigdatacloud.net/data/client-info", name: "bigdatacloud" },
      { url: "https://ipapi.co/json/", name: "ipapi.co" },
      { url: "https://ipwho.is/", name: "ipwho.is" },
    ];

    for (const api of apis) {
      try {
        const data = await fetchWithTimeout(api.url);

        let ispName = null;

        if (data.isp) ispName = data.isp;
        else if (data.org) ispName = data.org;
        else if (data.connection?.isp) ispName = data.connection.isp;
        else if (data.provider) ispName = data.provider;
        else if (data.network?.name) ispName = data.network.name;
        else if (data.asn?.name) ispName = data.asn.name;

        if (ispName && typeof ispName === "string" && ispName.length > 3) {
          console.info(`✅ ISP detected via ${api.name}:`, ispName);

          return {
            ip: data.query || data.ip || data.ipAddress || "Unknown",
            city: data.city || data.cityName || data.location?.city,
            region: data.regionName || data.region || data.location?.region,
            country: data.country || data.country_name || data.location?.country,
            org: ispName,
            source: api.name,
          };
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`${api.name} failed:`, errorMessage);
      }
    }

    console.warn("⚠️ All ISP APIs failed - could not detect ISP");
    return null;
  };

  /* ---------------- INIT ---------------- */
  useEffect(() => {
    if (!sessionId || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    /* ---------------- DEVICE ---------------- */
    (async () => {
      const info = await getDeviceInfo();
      setDevice(info);
      update(sessionRef, { device: info });
    })();

    /* ---------------- NETWORK BASE ---------------- */
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

    update(sessionRef, {
      "network/type": baseNetwork.type ?? null,
      "network/downlink": baseNetwork.downlink ?? null,
      "network/rtt": baseNetwork.rtt ?? null,
    });

    /* ---------------- ISP DETECTION ---------------- */
    const runISP = async () => {
      const ipInfo = await fetchISP();
      if (!ipInfo) return;

      setNetwork((prev) => ({ ...prev, ipInfo }));

      update(sessionRef, {
        "network/ipInfo": ipInfo,
      });
    };

    runISP();

    /* ---------------- BATTERY ---------------- */
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

    /* ---------------- PRESENCE ---------------- */
    const unsubscribe = onValue(connectedRef, (snap) => {
      const connected = snap.val();

      if (connected) {
        update(sessionRef, {
          status: "online",
          lastSeen: Date.now(),
        });

        onDisconnect(sessionRef).update({
          status: "offline",
          lastSeen: Date.now(),
        });

        setStatus("online");
      } else {
        setStatus("offline");
      }
    });

    /* ---------------- HEARTBEAT ---------------- */
    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();
      try {
        await update(sessionRef, { heartbeat: start });
        const latency = Date.now() - start;
        setPing(latency);
        update(sessionRef, { pingMs: latency, lastSeen: Date.now() });
      } catch {
        setPing(999);
      }
    }, 8000);

    /* ---------------- GPS ---------------- */
    const handleSuccess = (pos: GeolocationPosition) => {
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
    };

    const handleError = () => setStatus("offline");

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    /* ---------------- CLEANUP ---------------- */
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
      update(sessionRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId]);

  /* ---------------- UI ---------------- */
  return (
    <div style={styles.container}>
      <h3>📡 Live Sender</h3>
      <p>Status: {status}</p>
      <p>Ping: {ping} ms</p>

      {coords && (
        <p>
          GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      )}

      {network?.ipInfo && (
        <div style={{ marginTop: 10 }}>
          <p>IP: {network.ipInfo.ip}</p>
          <p>City: {network.ipInfo.city}</p>
          <p>Country: {network.ipInfo.country}</p>
          <p style={{ fontWeight: 600 }}>ISP: {network.ipInfo.org}</p>
          <p style={{ opacity: 0.6 }}>Source: {network.ipInfo.source}</p>
        </div>
      )}

      {device && (
        <p>
          Device: {device.brand} {device.model}
        </p>
      )}

      {network && (
        <p>
          Network: {network.type} | {network.downlink}Mbps
        </p>
      )}

      {battery && (
        <p>
          Battery: {Math.round((battery.level || 0) * 100)}%
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
  },
};