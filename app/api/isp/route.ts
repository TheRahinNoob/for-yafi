import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  console.log("🌍 Server-side ISP lookup called");

  const apis = [
    "https://ip-api.com/json/",
    "https://freeipapi.com/json/",
    "https://ipbase.com/json",
    "https://api.bigdatacloud.net/data/client-info",
    "https://ipapi.co/json/",
    "https://ipwho.is/",
  ];

  for (const url of apis) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { 
        signal: controller.signal,
        cache: "no-store"
      });
      
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();

      let ispName = 
        data.isp || 
        data.org || 
        data.connection?.isp || 
        data.provider || 
        data.network?.name || 
        data.asn?.name;

      if (ispName && typeof ispName === "string" && ispName.length > 3) {
        console.log(`✅ ISP found via ${url}: ${ispName}`);

        return NextResponse.json({
          ip: data.query || data.ip || data.ipAddress || null,
          city: data.city || data.cityName || null,
          region: data.regionName || data.region || null,
          country: data.country || data.country_name || null,
          org: ispName,
          source: url.includes("ip-api") ? "ip-api.com" : 
                  url.includes("freeipapi") ? "freeipapi.com" : 
                  url.includes("bigdatacloud") ? "bigdatacloud" : "other",
        });
      }
    } catch (err) {
      console.warn(`API failed: ${url}`, err);
    }
  }

  console.warn("⚠️ All ISP APIs failed on server");
  return NextResponse.json({ error: "Could not detect ISP" }, { status: 200 });
}