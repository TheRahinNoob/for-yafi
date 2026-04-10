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

export default function TrackPage() {
  const { id } = useParams() as { id: string };

  const [pos, setPos] = useState<Pos | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [status, setStatus] = useState<"online" | "offline" | "loading">(
    "loading"
  );

  useEffect(() => {
    if (!id) return;

    const sessionRef = ref(db, `sessions/${id}`);

    const unsubscribe = onValue(sessionRef, (snap) => {
      const data = snap.val();

      console.log("🔥 RAW FIREBASE DATA:", data);

      const lat = data?.lat ?? data?.latitude;
      const lng = data?.lng ?? data?.longitude;

      if (typeof lat === "number" && typeof lng === "number") {
        setPos({ lat, lng });
        setStatus(data?.status === "offline" ? "offline" : "online");
      }

      if (data?.lastUpdated) {
        setLastUpdate(data.lastUpdated);
      } else if (data?.timestamp) {
        setLastUpdate(new Date(data.timestamp).toISOString());
      }
    });

    return () => unsubscribe();
  }, [id]);

  if (!pos) {
    return (
      <div style={styles.loading}>
        <div style={styles.loadingCard}>
          <div className="pulseDot" />
          <h2>Searching for live location...</h2>
          <p>Session: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* LEFT PANEL */}
      <div style={styles.leftPanel}>
        {/* MAP */}
        <div style={styles.mapBox}>
          <LiveMap lat={pos.lat} lng={pos.lng} />
        </div>

        {/* STATUS CARD */}
        <div style={styles.statusCard}>
          <div style={styles.statusRow}>
            <span>Status</span>
            <span
              style={{
                color:
                  status === "online"
                    ? "#22c55e"
                    : status === "offline"
                    ? "#ef4444"
                    : "#facc15",
                fontWeight: 600,
              }}
            >
              {status.toUpperCase()}
            </span>
          </div>
        </div>

        {/* LOCATION CARD */}
        <div style={styles.card}>
          <h3>📍 Current Location</h3>
          <div style={styles.grid}>
            <div>
              <p className="label">Latitude</p>
              <p className="value">{pos.lat.toFixed(6)}</p>
            </div>
            <div>
              <p className="label">Longitude</p>
              <p className="value">{pos.lng.toFixed(6)}</p>
            </div>
          </div>
        </div>

        {/* LAST UPDATE CARD */}
        <div style={styles.cardAlt}>
          <h3>⏱ Last Update</h3>
          <p style={{ opacity: 0.8 }}>
            {lastUpdate
              ? new Date(lastUpdate).toLocaleString()
              : "No timestamp available"}
          </p>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div style={styles.rightPanel}>
        <h2 style={styles.title}>📊 Tracking Dashboard</h2>

        <div style={styles.metaCard}>
          <p className="label">Session ID</p>
          <p className="value">{id}</p>
        </div>

        <div style={styles.metaCard}>
          <p className="label">System</p>
          <p className="value">Live GPS Stream</p>
        </div>

        <div style={styles.metaCard}>
          <p className="label">Connection</p>
          <p className="value">
            {status === "online" ? "Stable 🟢" : "Disconnected 🔴"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* 🎨 STYLES */
const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #0f172a, #020617)",
    color: "white",
    padding: 20,
    display: "flex",
    gap: 24,
  },

  leftPanel: {
    width: 340,
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },

  rightPanel: {
    flex: 1,
    padding: 20,
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 16,
    backdropFilter: "blur(10px)",
  },

  mapBox: {
    width: "100%",
    height: 320,
    borderRadius: 18,
    overflow: "hidden",
    boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
  },

  statusCard: {
    padding: 12,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  statusRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 14,
  },

  card: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  cardAlt: {
    padding: 14,
    borderRadius: 14,
    background: "rgba(59,130,246,0.08)",
    border: "1px solid rgba(59,130,246,0.2)",
  },

  grid: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: 10,
  },

  metaCard: {
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.06)",
  },

  title: {
    marginBottom: 20,
    fontSize: 20,
    fontWeight: 600,
  },

  loading: {
    height: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#020617",
    color: "white",
  },

  loadingCard: {
    textAlign: "center",
    padding: 30,
    borderRadius: 16,
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
};