"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  set,
  onDisconnect,
  onValue,
  serverTimestamp,
} from "firebase/database";

type Props = {
  sessionId: string;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const sessionRef = ref(db, `sessions/${sessionId}`);
  const connectedRef = ref(db, ".info/connected");

  const [status, setStatus] = useState("Initializing...");
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    if (!sessionId || typeof sessionId !== "string") {
      setStatus("Invalid session ID ❌");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("Geolocation not supported ❌");
      return;
    }

    setStatus("Connecting...");

    // 🟢 PRESENCE SYSTEM (ONLINE / OFFLINE)
    onValue(connectedRef, (snap) => {
      const isConnected = snap.val();

      if (isConnected === true) {
        set(sessionRef, (prev: any) => ({
          ...prev,
          status: "online",
          lastSeen: Date.now(),
        }));

        onDisconnect(sessionRef).update({
          status: "offline",
          lastSeen: Date.now(),
        });

        if (isMountedRef.current) {
          setStatus("🟢 Online");
        }
      }
    });

    // 💓 HEARTBEAT SYSTEM (EVERY 15s)
    heartbeatRef.current = setInterval(() => {
      set(ref(db, `sessions/${sessionId}`), {
        lastSeen: Date.now(),
        status: "online",
      });
    }, 15000);

    // 📡 GPS TRACKING
    const handleSuccess = (position: GeolocationPosition) => {
      const now = Date.now();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        return;
      }

      // throttle GPS updates
      if (now - lastUpdateRef.current < 2000) return;
      lastUpdateRef.current = now;

      const payload = {
        lat,
        lng,
        accuracy,
        timestamp: now,
        lastUpdated: new Date(now).toISOString(),
        status: "online",
        lastSeen: now,
      };

      if (isMountedRef.current) {
        setCoords({ lat, lng, accuracy });
        setStatus("🟢 Live tracking");
      }

      set(sessionRef, payload).catch(() => {
        if (isMountedRef.current) {
          setStatus("Firebase error ❌");
        }
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      if (!isMountedRef.current) return;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          setStatus("Permission denied ❌");
          break;
        case error.POSITION_UNAVAILABLE:
          setStatus("Location unavailable ❌");
          break;
        case error.TIMEOUT:
          setStatus("Timeout ❌");
          break;
        default:
          setStatus("Unknown error ❌");
      }
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000,
      }
    );

    return () => {
      isMountedRef.current = false;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      // 🔴 mark offline instantly
      set(sessionRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId]);

  // ⏱ LAST SEEN FORMATTER
  const getLastSeenText = (lastSeen?: number) => {
    if (!lastSeen) return "never";

    const diff = Date.now() - lastSeen;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);

    if (seconds < 10) return "just now";
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes} min ago`;

    return `${Math.floor(minutes / 60)} hr ago`;
  };

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📡 Live Sender</h3>

      <p style={styles.status}>{status}</p>

      {coords && (
        <div style={styles.coords}>
          <p>Lat: {coords.lat.toFixed(6)}</p>
          <p>Lng: {coords.lng.toFixed(6)}</p>
          <p>Accuracy: {Math.round(coords.accuracy)}m</p>
        </div>
      )}

      <p style={styles.session}>Session: {sessionId}</p>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 20,
    background: "#111827",
    color: "white",
    borderRadius: 12,
    maxWidth: 400,
    margin: "40px auto",
    textAlign: "center",
  },
  title: {
    marginBottom: 10,
    fontSize: 18,
  },
  status: {
    marginBottom: 10,
    fontSize: 14,
  },
  coords: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 10,
  },
  session: {
    fontSize: 12,
    opacity: 0.5,
  },
};