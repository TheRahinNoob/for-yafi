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

    /* ---------------- ULTRA MODE: Modern High-Entropy API (Chrome/Edge/Android) ---------------- */
    if (nav.userAgentData?.getHighEntropyValues) {
      try {
        const highEntropy = await nav.userAgentData.getHighEntropyValues([
          "model",
          "platform",
          "platformVersion",
          "architecture",
          "bitness",
          "fullVersionList",
        ]);

        if (highEntropy.model && highEntropy.model !== "") {
          model = highEntropy.model;
        }
        if (highEntropy.platform) {
          os = highEntropy.platform;
        }
        if (highEntropy.platformVersion) {
          os += ` ${highEntropy.platformVersion}`;
        }
      } catch (err) {
        console.warn("High-entropy API failed (normal on some browsers)", err);
      }
    }

    /* ---------------- FIXED UA-PARSER INIT (works with both ESM and CommonJS) ---------------- */
    const UAParser: any =
      (UAParserModule as any).default || UAParserModule;

    const parser = new UAParser(navigator.userAgent);
    const result = parser.getResult();

    const deviceData = result.device;
    const osData = result.os;
    const browserData = result.browser;

    /* ---------------- BRAND & MODEL (Ultra fallback logic) ---------------- */
    if (deviceData.vendor && deviceData.vendor !== "unknown") {
      brand = deviceData.vendor;
    }

    // If model is still Unknown, use UA-Parser model
    if (model === "Unknown" || model === "") {
      model = deviceData.model || "Unknown";
    }

    // Special BD/common device improvements
    if (model === "Unknown" && navigator.userAgent.includes("SM-")) {
      model = "Samsung Galaxy";
    } else if (model === "Unknown" && navigator.userAgent.includes("RMX")) {
      model = "Realme";
    } else if (model === "Unknown" && navigator.userAgent.includes("Redmi")) {
      model = "Xiaomi Redmi";
    }

    /* ---------------- OS (Ultra fallback) ---------------- */
    if (os === "Unknown" || os === "") {
      os = osData.name || "Unknown";
      if (osData.version) os += ` ${osData.version}`;
    }

    /* ---------------- BROWSER ---------------- */
    if (browserData.name) {
      browser = browserData.name;
      if (browserData.version) browser += ` ${browserData.version}`;
    }

    /* ---------------- DEVICE TYPE (Ultra accurate) ---------------- */
    if (deviceData.type === "mobile" || deviceData.type === "wearable") {
      type = "Mobile";
    } else if (deviceData.type === "tablet") {
      type = "Tablet";
    } else if (navigator.maxTouchPoints > 2 || "ontouchstart" in window) {
      // Extra touch detection for hybrid devices
      type = "Mobile";
    } else {
      type = "Desktop";
    }

    /* ---------------- FINAL LOG FOR DEBUGGING ---------------- */
    console.info("📱 Ultra Device Detected:", {
      brand,
      model,
      os,
      browser,
      type,
    });
  } catch (err) {
    console.warn("Device detection failed (fallback to basic info):", err);
  }

  return {
    model,
    brand,
    os,
    browser,
    type,
  };
}