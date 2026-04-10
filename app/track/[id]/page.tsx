"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";
import dynamic from "next/dynamic";

const LiveMap = dynamic(() => import("@/components/LiveMap"), {
  ssr: false,
});

type Pos = {
  lat: number;
  lng: number;
};

type SessionData = {
  lat?: number;
  lng?: number;
  status?: "online" | "offline";
  lastSeen?: number;
  timestamp?: number;
  pingMs?: number;
  accuracy?: number;
};

export default function TrackPage() {
  const { id } = useParams() as { id: string };

  const [pos, setPos] = useState<Pos | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "loading">(
    "loading"
  );
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [ping, setPing] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;

    const sessionRef = ref(db, `sessions/${id}`);

    const unsubscribe = onValue(sessionRef, (snap) => {
      const data: SessionData = snap.val();

      console.log("🔥 LIVE DATA:", data);

      if (!data) {
        setStatus("offline");
        return;
      }

      const lat = data.lat ?? data.lat;
      const lng = data.lng ?? data.lng;

      if (typeof lat === "number" && typeof lng === "number") {
        setPos({ lat, lng });
      }

      if (typeof data.lastSeen === "number") {
        setLastSeen(data.lastSeen);
      } else if (typeof data.timestamp === "number") {
        setLastSeen(data.timestamp);
      }

      if (typeof data.pingMs === "number") {
        setPing(data.pingMs);
      }

      if (typeof data.accuracy === "number") {
        setAccuracy(data.accuracy);
      }

      // 🧠 SMART OFFLINE DETECTION
      const now = Date.now();
      const last = data.lastSeen ?? data.timestamp ?? 0;

      const diff = now - last;

      if (data.status === "offline" || diff > 20000) {
        setStatus("offline");
      } else {
        setStatus("online");
      }
    });

    return () => unsubscribe();
  }, [id]);

  // 📶 CONNECTION STRENGTH (0–100)
  const getStrength = () => {
    if (status !== "online") return 0;

    let score = 100;

    // ping penalty
    if (ping) {
      if (ping > 300) score -= 40;
      else if (ping > 150) score -= 20;
      else if (ping > 80) score -= 10;
    }

    // GPS accuracy penalty
    if (accuracy) {
      if (accuracy > 100) score -= 30;
      else if (accuracy > 50) score -= 15;
    }

    // freshness penalty
    if (lastSeen) {
      const diff = Date.now() - lastSeen;

      if (diff > 10000) score -= 20;
      if (diff > 20000) score -= 40;
    }

    return Math.max(0, Math.min(100, score));
  };

  const strength = getStrength();

  const formatLastSeen = () => {
    if (!lastSeen) return "unknown";

    const diff = Date.now() - lastSeen;

    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);

    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min} min ago`;

    return `${Math.floor(min / 60)} hr ago`;
  };

  if (!pos) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingCard}>
          <h2>📡 Waiting for location...</h2>
          <p>Session: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* MAP */}
      <div style={styles.leftPanel}>
        <div style={styles.mapBox}>
          <LiveMap lat={pos.lat} lng={pos.lng} />
        </div>
      </div>

      {/* SIDE PANEL */}
      <div style={styles.rightPanel}>
        <h2 style={styles.title}>📊 Tracking Dashboard</h2>

        {/* STATUS */}
        <div style={styles.card}>
          <p>Status</p>
          <h3 style={{ color: status === "online" ? "#22c55e" : "#ef4444" }}>
            {status.toUpperCase()}
          </h3>
        </div>

        {/* LOCATION */}
        <div style={styles.card}>
          <p>Latitude</p>
          <h3>{pos.lat.toFixed(6)}</h3>

          <p style={{ marginTop: 10 }}>Longitude</p>
          <h3>{pos.lng.toFixed(6)}</h3>
        </div>

        {/* LAST SEEN */}
        <div style={styles.card}>
          <p>Last Seen</p>
          <h3>{formatLastSeen()}</h3>
        </div>

        {/* PING */}
        <div style={styles.card}>
          <p>Ping</p>
          <h3>{ping ? `${ping} ms` : "unknown"}</h3>
        </div>

        {/* CONNECTION STRENGTH */}
        <div style={styles.card}>
          <p>Connection Strength</p>
          <h3
            style={{
              color:
                strength > 70
                  ? "#22c55e"
                  : strength > 40
                  ? "#facc15"
                  : "#ef4444",
            }}
          >
            {strength}%
          </h3>
        </div>

        {/* SESSION */}
        <div style={styles.cardSmall}>Session: {id}</div>
      </div>
    </div>
  );
}

/* 🎨 STYLES */
const styles: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    height: "100vh",
    background: "#0b1220",
    color: "white",
  },

  leftPanel: {
    flex: 1,
  },

  rightPanel: {
    width: 340,
    padding: 16,
    background: "#111827",
    overflowY: "auto",
  },

  mapBox: {
    height: "100%",
  },

  title: {
    marginBottom: 16,
  },

  card: {
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    background: "#1f2937",
  },

  cardSmall: {
    fontSize: 12,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 10,
  },

  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0b1220",
    color: "white",
  },

  loadingCard: {
    textAlign: "center",
  },
};