/**
 * ██████████████████████████████████████████████████████████████
 * ISP + SIM DETECTION API ROUTE (v2.0 – Highly Sophisticated)
 * 
 * This endpoint:
 * 1. Extracts real client IP (works behind Vercel, Cloudflare, etc.)
 * 2. Fetches accurate ISP data from two free sources
 * 3. Sends connection hints (cellular/wifi/4g/5g) to the detector
 * 4. Returns SIM carrier with realistic confidence
 * 
 * WiFi Handling: If user is on WiFi, confidence will be very low
 * and method will clearly say "wifi_detected_low_confidence"
 * ██████████████████████████████████████████████████████████████
 */

import { NextRequest, NextResponse } from "next/server";
import { detectSimCarrier } from "@/lib/simDetector";

/* ---------------- IP EXTRACTION HELPERS ---------------- */
function getClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ip = forwarded?.split(",")[0]?.trim() || realIp || "";

  if (!ip || ip === "unknown" || ip.includes("::1") || ip.includes("127.0.0.1")) {
    return null;
  }
  return ip;
}

/* ---------------- BANGLADESH ISP NAME NORMALIZER ---------------- */
function normalizeBangladeshISP(isp: string): string {
  const lower = isp.toLowerCase();

  if (lower.includes("grameen") || lower.includes("telenor")) return "Grameenphone (GP)";
  if (lower.includes("banglalink")) return "Banglalink";
  if (lower.includes("robi") || lower.includes("axiata")) return "Robi Axiata";
  if (lower.includes("airtel")) return "Airtel Bangladesh";
  if (lower.includes("teletalk")) return "Teletalk";

  return isp; // fallback
}

/* ---------------- MAIN API HANDLER ---------------- */
export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);
  console.log("🌍 [SIM TRACKER] Client IP:", clientIp || "unknown");

  // If we can't get IP (very rare)
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
        confidence: 5,
        method: "no-ip",
      },
      source: "no-ip",
    });
  }

  /* ---------------- TRY TWO FREE ISP LOOKUP SERVICES ---------------- */
  const tryIpApi = async () => {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${clientIp}?fields=status,message,query,country,regionName,city,isp,org,as`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.status !== "success") return null;

      return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        country: data.country,
        isp: data.isp || data.org || "",
        as: data.as || "",
        source: "ip-api",
      };
    } catch (err) {
      console.error("ip-api.com failed:", err);
      return null;
    }
  };

  const tryIpWho = async () => {
    try {
      const res = await fetch(`https://ipwho.is/${clientIp}`, { cache: "no-store" });
      const data = await res.json();

      if (!data.success) return null;

      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        isp: data.connection?.isp || "",
        as: data.connection?.asn || "",
        source: "ipwho",
      };
    } catch (err) {
      console.error("ipwho.is failed:", err);
      return null;
    }
  };

  // Try ip-api first, fallback to ipwho
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
        confidence: 5,
        method: "no-data",
      },
      source: "failed",
    });
  }

  /* ---------------- GET BROWSER CONNECTION HINTS ---------------- */
  const connectionType = request.nextUrl.searchParams.get("connectionType") || "unknown";
  const effectiveType = request.nextUrl.searchParams.get("effectiveType") || "unknown";

  console.log(`📶 [SIM TRACKER] Connection: ${connectionType} | Effective: ${effectiveType}`);

  /* ---------------- DETECT SIM CARRIER (now with WiFi awareness) ---------------- */
  const sim = detectSimCarrier({
    isp: ispResult.isp,
    org: ispResult.isp,
    as: ispResult.as,
    country: ispResult.country,
    connectionType,
    effectiveType,
  });

  /* ---------------- FINAL RESPONSE ---------------- */
  const cleanISP = normalizeBangladeshISP(ispResult.isp);

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