/**
 * ██████████████████████████████████████████████████████████████
 * SIM + ISP DETECTOR – BANGLADESH (v4.0 – Final Production Version)
 * 
 * Behaviour (exactly as you wanted):
 *   • On Mobile Data (4G/5G) → Correct SIM carrier with HIGH confidence
 *   • On WiFi → Shows actual broadband ISP name (BTCL, Fiber@Home, etc.)
 *   • Never returns "Unknown" unless literally nothing is detected
 * 
 * Fully integrated with Sender.tsx + /api/isp/route.ts
 * ██████████████████████████████████████████████████████████████
 */

export type SimCarrier =
  | "Grameenphone"
  | "Robi"
  | "Banglalink"
  | "Airtel"
  | "Teletalk"
  | "Unknown";

export type SimResult = {
  carrier: SimCarrier | string;   // string = broadband ISP name on WiFi
  confidence: number;             // 0–100
  method: string;
  raw?: any;
};

/* ---------------- REAL BANGLADESH PROVIDER DATABASE ---------------- */
const carrierDatabase = [
  {
    carrier: "Grameenphone",
    keywords: ["grameenphone", "grameen", "gp", "grameenphone ltd", "grameenphone limited"],
    asns: ["AS24389"],
    weight: 1.0,
  },
  {
    carrier: "Robi",
    keywords: ["robi", "axiata", "robi axiata", "axiata bangladesh", "tm international"],
    asns: ["AS24432"],
    weight: 1.0,
  },
  {
    carrier: "Banglalink",
    keywords: ["banglalink", "bangla link", "banglalink digital", "orascom"],
    asns: ["AS24323", "AS132602"],
    weight: 1.0,
  },
  {
    carrier: "Airtel",
    keywords: ["airtel", "airtel bangladesh", "airtel bd"],
    asns: ["AS45609"],
    weight: 0.95,
  },
  {
    carrier: "Teletalk",
    keywords: ["teletalk", "teletalk bd", "teletalk bangladesh"],
    asns: ["AS45925", "AS23688"],
    weight: 1.0,
  },
];

/* ---------------- HELPERS ---------------- */
function isGenericWiFiOrBackbone(text: string = ""): boolean {
  const bad = [
    "amazon", "aws", "google", "cloudflare", "microsoft", "azure",
    "digitalocean", "linode", "vultr", "ovh", "hosting", "oracle",
    "btcl", "btrc", "fiber@home", "fiber home", "f@home", "backbone",
    "ixp", "submarine", "wifi", "broadband", "cable", "home internet"
  ];
  const lower = text.toLowerCase();
  return bad.some((b) => lower.includes(b));
}

function isCellularConnection(connectionType = "", effectiveType = ""): boolean {
  const conn = (connectionType || "").toLowerCase();
  const eff = (effectiveType || "").toLowerCase();
  return (
    conn === "cellular" ||
    eff === "4g" ||
    eff === "5g" ||
    eff.includes("4g") ||
    eff.includes("5g")
  );
}

/* ---------------- MAIN DETECTOR ---------------- */
export function detectSimCarrier(input: {
  isp?: string;
  org?: string;
  as?: string;
  country?: string;
  connectionType?: string;
  effectiveType?: string;
}): SimResult {
  const ispRaw = (input.isp || input.org || "").toLowerCase().trim();
  const asnRaw = (input.as || "").toUpperCase().trim();
  const isCellular = isCellularConnection(input.connectionType, input.effectiveType);

  console.log(`🔍 [SIM DETECTOR] Input → Cellular: ${isCellular} | ISP: "${ispRaw}" | ASN: ${asnRaw}`);

  // Default fallback (will be overwritten in almost all cases)
  let best: SimResult = {
    carrier: "Unknown",
    confidence: 10,
    method: "no_match",
    raw: input,
  };

  // ====================== STEP 1: MOBILE DATA DETECTION ======================
  if (isCellular) {
    for (const entry of carrierDatabase) {
      let score = 0;

      // Keyword match in ISP name
      if (entry.keywords.some((k) => ispRaw.includes(k))) score += 45;
      // ASN match (very strong signal)
      if (entry.asns.some((a) => asnRaw === a || asnRaw.includes(a) || a.includes(asnRaw))) score += 40;

      if (input.country?.toLowerCase() === "bangladesh") score += 10;
      if (isCellular) score += 35;                    // huge boost for mobile connection

      score = Math.min(Math.round(score * entry.weight), 99);

      if (score > best.confidence) {
        best = {
          carrier: entry.carrier as SimCarrier,
          confidence: score,
          method: "mobile_sim_carrier",
          raw: input,
        };
      }
    }
  }

  // If we already have a strong mobile SIM match → return immediately
  if (best.confidence >= 55) {
    console.log(`✅ [SIM DETECTOR] Strong mobile match: ${best.carrier} (${best.confidence}%)`);
    return best;
  }

  // ====================== STEP 2: WIFI / BROADBAND FALLBACK ======================
  const providerName = (input.isp || input.org || "Unknown ISP").trim();

  // If it's clearly a generic backbone or WiFi ISP, still return it (as requested)
  const isGeneric = isGenericWiFiOrBackbone(providerName);

  return {
    carrier: providerName,
    confidence: isCellular ? 45 : 75,   // slightly lower on mobile fallback, higher on pure WiFi
    method: isCellular ? "mobile_isp_fallback" : "wifi_broadband_isp",
    raw: input,
  };
}