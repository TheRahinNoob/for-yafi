/* ================================
   NETWORK NORMALIZER (CORE LAYER)
   ================================ */

export type RawIPInfo = {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  isp?: string;
  org?: string;
  as?: string;
};

export type RawSimInfo = {
  carrier?: string;
  confidence?: number;
  method?: string;
};

export type RawNetworkInput = {
  ipInfo?: RawIPInfo;
  isp?: string;
  org?: string;
  as?: string;
  sim?: RawSimInfo;
  type?: string;
  downlink?: number;
  rtt?: number;
};

/* ---------------- NORMALIZED OUTPUT ---------------- */

export type NormalizedNetwork = {
  ipInfo: {
    ip: string;
    city: string;
    region: string;
    country: string;
    isp: string;
    org: string;
    as: string;
  };

  isp: string;        // cleaned ISP
  as: string;         // ASN
  type: string;       // network type
  downlink: number;
  rtt: number;

  sim: {
    carrier: string;
    confidence: number;
    method: string;
  };
};

/* ---------------- HELPERS ---------------- */

function clean(value?: string, fallback = "Unknown") {
  if (!value) return fallback;
  const v = value.trim();
  return v.length ? v : fallback;
}

function pickISP(input: RawNetworkInput): string {
  return (
    input.isp ||
    input.org ||
    input.ipInfo?.isp ||
    input.ipInfo?.org ||
    "Unknown ISP"
  );
}

function pickAS(input: RawNetworkInput): string {
  return input.as || input.ipInfo?.as || "Unknown";
}

/* ---------------- MAIN NORMALIZER ---------------- */

export function normalizeNetwork(
  input: RawNetworkInput
): NormalizedNetwork {
  const ipInfo = input.ipInfo || {};

  return {
    ipInfo: {
      ip: clean(ipInfo.ip, "0.0.0.0"),
      city: clean(ipInfo.city),
      region: clean(ipInfo.region),
      country: clean(ipInfo.country),
      isp: clean(pickISP(input)),
      org: clean(ipInfo.org || input.org || input.isp),
      as: clean(pickAS(input)),
    },

    isp: clean(pickISP(input)),
    as: clean(pickAS(input)),

    type: input.type || "unknown",
    downlink: input.downlink ?? 0,
    rtt: input.rtt ?? 0,

    sim: {
      carrier: input.sim?.carrier || "Unknown",
      confidence: input.sim?.confidence ?? 0,
      method: input.sim?.method || "unprocessed",
    },
  };
}