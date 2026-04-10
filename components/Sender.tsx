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
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
};

type IpInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  org?: string; // ISP
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
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);

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
       NETWORK INFO (LIVE)
    ------------------------------*/
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    const pushNetwork = () => {
      if (!conn) return;

      const net: NetworkInfo = {
        type: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      };

      setNetwork(net);
      update(sessionRef, { network: net });
    };

    if (conn) {
      pushNetwork();
      conn.addEventListener?.("change", pushNetwork);
    }

    /* -----------------------------
       BATTERY INFO (SAFE + CLEAN)
    ------------------------------*/
    const nav = navigator as any;
    let batteryObj: any = null;

    const pushBattery = () => {
      if (!batteryObj) return;

      const info: BatteryInfo = {
        level: batteryObj.level,
        charging: batteryObj.charging,
      };

      setBattery(info);
      update(sessionRef, { battery: info });
    };

    if (nav.getBattery) {
      nav.getBattery().then((bat: any) => {
        batteryObj = bat;

        pushBattery();

        bat.addEventListener("levelchange", pushBattery);
        bat.addEventListener("chargingchange", pushBattery);
      });
    }

    /* -----------------------------
       IP + ISP + CITY (REAL)
    ------------------------------*/
    (async () => {
      try {
        const res = await fetch("https://ipapi.co/json/");
        const data = await res.json();

        const info: IpInfo = {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country_name,
          org: data.org, // ISP
        };

        setIpInfo(info);

        update(sessionRef, {
          ipInfo: info,
        });
      } catch (err) {
        console.log("IP fetch failed", err);
      }
    })();

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
       HEARTBEAT / PING
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

      if (conn?.removeEventListener) {
        conn.removeEventListener("change", pushNetwork);
      }

      update(sessionRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId]);

  /* -----------------------------
     DEBUG UI
  ------------------------------*/
  return (
    <div style={styles.container}>
      <h3>📡 Sender Active</h3>

      <p>Status: {status}</p>
      <p>Ping: {ping} ms</p>

      {coords && (
        <p>
          GPS: {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
        </p>
      )}

      {ipInfo && (
        <p>
          🌍 {ipInfo.city}, {ipInfo.country} | ISP: {ipInfo.org}
        </p>
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
  },
};