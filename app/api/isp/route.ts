import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // 🔥 GET THE REAL USER'S IP (this was missing)
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  const clientIp =
    forwardedFor?.split(",")[0]?.trim() ||
    realIp ||
    "unknown";

  console.log("🌍 Real Client IP detected:", clientIp);

  // Best API for Bangladesh mobile carriers (Grameenphone, Banglalink, Robi, Airtel)
  const apis = [
    `https://ip-api.com/json/${clientIp}?fields=status,message,query,city,regionName,country,isp,org,as`,
    "https://freeipapi.com/json/",
    "https://ipwho.is/",
  ];

  for (const url of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, {
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();

      let ispName =
        data.isp ||
        data.org ||
        data.connection?.isp ||
        data.provider ||
        data.asn?.name;

      if (ispName && typeof ispName === "string" && ispName.length > 3) {
        console.log(`✅ ISP FOUND: ${ispName} (via ${url})`);

        return NextResponse.json({
          ip: data.query || data.ip || clientIp,
          city: data.city || data.cityName,
          region: data.regionName || data.region,
          country: data.country || data.country_name,
          org: ispName,
          source: url.includes("ip-api.com")
            ? "ip-api.com"
            : url.includes("freeipapi")
            ? "freeipapi.com"
            : "ipwho.is",
        });
      }
    } catch (err) {
      console.warn(`API failed: ${url}`, err);
    }
  }

  console.warn("⚠️ All ISP APIs failed");
  return NextResponse.json({
    org: "Unknown ISP",
    source: "failed",
  });
}