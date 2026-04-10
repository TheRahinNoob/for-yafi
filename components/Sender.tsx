"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, set, onDisconnect, onValue } from "firebase/database";

type Props = {
  sessionId: string;
};

type Coords = {
  lat: number;
  lng: number;
  accuracy: number;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const lastGpsUpdate = useRef<number>(0);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isMounted = useRef(true);

  const sessionRef = ref(db, `sessions/${sessionId}`);
  const connectedRef = ref(db, ".info/connected");

  const [status, setStatus] = useState<
    "initializing" | "online" | "offline" | "error"
  >("initializing");

  const [coords, setCoords] = useState<Coords | null>(null);
  const [ping, setPing] = useState<number>(0);

  /* -------------------------------
      INIT
  --------------------------------*/
  useEffect(() => {
    isMounted.current = true;

    if (!sessionId || typeof sessionId !== "string") {
      setStatus("error");
      return;
    }

    if (!navigator.geolocation) {
      setStatus("error");
      return;
    }

    setStatus("online");

    /* -------------------------------
       PRESENCE SYSTEM (REAL FIXED)
    --------------------------------*/
    onValue(connectedRef, (snap) => {
      const isConnected = snap.val();

      if (isConnected === true) {
        // IMPORTANT: ONLY set presence fields (DO NOT overwrite lat/lng)
        set(sessionRef, {
          status: "online",
          lastSeen: Date.now(),
        });

        onDisconnect(sessionRef).update({
          status: "offline",
          lastSeen: Date.now(),
        });
      } else {
        setStatus("offline");
      }
    });

    /* -------------------------------
       HEARTBEAT (PING SYSTEM FIXED)
    --------------------------------*/
    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();

      try {
        await set(ref(db, `sessions/${sessionId}/heartbeat`), {
          t: start,
        });

        const latency = Date.now() - start;
        setPing(latency);
      } catch {
        setPing(999);
      }
    }, 10000);

    /* -------------------------------
       GPS TRACKING (PRIMARY STREAM)
    --------------------------------*/
    const handleSuccess = (position: GeolocationPosition) => {
      const now = Date.now();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      if (!lat || !lng || isNaN(lat) || isNaN(lng)) return;

      if (now - lastGpsUpdate.current < 2000) return;
      lastGpsUpdate.current = now;

      const payload = {
        lat,
        lng,
        accuracy,
        timestamp: now,
        lastSeen: now,
        status: "online",
        ping,
      };

      if (isMounted.current) {
        setCoords({ lat, lng, accuracy });
        setStatus("online");
      }

      // IMPORTANT: overwrite full session state safely
      set(sessionRef, payload).catch(() => {
        if (isMounted.current) setStatus("error");
      });
    };

    const handleError = () => {
      if (!isMounted.current) return;
      setStatus("offline");
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

    /* -------------------------------
       CLEANUP
    --------------------------------*/
    return () => {
      isMounted.current = false;

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      set(sessionRef, {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId]);

  /* -------------------------------
      UI
  --------------------------------*/
  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📡 Sender</h3>

      <p style={styles.status}>
        Status: {status.toUpperCase()}
      </p>

      {coords && (
        <div style={styles.coords}>
          <p>Lat: {coords.lat.toFixed(6)}</p>
          <p>Lng: {coords.lng.toFixed(6)}</p>
          <p>Accuracy: {Math.round(coords.accuracy)}m</p>
        </div>
      )}

      <p style={styles.meta}>Ping: {ping} ms</p>

      <p style={styles.session}>Session: {sessionId}</p>
    </div>
  );
}

/* -------------------------------
   STYLES
--------------------------------*/
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 18,
    background: "#0f172a",
    color: "white",
    borderRadius: 12,
    maxWidth: 420,
    margin: "30px auto",
    textAlign: "center",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  title: {
    marginBottom: 10,
    fontSize: 18,
  },
  status: {
    marginBottom: 10,
    fontSize: 14,
    fontWeight: 600,
  },
  coords: {
    fontSize: 13,
    opacity: 0.85,
    marginBottom: 10,
  },
  meta: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 10,
  },
  session: {
    fontSize: 11,
    opacity: 0.5,
  },
};