import { NextRequest, NextResponse } from "next/server";
import { detectSimCarrier } from "@/lib/simDetector";

/* ---------------- IP HELPERS ---------------- */

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ip =
    forwarded?.split(",")[0]?.trim() ||
    realIp ||
    "";

  if (!ip || ip === "unknown" || ip.includes("::1")) return null;
  return ip;
}

/* ---------------- DATACENTER FILTER ---------------- */

function isDatacenterISP(isp: string = "") {
  const bad = [
    "amazon",
    "aws",
    "google",
    "microsoft",
    "azure",
    "cloudflare",
    "digitalocean",
    "linode",
    "vultr",
    "ovh",
    "hosting",
    "oracle",
  ];

  return bad.some(k => isp.toLowerCase().includes(k));
}

/* ---------------- BANGLADESH CLEANER ---------------- */

function normalizeBangladeshISP(isp: string) {
  const l = isp.toLowerCase();

  if (l.includes("grameen") || l.includes("telenor")) return "Grameenphone (GP)";
  if (l.includes("banglalink")) return "Banglalink";
  if (l.includes("robi") || l.includes("axiata")) return "Robi Axiata";
  if (l.includes("airtel")) return "Airtel Bangladesh";
  if (l.includes("teletalk")) return "Teletalk";

  return isp;
}

/* ---------------- MAIN ---------------- */

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  console.log("🌍 Client IP:", clientIp);

  if (!clientIp) {
    return NextResponse.json({
      ip: "unknown",
      isp: "Unknown ISP",
      city: "unknown",
      region: "unknown",
      country: "unknown",
      as: "",
      sim: {
        carrier: "Unknown",
        confidence: 0,
        method: "no-ip",
      },
      source: "no-ip",
    });
  }

  /* ---------------- ISP API 1 ---------------- */

  const tryIpApi = async () => {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${clientIp}?fields=status,message,query,country,regionName,city,isp,org,as`,
        { cache: "no-store" }
      );

      const data = await res.json();
      if (data.status !== "success") return null;

      const isp = data.isp || data.org || "";
      if (!isp || isDatacenterISP(isp)) return null;

      return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        country: data.country,
        isp,
        as: data.as,
        source: "ip-api",
      };
    } catch {
      return null;
    }
  };

  /* ---------------- ISP API 2 ---------------- */

  const tryIpWho = async () => {
    try {
      const res = await fetch(`https://ipwho.is/${clientIp}`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (!data.success) return null;

      const isp = data.connection?.isp;
      if (!isp || isDatacenterISP(isp)) return null;

      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        isp,
        as: data.connection?.asn || "",
        source: "ipwho",
      };
    } catch {
      return null;
    }
  };

  const ispResult = (await tryIpApi()) || (await tryIpWho());

  if (!ispResult) {
    return NextResponse.json({
      ip: clientIp,
      isp: "Unknown ISP",
      city: "unknown",
      region: "unknown",
      country: "unknown",
      as: "",
      sim: {
        carrier: "Unknown",
        confidence: 0,
        method: "no-data",
      },
      source: "failed",
    });
  }

  /* ---------------- CLEAN ISP ---------------- */

  const cleanISP = normalizeBangladeshISP(ispResult.isp);

  /* ---------------- SIM DETECTION ---------------- */

  const sim = detectSimCarrier({
    isp: ispResult.isp,
    org: ispResult.isp,
    as: ispResult.as,
    country: ispResult.country,
  });

  return NextResponse.json({
    ip: ispResult.ip,
    city: ispResult.city,
    region: ispResult.region,
    country: ispResult.country,

    isp: cleanISP,
    as: ispResult.as,

    sim: {
      carrier: sim.carrier,
      confidence: sim.confidence,
      method: sim.method,
    },

    source: ispResult.source,
  });
}