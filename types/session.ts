export type SessionData = {
  lat: number;
  lng: number;

  accuracy?: number;

  timestamp?: number;
  lastUpdated?: string;

  status?: "online" | "offline";

  lastSeen?: number;

  ping?: number;
};