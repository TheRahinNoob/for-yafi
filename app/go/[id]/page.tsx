"use client";

import { useParams } from "next/navigation";
import Sender from "@/components/Sender"; // adjust path if needed

export default function GoPage() {
  const { id } = useParams() as { id: string };

  if (!id) {
    return <p style={{ padding: 20 }}>Invalid session ID ❌</p>;
  }

  return <Sender sessionId={id} />;
}