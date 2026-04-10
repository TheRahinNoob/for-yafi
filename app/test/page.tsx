"use client";

import { db } from "@/lib/firebase";
import { ref, set } from "firebase/database";

export default function Test() {
  const writeTest = () => {
    set(ref(db, "test"), {
      message: "Firebase is connected",
      time: Date.now()
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Firebase Test</h1>
      <button onClick={writeTest}>
        Send Test Data
      </button>
    </div>
  );
}