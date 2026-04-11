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
  let type: "Mobile" | "Tablet" | "Desktop" = "Desktop";

  try {
    const nav = navigator as any;

    /* ---------------- MODERN CHROME API ---------------- */
    if (nav.userAgentData?.getHighEntropyValues) {
      try {
        const data = await nav.userAgentData.getHighEntropyValues([
          "model",
          "platform",
          "platformVersion",
        ]);

        if (data.model) model = data.model;
        if (data.platform) os = data.platform;
        if (data.platformVersion) os += ` ${data.platformVersion}`;
      } catch {
        // ignore
      }
    }

    /* ---------------- FIX: UAParser SAFE INIT ---------------- */
    const UAParser: any =
      (UAParserModule as any).default ??
      (UAParserModule as any).UAParser ??
      UAParserModule;

    const parser =
      typeof UAParser === "function"
        ? new UAParser()
        : new (UAParser as any)();

    const result = parser.getResult();

    const device = result.device || {};
    const osData = result.os || {};
    const browserData = result.browser || {};

    /* ---------------- BRAND ---------------- */
    brand = device.vendor || "Unknown";

    /* ---------------- MODEL ---------------- */
    if (model === "Unknown") {
      model = device.model || "Unknown";
    }

    /* ---------------- SMART FALLBACKS ---------------- */
    const ua = navigator.userAgent;

    if (model === "Unknown") {
      if (ua.includes("SM-")) model = "Samsung Galaxy";
      else if (ua.includes("RMX")) model = "Realme";
      else if (ua.includes("Redmi")) model = "Xiaomi Redmi";
    }

    /* ---------------- OS ---------------- */
    if (os === "Unknown") {
      os = osData.name || "Unknown";
      if (osData.version) os += ` ${osData.version}`;
    }

    /* ---------------- BROWSER ---------------- */
    browser = browserData.name || "Unknown";
    if (browserData.version) {
      browser += ` ${browserData.version}`;
    }

    /* ---------------- DEVICE TYPE ---------------- */
    if (device.type === "mobile") type = "Mobile";
    else if (device.type === "tablet") type = "Tablet";
    else if (navigator.maxTouchPoints > 2) type = "Mobile";
    else type = "Desktop";

    console.info("📱 Device Detected:", {
      brand,
      model,
      os,
      browser,
      type,
    });
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