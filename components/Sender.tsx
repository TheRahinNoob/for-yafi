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

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdate = useRef<number>(0);
  const isMounted = useRef(true);

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
    isMounted.current = true;

    if (!sessionId || !navigator.geolocation) {
      setStatus("error");
      return;
    }

    /* -----------------------------
       DEVICE INFO (ONE TIME)
    ------------------------------*/
    (async () => {
      const info = await getDeviceInfo();
      setDevice(info);

      update(sessionRef, {
        device: info,
      });
    })();

    /* -----------------------------
       NETWORK INFO
    ------------------------------*/
    const conn =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (conn) {
      const net: NetworkInfo = {
        type: conn.effectiveType,
        downlink: conn.downlink,
        rtt: conn.rtt,
      };

      setNetwork(net);

      update(sessionRef, {
        network: net,
      });
    }

    /* -----------------------------
       BATTERY INFO
    ------------------------------*/
    if ("getBattery" in navigator) {
      (navigator as any).getBattery().then((bat: any) => {
        const info: BatteryInfo = {
          level: bat.level,
          charging: bat.charging,
        };

        setBattery(info);

        update(sessionRef, {
          battery: info,
        });

        bat.addEventListener("levelchange", () => {
          update(sessionRef, {
            battery: {
              level: bat.level,
              charging: bat.charging,
            },
          });
        });

        bat.addEventListener("chargingchange", () => {
          update(sessionRef, {
            battery: {
              level: bat.level,
              charging: bat.charging,
            },
          });
        });
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
       HEARTBEAT / PING
    ------------------------------*/
    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();

      try {
        await update(sessionRef, {
          heartbeat: start,
        });

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
        location: {
          lat,
          lng,
          accuracy,
        },
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
      isMounted.current = false;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      unsubscribe();

      update(sessionRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId]);

  /* -----------------------------
     UI
  ------------------------------*/
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📡 Live Sender</h3>

      <p style={styles.status}>Status: {status.toUpperCase()}</p>

      {coords && (
        <div style={styles.coords}>
          <p>Lat: {coords.lat.toFixed(6)}</p>
          <p>Lng: {coords.lng.toFixed(6)}</p>
          <p>Accuracy: {Math.round(coords.accuracy)}m</p>
        </div>
      )}

      <p style={styles.meta}>Ping: {ping} ms</p>

      {network && (
        <p style={styles.meta}>
          Network: {network.type} • {network.downlink}Mbps • RTT {network.rtt}ms
        </p>
      )}

      {battery && (
        <p style={styles.meta}>
          Battery: {Math.round((battery.level || 0) * 100)}%
          {battery.charging ? " ⚡ charging" : ""}
        </p>
      )}

      {device && (
        <div style={styles.device}>
          <p>
            📱 {device.brand} {device.model}
          </p>
          <p>
            {device.os} • {device.browser}
          </p>
          <p>{device.type}</p>
        </div>
      )}

      <p style={styles.session}>Session: {sessionId}</p>
    </div>
  );
}

/* -----------------------------
   STYLES
------------------------------*/
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 18,
    background: "#0f172a",
    color: "white",
    borderRadius: 12,
    maxWidth: 440,
    margin: "30px auto",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  title: { fontSize: 18, marginBottom: 10 },
  status: { fontSize: 14, fontWeight: 600, marginBottom: 10 },
  coords: { fontSize: 13, opacity: 0.85, marginBottom: 10 },
  meta: { fontSize: 12, opacity: 0.75, marginBottom: 6 },
  device: {
    fontSize: 12,
    opacity: 0.85,
    marginTop: 10,
    padding: 8,
    background: "#111827",
    borderRadius: 8,
  },
  session: { fontSize: 11, opacity: 0.5, marginTop: 10 },
};