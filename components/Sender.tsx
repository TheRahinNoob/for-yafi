"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, set } from "firebase/database";

type Props = {
  sessionId: string;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const isMountedRef = useRef(true);

  const [status, setStatus] = useState("Initializing...");
  const [coords, setCoords] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);

  useEffect(() => {
    isMountedRef.current = true;

    // 🚨 HARD GUARD: sessionId validation
    if (!sessionId || typeof sessionId !== "string") {
      console.error("❌ Invalid sessionId:", sessionId);
      setStatus("Invalid session ID ❌");
      return;
    }

    console.log("✅ Sender started for session:", sessionId);

    if (!navigator.geolocation) {
      setStatus("Geolocation not supported ❌");
      return;
    }

    setStatus("Requesting location permission...");

    const handleSuccess = (position: GeolocationPosition) => {
      const now = Date.now();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      // 🚨 Validate coordinates
      if (
        typeof lat !== "number" ||
        typeof lng !== "number" ||
        isNaN(lat) ||
        isNaN(lng)
      ) {
        console.warn("⚠️ Invalid coordinates:", { lat, lng });
        return;
      }

      // 🔥 Throttle updates (2 seconds)
      if (now - lastUpdateRef.current < 2000) return;
      lastUpdateRef.current = now;

      const payload = {
        lat,
        lng,
        accuracy,
        timestamp: now,
      };

      // ✅ Update local UI
      if (isMountedRef.current) {
        setCoords({ lat, lng, accuracy });
        setStatus(`📡 Live tracking (${Math.round(accuracy)}m accuracy)`);
      }

      // 🚀 Write to Firebase (safe path)
      set(ref(db, `sessions/${sessionId}`), payload).catch((err) => {
        console.error("❌ Firebase update error:", err);
        if (isMountedRef.current) {
          setStatus("Firebase update failed ❌");
        }
      });
    };

    const handleError = (error: GeolocationPositionError) => {
      console.error("❌ GPS Error:", error);

      if (!isMountedRef.current) return;

      switch (error.code) {
        case error.PERMISSION_DENIED:
          setStatus("Permission denied ❌");
          break;
        case error.POSITION_UNAVAILABLE:
          setStatus("Location unavailable ❌");
          break;
        case error.TIMEOUT:
          setStatus("Location timeout ❌");
          break;
        default:
          setStatus("Unknown GPS error ❌");
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
        console.log("🛑 Stopped tracking for session:", sessionId);
      }
    };
  }, [sessionId]);

  return (
    <div style={styles.container}>
      <h3 style={styles.title}>📡 Live Location Sender</h3>

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