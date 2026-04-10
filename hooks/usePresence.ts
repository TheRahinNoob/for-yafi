"use client";

import { useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, set, onDisconnect, onValue } from "firebase/database";

type PresenceStatus = "online" | "offline" | "connecting";

type Options = {
  sessionId: string;
  heartbeatInterval?: number; // default 10s
};

export function usePresence({
  sessionId,
  heartbeatInterval = 10000,
}: Options) {
  const [status, setStatus] = useState<PresenceStatus>("connecting");
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [ping, setPing] = useState<number>(0);

  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const sessionRef = ref(db, `sessions/${sessionId}`);
  const connectedRef = ref(db, ".info/connected");

  useEffect(() => {
    if (!sessionId) return;

    let mounted = true;

    const setupPresence = () => {
      onValue(connectedRef, (snap) => {
        const isConnected = snap.val();

        if (isConnected === true) {
          // Mark online
          set(sessionRef, {
            status: "online",
            lastSeen: Date.now(),
          });

          // Auto mark offline on disconnect (REAL firebase feature)
          onDisconnect(sessionRef).update({
            status: "offline",
            lastSeen: Date.now(),
          });

          if (mounted) setStatus("online");
        } else {
          if (mounted) setStatus("offline");
        }
      });
    };

    const startHeartbeat = () => {
      heartbeatRef.current = setInterval(async () => {
        const start = Date.now();

        try {
          await set(ref(db, `sessions/${sessionId}/heartbeat`), {
            t: start,
          });

          const latency = Date.now() - start;

          if (mounted) {
            setPing(latency);
            setLastSeen(start);
          }
        } catch {
          if (mounted) setPing(999);
        }
      }, heartbeatInterval);
    };

    setupPresence();
    startHeartbeat();

    return () => {
      mounted = false;

      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }

      set(ref(db, `sessions/${sessionId}`), {
        status: "offline",
        lastSeen: Date.now(),
      });
    };
  }, [sessionId, heartbeatInterval]);

  /* --------------------------
     CONNECTION QUALITY (0–100)
  ---------------------------*/
  const getStrength = () => {
    if (ping === 0) return 100;
    if (ping < 100) return 100;
    if (ping < 200) return 80;
    if (ping < 400) return 60;
    if (ping < 800) return 40;
    return 10;
  };

  /* --------------------------
     LAST SEEN FORMATTER
  ---------------------------*/
  const getLastSeenText = () => {
    if (!lastSeen) return "never";

    const diff = Date.now() - lastSeen;

    const sec = Math.floor(diff / 1000);
    const min = Math.floor(sec / 60);

    if (sec < 10) return "just now";
    if (sec < 60) return `${sec}s ago`;
    if (min < 60) return `${min} min ago`;

    return `${Math.floor(min / 60)}h ago`;
  };

  return {
    status,
    ping,
    strength: getStrength(),
    lastSeen,
    lastSeenText: getLastSeenText(),
  };
}