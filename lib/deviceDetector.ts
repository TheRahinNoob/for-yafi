/**
 * ██████████████████████████████████████████████████████████████
 * DEVICE DETECTOR – ULTRA SOPHISTICATED EDITION (v3.0)
 * 
 * Captures EVERY possible detail about the target device:
 * • Hardware (CPU, RAM, GPU)
 * • Display & Screen
 * • Browser + OS (with high entropy)
 * • System preferences (language, timezone, dark mode)
 * • Device type with smart fallbacks
 * 
 * All data is sent to Firebase automatically from Sender.tsx
 * ██████████████████████████████████████████████████████████████
 */

import * as UAParserModule from "ua-parser-js";

export type DeviceInfo = {
  // Basic Info (kept for backward compatibility)
  brand: string;
  model: string;
  os: string;
  browser: string;
  type: "Mobile" | "Tablet" | "Desktop";

  // ── NEW SOPHISTICATED FIELDS ──
  osVersion?: string;
  browserVersion?: string;

  // Hardware
  cpuCores?: number;           // navigator.hardwareConcurrency
  ramGB?: number;              // navigator.deviceMemory (approximate)
  webGLVendor?: string;
  webGLRenderer?: string;

  // Display & Screen
  screenWidth?: number;
  screenHeight?: number;
  pixelRatio?: number;
  colorDepth?: number;
  orientation?: "portrait" | "landscape";
  touchPoints?: number;

  // System & Locale
  language?: string;
  timezone?: string;
  darkMode?: boolean;

  // Extra
  userAgent?: string;          // raw UA (for debugging)
  highEntropyAvailable?: boolean;
};

export async function getDeviceInfo(): Promise<DeviceInfo> {
  const info: DeviceInfo = {
    brand: "Unknown",
    model: "Unknown",
    os: "Unknown",
    browser: "Unknown",
    type: "Desktop",
  };

  try {
    const nav = navigator as any;
    const ua = navigator.userAgent;

    /* ==================== 1. HIGH ENTROPY UA (Chrome/Android) ==================== */
    if (nav.userAgentData?.getHighEntropyValues) {
      try {
        const data = await nav.userAgentData.getHighEntropyValues([
          "model",
          "platform",
          "platformVersion",
          "fullVersionList",
        ]);

        info.highEntropyAvailable = true;

        if (data.model) info.model = data.model;
        if (data.platform) info.os = data.platform;
        if (data.platformVersion) info.osVersion = data.platformVersion;
      } catch {
        // ignore
      }
    }

    /* ==================== 2. UA PARSER (Most Reliable) ==================== */
    const UAParser: any =
      (UAParserModule as any).default ??
      (UAParserModule as any).UAParser ??
      UAParserModule;

    const parser = typeof UAParser === "function" ? new UAParser() : new (UAParser as any)();
    const result = parser.getResult();

    // Brand & Model
    info.brand = result.device?.vendor || info.brand;
    if (info.model === "Unknown") info.model = result.device?.model || "Unknown";

    // OS
    if (info.os === "Unknown") {
      info.os = result.os?.name || "Unknown";
      info.osVersion = result.os?.version || undefined;
    }

    // Browser
    info.browser = result.browser?.name || "Unknown";
    if (result.browser?.version) {
      info.browser += ` ${result.browser.version}`;
      info.browserVersion = result.browser.version;
    }

    /* ==================== 3. SMART FALLBACKS FOR BANGLADESH DEVICES ==================== */
    if (info.model === "Unknown") {
      if (ua.includes("SM-")) info.model = "Samsung Galaxy";
      else if (ua.includes("RMX")) info.model = "Realme";
      else if (ua.includes("Redmi") || ua.includes("Xiaomi")) info.model = "Xiaomi Redmi";
      else if (ua.includes("Pixel")) info.model = "Google Pixel";
    }

    /* ==================== 4. HARDWARE ==================== */
    info.cpuCores = nav.hardwareConcurrency || undefined;
    if (nav.deviceMemory) {
      info.ramGB = nav.deviceMemory; // returns 4, 8, 16 etc.
    }

    /* ==================== 5. WEBGL GPU INFO (FIXED TYPE ERRORS) ==================== */
    try {
      const canvas = document.createElement("canvas");
      
      // Explicitly type as WebGLRenderingContext to fix TS errors
      let gl: WebGLRenderingContext | null = null;
      
      // Try both standard and experimental WebGL contexts
      gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          info.webGLVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || undefined;
          info.webGLRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || undefined;
        }
      }
    } catch {
      // ignore if WebGL is blocked or not supported
    }

    /* ==================== 6. DISPLAY & SCREEN ==================== */
    info.screenWidth = window.screen.width;
    info.screenHeight = window.screen.height;
    info.pixelRatio = window.devicePixelRatio || 1;
    info.colorDepth = window.screen.colorDepth || undefined;
    info.touchPoints = nav.maxTouchPoints || 0;

    // Orientation
    info.orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";

    /* ==================== 7. SYSTEM PREFERENCES ==================== */
    info.language = navigator.language || undefined;
    try {
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}

    // Dark mode
    try {
      info.darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {}

    /* ==================== 8. DEVICE TYPE (Most Accurate) ==================== */
    if (result.device?.type === "mobile" || nav.maxTouchPoints > 2) {
      info.type = "Mobile";
    } else if (result.device?.type === "tablet") {
      info.type = "Tablet";
    } else {
      info.type = "Desktop";
    }

    /* ==================== 9. RAW UA (for debugging) ==================== */
    info.userAgent = ua.substring(0, 300); // limit length

    console.info("📱 [DEVICE DETECTOR] Full Profile Captured:", info);
  } catch (err) {
    console.warn("❌ Device detection failed partially:", err);
  }

  return info;
}