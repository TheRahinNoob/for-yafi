export type SimCarrier =
  | "Grameenphone"
  | "Robi"
  | "Banglalink"
  | "Airtel"
  | "Teletalk"
  | "Unknown";

export type SimResult = {
  carrier: SimCarrier;
  confidence: number; // 0 - 1
  method: string;
  raw?: any;
};

/* ---------------- BANGLADESH CARRIER INTELLIGENCE ---------------- */

const carrierDatabase = [
  {
    carrier: "Grameenphone",
    keywords: ["grameenphone", "gp", "telenor", "vimpelcom"],
    asns: ["AS24309", "AS24432"],
    weight: 1.0,
  },
  {
    carrier: "Robi",
    keywords: ["robi", "axiata"],
    asns: ["AS135136", "AS45796"],
    weight: 1.0,
  },
  {
    carrier: "Banglalink",
    keywords: ["banglalink", "vimpelcom"],
    asns: ["AS24323", "AS132602"],
    weight: 1.0,
  },
  {
    carrier: "Airtel",
    keywords: ["airtel"],
    asns: ["AS45609"],
    weight: 0.9,
  },
  {
    carrier: "Teletalk",
    keywords: ["teletalk"],
    asns: ["AS23688"],
    weight: 1.0,
  },
];

/* ---------------- DATACENTER FILTER ---------------- */

function isDatacenter(text: string = "") {
  const bad = [
    "amazon",
    "aws",
    "google",
    "cloudflare",
    "microsoft",
    "azure",
    "digitalocean",
    "linode",
    "vultr",
    "ovh",
    "hosting",
    "oracle",
  ];

  return bad.some((b) => text.toLowerCase().includes(b));
}

/* ---------------- MOBILE NETWORK DETECTION BOOST ---------------- */

function isLikelyMobileNetwork(isp: string, country?: string) {
  const mobileHints = [
    "mobile",
    "cellular",
    "telenor",
    "axiata",
    "grameen",
    "banglalink",
    "robi",
    "teletalk",
    "airtel",
  ];

  const text = isp.toLowerCase();

  return (
    country === "Bangladesh" &&
    mobileHints.some((h) => text.includes(h))
  );
}

/* ---------------- MAIN DETECTOR ---------------- */

export function detectSimCarrier(input: {
  isp?: string;
  org?: string;
  as?: string;
  country?: string;
}): SimResult {
  const isp = (input.isp || input.org || "").toLowerCase();
  const asn = (input.as || "").toUpperCase();

  /* ---------------- BLOCK CLOUD / DATACENTER ---------------- */
  if (isDatacenter(isp)) {
    return {
      carrier: "Unknown",
      confidence: 0,
      method: "datacenter_blocked",
    };
  }

  let best: SimResult = {
    carrier: "Unknown",
    confidence: 0.1,
    method: "default",
  };

  /* ---------------- SCORING ENGINE ---------------- */

  for (const carrier of carrierDatabase) {
    let score = 0;

    // keyword match (strong signal)
    if (carrier.keywords.some((k) => isp.includes(k))) {
      score += 0.6;
    }

    // ASN match (very strong signal)
    if (carrier.asns.includes(asn)) {
      score += 0.8;
    }

    // country boost
    if (input.country === "Bangladesh") {
      score += 0.1;
    }

    // mobile network boost
    if (isLikelyMobileNetwork(isp, input.country)) {
      score += 0.15;
    }

    // final normalization
    score = Math.min(score * carrier.weight, 0.99);

    if (score > best.confidence) {
      best = {
        carrier: carrier.carrier as SimCarrier,
        confidence: score,
        method: "hybrid-isp-asn-mobile",
        raw: input,
      };
    }
  }

  return best;
}