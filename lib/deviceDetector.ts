"use client";

import * as UAParserModule from "ua-parser-js";

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
    const nav = navigator as any;

    /* ---------------- MODERN CHROMIUM API ---------------- */
    if (nav.userAgentData?.getHighEntropyValues) {
      try {
        const ua = await nav.userAgentData.getHighEntropyValues([
          "model",
          "platform",
          "platformVersion",
        ]);

        model = ua?.model || "Unknown";
        os = ua?.platform || "Unknown";
      } catch {
        // ignore modern API failure
      }
    }

    /* ---------------- FIXED UA-PARSER INIT ---------------- */

    const UAParser: any =
      (UAParserModule as any).default || UAParserModule;

    const parser = new UAParser(navigator.userAgent);
    const result = parser.getResult();

    const device = result.device;
    const osData = result.os;
    const browserData = result.browser;

    /* ---------------- DEVICE INFO ---------------- */

    brand = device.vendor || "Unknown";

    model =
      model !== "Unknown"
        ? model
        : device.model || "Unknown";

    os =
      os !== "Unknown"
        ? os
        : osData.name || "Unknown";

    browser = browserData.name || "Unknown";

    if (device.type === "mobile") {
      type = "Mobile";
    } else if (device.type === "tablet") {
      type = "Tablet";
    } else {
      type = "Desktop";
    }
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