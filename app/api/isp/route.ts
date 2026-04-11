import { NextRequest, NextResponse } from "next/server";

/* ---------------- HELPERS ---------------- */

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const ip =
    forwarded?.split(",")[0]?.trim() ||
    realIp ||
    "";

  // 🚨 block invalid cases
  if (!ip || ip === "unknown" || ip.includes("::1")) {
    return null;
  }

  return ip;
}

/* ---------------- ISP FILTER (IMPORTANT) ---------------- */

function isDatacenterISP(isp: string = "") {
  const badKeywords = [
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
  ];

  return badKeywords.some((k) =>
    isp.toLowerCase().includes(k)
  );
}

/* ---------------- MAIN API ---------------- */

export async function GET(request: NextRequest) {
  const clientIp = getClientIp(request);

  console.log("🌍 Client IP:", clientIp);

  if (!clientIp) {
    return NextResponse.json({
      org: "Unknown ISP",
      source: "no-ip",
    });
  }

  /* ---------------- PRIMARY API (MOST RELIABLE) ---------------- */

  const tryIpApi = async () => {
    try {
      const res = await fetch(
        `http://ip-api.com/json/${clientIp}?fields=status,message,query,country,regionName,city,isp,org,as`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (data.status !== "success") return null;

      const isp =
        data.isp ||
        data.org ||
        "";

      if (!isp) return null;

      // 🚨 filter datacenter ISP
      if (isDatacenterISP(isp)) {
        console.warn("⚠️ Datacenter ISP blocked:", isp);
        return null;
      }

      return {
        ip: data.query,
        city: data.city,
        region: data.regionName,
        country: data.country,
        org: isp,
        source: "ip-api",
      };
    } catch {
      return null;
    }
  };

  /* ---------------- SECONDARY API ---------------- */

  const tryIpWho = async () => {
    try {
      const res = await fetch(
        `https://ipwho.is/${clientIp}`,
        { cache: "no-store" }
      );

      const data = await res.json();

      if (!data.success) return null;

      const isp = data.connection?.isp;

      if (!isp || isDatacenterISP(isp)) return null;

      return {
        ip: data.ip,
        city: data.city,
        region: data.region,
        country: data.country,
        org: isp,
        source: "ipwho",
      };
    } catch {
      return null;
    }
  };

  /* ---------------- EXECUTION ORDER ---------------- */

  const result =
    (await tryIpApi()) ||
    (await tryIpWho());

  /* ---------------- BANGLADESH BOOST LAYER ---------------- */

  if (result?.org) {
    const lower = result.org.toLowerCase();

    if (
      lower.includes("grameen") ||
      lower.includes("gp") ||
      lower.includes("telenor")
    ) {
      result.org = "Grameenphone (GP)";
    }

    if (lower.includes("banglalink")) {
      result.org = "Banglalink";
    }

    if (lower.includes("robi")) {
      result.org = "Robi Axiata";
    }

    if (lower.includes("airtel")) {
      result.org = "Airtel Bangladesh";
    }

    if (lower.includes("teletalk")) {
      result.org = "Teletalk";
    }
  }

  /* ---------------- FINAL FALLBACK ---------------- */

  if (!result) {
    return NextResponse.json({
      org: "Unknown ISP",
      source: "failed",
    });
  }

  return NextResponse.json(result);
}