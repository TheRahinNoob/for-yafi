"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, update, onDisconnect, onValue } from "firebase/database";
import { getDeviceInfo, DeviceInfo } from "@/lib/deviceDetector";

type Props = {
  sessionId: string;
};

type Coords = {
  lat: number;
  lng: number;
  accuracy: number;
};

type NetworkInfo = {
  type?: string;
  downlink?: number;
  rtt?: number;

  ipInfo?: {
    ip?: string;
    city?: string;
    region?: string;
    country?: string;
    org?: string; // ISP
  };
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
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

  /* -----------------------------
     INIT
  ------------------------------*/
  useEffect(() => {
    if (!sessionId || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    let mounted = true;

    /* -----------------------------
       DEVICE INFO
    ------------------------------*/
    (async () => {
      const info = await getDeviceInfo();
      setDevice(info);

      update(sessionRef, { device: info });
    })();

    /* -----------------------------
       NETWORK INFO (BASIC)
    ------------------------------*/
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
    update(sessionRef, { network: baseNetwork });

    /* -----------------------------
       🌍 ISP + CITY + COUNTRY (FIXED)
    ------------------------------*/
    const fetchIPInfo = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        const ipInfo = {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country_name,
          org: data.org, // ISP
        };

        setNetwork((prev) => {
          const updated = {
            ...prev,
            ipInfo,
          };

          update(sessionRef, {
            network: updated,
          });

          return updated;
        });
      } catch (err) {
        console.log("IP API failed:", err);
      }
    };

    fetchIPInfo();

    /* -----------------------------
       BATTERY INFO
    ------------------------------*/
    const nav = navigator as any;

    if (nav.getBattery) {
      nav.getBattery().then((bat: any) => {
        const updateBattery = () => {
          const info: BatteryInfo = {
            level: bat.level,
            charging: bat.charging,
          };

          setBattery(info);
          update(sessionRef, { battery: info });
        };

        updateBattery();

        bat.addEventListener("levelchange", updateBattery);
        bat.addEventListener("chargingchange", updateBattery);
      });
    }

    /* -----------------------------
       PRESENCE SYSTEM
    ------------------------------*/
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

    /* -----------------------------
       HEARTBEAT
    ------------------------------*/
    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();

      try {
        await update(sessionRef, { heartbeat: start });

        const latency = Date.now() - start;
        setPing(latency);

        update(sessionRef, {
          pingMs: latency,
          lastSeen: Date.now(),
        });
      } catch {
        setPing(999);
      }
    }, 8000);

    /* -----------------------------
       GPS TRACKING
    ------------------------------*/
    const handleSuccess = (pos: GeolocationPosition) => {
      const now = Date.now();

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      if (isNaN(lat) || isNaN(lng)) return;
      if (now - lastGpsUpdate.current < 2000) return;

      lastGpsUpdate.current = now;

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

    /* -----------------------------
       CLEANUP
    ------------------------------*/
    return () => {
      mounted = false;

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

  /* -----------------------------
     UI (DEBUG)
  ------------------------------*/
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

      {/* 🌍 IP + ISP + CITY */}
      {network?.ipInfo && (
        <div style={{ marginTop: 10 }}>
          <p>IP: {network.ipInfo.ip}</p>
          <p>City: {network.ipInfo.city}</p>
          <p>Country: {network.ipInfo.country}</p>
          <p>ISP: {network.ipInfo.org}</p>
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
          Battery: {Math.round((battery.level || 0) * 100)}%{" "}
          {battery.charging ? "⚡ charging" : ""}
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