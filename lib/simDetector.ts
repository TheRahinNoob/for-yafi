/**
 * ██████████████████████████████████████████████████████████████
 * INTERNET PROVIDER DETECTOR – BANGLADESH (v3.0)
 * 
 * NEW BEHAVIOUR:
 *   • On mobile data (4G/5G) → shows correct SIM carrier (high confidence)
 *   • On WiFi → shows the WiFi broadband ISP name (e.g. BTCL, Fiber@Home)
 *   • Never returns "Unknown" unless absolutely nothing is detected
 * 
 * Fixed all wrong detection issues with real ISP strings & ASNs
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
  carrier: SimCarrier | string;   // can now be ISP name on WiFi
  confidence: number; // 0–100
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
    keywords: ["robi", "axiata", "robi axiata", "axiata bangladesh", "tm international", "robi axitata"],
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
    eff === "4g" || eff === "5g" ||
    eff.includes("4g") || eff.includes("5g")
  );
}

/* ---------------- MAIN DETECTOR (NEW LOGIC) ---------------- */
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

  // Default fallback
  let best: SimResult = {
    carrier: "Unknown",
    confidence: 10,
    method: "no_match",
    raw: input,
  };

  // STEP 1: If on mobile data → try to detect SIM carrier
  if (isCellular) {
    for (const entry of carrierDatabase) {
      let score = 0;

      if (entry.keywords.some((k) => ispRaw.includes(k))) score += 45;
      if (entry.asns.some((a) => asnRaw === a || asnRaw.includes(a) || a.includes(asnRaw))) score += 40;

      if (input.country === "Bangladesh") score += 8;
      if (isCellular) score += 30;                    // big mobile boost

      score = Math.min(score * entry.weight, 99);

      if (score > best.confidence) {
        best = {
          carrier: entry.carrier as SimCarrier,
          confidence: Math.round(score),
          method: "mobile_sim_carrier",
          raw: input,
        };
      }
    }
  }

  // STEP 2: If we have a good mobile match → return it
  if (best.confidence >= 40) {
    return best;
  }

  // STEP 3: WiFi or no good SIM match → show the actual ISP / broadband provider name
  const providerName = (input.isp || input.org || "Unknown ISP").trim();

  return {
    carrier: providerName,
    confidence: isCellular ? 35 : 65,           // lower on mobile fallback, higher on WiFi
    method: isCellular ? "mobile_isp_fallback" : "wifi_broadband_isp",
    raw: input,
  };
}