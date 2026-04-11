/**
 * ██████████████████████████████████████████████████████████████
 * SIM CARRIER DETECTOR – BANGLADESH EDITION (v2.0 – Highly Sophisticated)
 * 
 * This is the brain of the entire SIM detection system.
 * Completely free. No paid APIs. Works with real-world IP responses.
 * Handles WiFi gracefully (low confidence when on WiFi).
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
  carrier: SimCarrier;
  confidence: number; // 0–100 (percentage)
  method: string;
  raw?: any;
};

/* ---------------- REAL-WORLD BANGLADESH CARRIER DATABASE ---------------- */
const carrierDatabase = [
  {
    carrier: "Grameenphone",
    keywords: [
      "grameenphone", "grameen", "gp", "telenor", "vimpelcom",
      "gp internet", "grameenphone ltd", "grameenphone limited"
    ],
    asns: ["AS24309", "AS24432"],
    weight: 1.0,
  },
  {
    carrier: "Robi",
    keywords: [
      "robi", "axiata", "robi axiata", "robi ltd", "robi axiata ltd"
    ],
    asns: ["AS135136", "AS45796"],
    weight: 1.0,
  },
  {
    carrier: "Banglalink",
    keywords: [
      "banglalink", "bangla link", "vimpelcom", "banglalink digital",
      "banglalink digital communications", "orascom"
    ],
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
    asns: ["AS23688"],
    weight: 1.0,
  },
];

/* ---------------- BLOCK GENERIC / WIFI / DATACENTER NETWORKS ---------------- */
function isGenericOrWiFiNetwork(text: string = ""): boolean {
  const genericTerms = [
    "amazon", "aws", "google", "microsoft", "azure", "cloudflare",
    "digitalocean", "linode", "vultr", "ovh", "hosting", "oracle",
    "btcl", "btrc", "fiber@home", "fiber home", "f@home", "backbone",
    "ixp", "submarine cable", "bangladesh telecom", "wifi", "broadband",
    "cable", "isp broadband", "home internet"
  ];
  const lower = text.toLowerCase();
  return genericTerms.some((term) => lower.includes(term));
}

/* ---------------- MAIN DETECTION ENGINE ---------------- */
export function detectSimCarrier(input: {
  isp?: string;
  org?: string;
  as?: string;
  country?: string;
  connectionType?: string;   // e.g. "cellular", "wifi"
  effectiveType?: string;    // e.g. "4g", "5g", "3g"
}): SimResult {
  const ispRaw = (input.isp || input.org || "").toLowerCase().trim();
  const asnRaw = (input.as || "").toUpperCase().trim();

  // Step 1: Block obvious non-mobile networks
  if (isGenericOrWiFiNetwork(ispRaw)) {
    return {
      carrier: "Unknown",
      confidence: 8,
      method: "blocked_generic_or_wifi",
      raw: input,
    };
  }

  // Default fallback
  let best: SimResult = {
    carrier: "Unknown",
    confidence: 8,
    method: "no_match",
    raw: input,
  };

  // Step 2: Score every carrier
  for (const carrier of carrierDatabase) {
    let score = 0;

    // 1. Keyword match (very strong for BD ISPs)
    const keywordMatched = carrier.keywords.some((k) => ispRaw.includes(k));
    if (keywordMatched) score += 45;

    // 2. ASN match (extremely reliable when present)
    const asnMatched = carrier.asns.some((a) => 
      asnRaw === a || asnRaw.includes(a) || a.includes(asnRaw)
    );
    if (asnMatched) score += 40;

    // 3. Country boost
    if (input.country === "Bangladesh") score += 8;

    // 4. Mobile connection type from browser (BIGGEST IMPROVEMENT)
    const connType = (input.connectionType || "").toLowerCase();
    const effType = (input.effectiveType || "").toLowerCase();
    
    const isCellular = connType === "cellular" || 
                      effType === "4g" || 
                      effType === "5g" || 
                      effType.includes("4g") || 
                      effType.includes("5g");

    if (isCellular) score += 30;           // huge boost on real mobile data

    // 5. Extra mobile hint in ISP name
    if (ispRaw.includes("mobile") || ispRaw.includes("cellular") || ispRaw.includes("4g") || ispRaw.includes("5g")) {
      score += 12;
    }

    // Final score normalization
    score = Math.min(score * carrier.weight, 99);

    // Update best result if this carrier scores higher
    if (score > best.confidence) {
      best = {
        carrier: carrier.carrier as SimCarrier,
        confidence: Math.round(score),
        method: "hybrid_isp_asn_mobile_browser",
        raw: input,
      };
    }
  }

  // If still very low score and we are on WiFi → be explicit
  if (best.confidence < 20 && (input.connectionType || "").toLowerCase() === "wifi") {
    best.method = "wifi_detected_low_confidence";
  }

  return best;
}