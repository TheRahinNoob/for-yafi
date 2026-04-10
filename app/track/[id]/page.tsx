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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionRef = ref(db, `sessions/${id}`);

const unsubscribe = onValue(sessionRef, (snap) => {
  const data = snap.val();

  console.log("🔥 RAW FIREBASE DATA:", data);
  console.log("👉 TYPE CHECK:", {
    lat: data?.lat,
    lng: data?.lng,
    latType: typeof data?.lat,
    lngType: typeof data?.lng,
  });

  const lat = data?.lat ?? data?.latitude;
  const lng = data?.lng ?? data?.longitude;

  console.log("✅ AFTER PARSE:", { lat, lng });

  if (lat != null && lng != null) {
    setPos({
      lat: Number(lat),
      lng: Number(lng),
    });
    setLoading(false);
  }
});

    return () => unsubscribe();
  }, [id]);

  if (loading || !pos) {
    return (
      <p style={{ padding: 20 }}>av
        Waiting for location... <br />
        Session: {id}
      </p>
    );
  }

  return <LiveMap lat={pos.lat} lng={pos.lng} />;
}