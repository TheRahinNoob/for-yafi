"use client";

import * as UAParser from "ua-parser-js";

export type DeviceInfo = {
  model: string;
  brand: string;
  os: string;
  browser: string;
  type: string;
};

export async function getDeviceInfo(): Promise<DeviceInfo> {
  let model = "Unknown";
  let brand = "Unknown";
  let os = "Unknown";
  let browser = "Unknown";
  let type = "Desktop";

  try {
    // -----------------------------
    // MODERN API (Chrome Android)
    // -----------------------------
    const nav = navigator as any;

    if (nav.userAgentData?.getHighEntropyValues) {
      const ua = await nav.userAgentData.getHighEntropyValues([
        "model",
        "platform",
        "platformVersion",
      ]);

      model = ua?.model || "Unknown";
      os = ua?.platform || "Unknown";
    }

    // -----------------------------
    // FALLBACK (UAParser)
    // -----------------------------
    const parser = new (UAParser as any)();
    const result = parser.getResult();

    const device = result.device;
    const osData = result.os;
    const browserData = result.browser;

    brand = device.vendor || "Unknown";
    model = model !== "Unknown" ? model : device.model || "Unknown";

    os = os !== "Unknown" ? os : osData.name || "Unknown";
    browser = browserData.name || "Unknown";

    if (device.type === "mobile") type = "Mobile";
    else if (device.type === "tablet") type = "Tablet";
    else type = "Desktop";
  } catch (err) {
    console.warn("Device detection failed:", err);
  }

  return {
    model,
    brand,
    os,
    browser,
    type,
  };
}