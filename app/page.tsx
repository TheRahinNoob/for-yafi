"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { ref, set, onValue, remove } from "firebase/database";

type Session = {
  name: string;
  createdAt: number;
};

export default function Home() {
  const router = useRouter();
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [name, setName] = useState("");

  // 🔐 SIMPLE PRIVATE LOCK (temporary)
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  const SECRET = "1234"; // change later

  // load sessions
  useEffect(() => {
    if (!unlocked) return;

    const sessionRef = ref(db, "sessions");

    onValue(sessionRef, (snap) => {
      setSessions(snap.val() || {});
    });
  }, [unlocked]);

  // create session
  const createSession = () => {
    if (!name) return alert("Enter a name first");

    const id = Math.random().toString(36).substring(2, 8);

    set(ref(db, `sessions/${id}`), {
      name,
      createdAt: Date.now(),
    });

    router.push(`/track/${id}`);
  };

  // delete session
  const deleteSession = (id: string) => {
    remove(ref(db, `sessions/${id}`));
  };

  // unlock dashboard
  if (!unlocked) {
    return (
      <div style={styles.center}>
        <h2>Admin Access</h2>

        <input
          placeholder="Enter password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={() => {
            if (password === SECRET) setUnlocked(true);
            else alert("Wrong password");
          }}
          style={styles.button}
        >
          Unlock
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Session Dashboard</h1>

      {/* CREATE SESSION */}
      <div style={styles.card}>
        <input
          placeholder="Session name (e.g. Friend village)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <button onClick={createSession} style={styles.button}>
          + Create Session
        </button>
      </div>

      {/* SESSION LIST */}
      <div style={{ marginTop: 20 }}>
        {Object.entries(sessions).length === 0 && (
          <p style={{ opacity: 0.6 }}>No sessions yet</p>
        )}

        {Object.entries(sessions).map(([id, data]) => (
          <div key={id} style={styles.sessionCard}>
            <div>
              <h3 style={{ margin: 0 }}>{data.name}</h3>
              <small style={{ opacity: 0.6 }}>{id}</small>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => router.push(`/track/${id}`)}
                style={styles.smallButton}
              >
                Open
              </button>

              <button
                onClick={() => deleteSession(id)}
                style={{ ...styles.smallButton, background: "#ff4d4d" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* 🔥 SIMPLE MODERN UI STYLES */
const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 30,
    maxWidth: 700,
    margin: "0 auto",
    fontFamily: "system-ui",
  },

  title: {
    fontSize: 28,
    marginBottom: 20,
  },

  card: {
    padding: 15,
    border: "1px solid #ddd",
    borderRadius: 12,
    display: "flex",
    gap: 10,
  },

  sessionCard: {
    padding: 15,
    marginTop: 10,
    border: "1px solid #eee",
    borderRadius: 12,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  input: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    border: "1px solid #ccc",
  },

  button: {
    padding: "10px 15px",
    borderRadius: 8,
    border: "none",
    background: "#000",
    color: "white",
    cursor: "pointer",
  },

  smallButton: {
    padding: "6px 10px",
    borderRadius: 6,
    border: "none",
    background: "#000",
    color: "white",
    cursor: "pointer",
  },

  center: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    fontFamily: "system-ui",
  },
};