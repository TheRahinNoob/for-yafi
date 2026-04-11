import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  console.log("🌍 Server ISP lookup started");

  // Most reliable order for Bangladesh
  const apis = [
    "https://ip-api.com/json/?fields=status,message,query,city,regionName,country,isp,org,as",
    "https://freeipapi.com/json/",
    "https://ipinfo.io/json",
  ];

  for (const url of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(url, { 
        signal: controller.signal,
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      clearTimeout(timeoutId);

      if (!res.ok) continue;

      const data = await res.json();

      let isp = data.isp || data.org || data.connection?.isp || data.provider || data.asn?.name;

      if (isp && typeof isp === "string" && isp.length > 2) {
        console.log(`✅ Success via ${url}: ${isp}`);
        return NextResponse.json({
          ip: data.query || data.ip || data.ipAddress,
          city: data.city || data.cityName,
          region: data.regionName || data.region,
          country: data.country || data.country_name,
          org: isp,
          source: url.includes("ip-api") ? "ip-api.com" : url.includes("freeipapi") ? "freeipapi" : "ipinfo",
        });
      }
    } catch (e) {
      console.warn(`Failed ${url}:`, e);
    }
  }

  console.warn("❌ All ISP APIs failed");
  return NextResponse.json({ org: "Unknown ISP", source: "failed" });
}