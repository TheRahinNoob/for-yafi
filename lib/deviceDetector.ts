/**
 * ██████████████████████████████████████████████████████████████
 * DEVICE DETECTOR – ULTRA SPY GRADE EDITION (v6.0)
 * 
 * 🔥 MAJOR UPGRADE:
 *   • Full Battery Status API (percentage + charging + time to full/empty)
 *   • Network Connection API (effective type, speed, RTT, save-data)
 *   • Fixed critical CPU hint bug (WebGL now runs BEFORE Android MediaTek detection)
 *   • Live battery listener (symmetric to live gyro)
 *   • Stronger CPU hint logic + better Infinity handling for battery
 *   • All previous v5.6 features 100% preserved (high-entropy UA, gyro, fingerprints, etc.)
 *   • Fully TypeScript-error-free, zero new dependencies
 * 
 * Use with consent only. Call getDeviceInfo() when user opens your tracking link.
 * ██████████████████████████████████████████████████████████████
 */

import * as UAParserModule from "ua-parser-js";

export type DeviceInfo = {
  // Basic Info
  brand: string;
  model: string;
  os: string;
  browser: string;
  type: "Mobile" | "Tablet" | "Desktop";

  // Core
  osVersion?: string;
  browserVersion?: string;

  // Hardware
  cpuCores?: number;
  ramGB?: number;
  ramGBApprox?: boolean;
  cpuModelHint?: string;
  webGLVendor?: string;
  webGLRenderer?: string;
  gpuDetailed?: string;

  // Display
  screenWidth?: number;
  screenHeight?: number;
  availWidth?: number;
  availHeight?: number;
  pixelRatio?: number;
  colorDepth?: number;
  colorGamut?: "sRGB" | "P3" | "Rec2020";
  isHDR?: boolean;
  orientation?: "portrait" | "landscape";

  // Touch & Input
  touchPoints?: number;
  isTouchDevice?: boolean;

  // System & Locale
  language?: string;
  languages?: readonly string[];
  timezone?: string;
  darkMode?: boolean;
  prefersReducedMotion?: boolean;
  prefersReducedData?: boolean;
  prefersContrast?: "high" | "no-preference";
  doNotTrack?: string | null;
  cookieEnabled?: boolean;

  // Browser / Platform
  platform?: string;
  vendor?: string;

  // Mobile-Specific
  isStandalone?: boolean;
  isMobileApp?: boolean;

  // 🔥 GYROSCOPE / HOLDING ANGLE
  orientationAlpha?: number;
  orientationBeta?: number;
  orientationGamma?: number;
  orientationAbsolute?: boolean;

  // 🔥 NEW: BATTERY STATUS (v6.0)
  batteryLevel?: number;          // 0.0 – 1.0 (percentage / 100)
  isCharging?: boolean;
  chargingTime?: number | null;   // seconds until full (null = unknown/not charging)
  dischargingTime?: number | null;// seconds until empty (null = unknown/charging)

  // 🔥 NEW: NETWORK CONNECTION (v6.0)
  connectionEffectiveType?: string; // "slow-2g" | "2g" | "3g" | "4g"
  connectionDownlink?: number;      // Mbps
  connectionRtt?: number;           // ms round-trip time
  connectionSaveData?: boolean;

  // Ultra Spy Fingerprints
  canvasFingerprint?: string;
  webglFingerprint?: string;
  audioFingerprint?: string;

  // Extra
  userAgent?: string;
  highEntropyAvailable?: boolean;
};

/* ==================== SIMPLE HASH FOR FINGERPRINTS ==================== */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).padStart(8, "0");
}

/* ==================== GET CURRENT GYRO ORIENTATION (one-shot) ==================== */
async function getCurrentOrientation(): Promise<{
  alpha?: number;
  beta?: number;
  gamma?: number;
  absolute?: boolean;
}> {
  return new Promise((resolve) => {
    if (!("DeviceOrientationEvent" in window)) {
      return resolve({});
    }

    let resolved = false;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      if (resolved) return;
      resolved = true;
      window.removeEventListener("deviceorientation", handleOrientation);
      resolve({
        alpha: event.alpha ?? undefined,
        beta: event.beta ?? undefined,
        gamma: event.gamma ?? undefined,
        absolute: event.absolute ?? undefined,
      });
    };

    const requestPermissionIfNeeded = async () => {
      const anyEvent = DeviceOrientationEvent as any;
      if (typeof anyEvent.requestPermission === "function") {
        try {
          const permission = await anyEvent.requestPermission();
          if (permission !== "granted") return resolve({});
        } catch {
          return resolve({});
        }
      }
      window.addEventListener("deviceorientation", handleOrientation, { once: true });
    };

    requestPermissionIfNeeded().catch(() => resolve({}));
  });
}

/* ==================== LIVE ORIENTATION HELPER ==================== */
export function startLiveOrientation(
  callback: (data: {
    alpha?: number;
    beta?: number;
    gamma?: number;
    absolute?: boolean;
  }) => void
) {
  if (!("DeviceOrientationEvent" in window)) return () => {};

  let lastSent = Date.now();

  const handler = (event: DeviceOrientationEvent) => {
    const now = Date.now();
    if (now - lastSent < 300) return;

    lastSent = now;
    callback({
      alpha: event.alpha ?? undefined,
      beta: event.beta ?? undefined,
      gamma: event.gamma ?? undefined,
      absolute: event.absolute ?? undefined,
    });
  };

  const requestPermission = async () => {
    const anyEvent = DeviceOrientationEvent as any;
    if (typeof anyEvent.requestPermission === "function") {
      try {
        const perm = await anyEvent.requestPermission();
        if (perm !== "granted") return;
      } catch {}
    }
    window.addEventListener("deviceorientation", handler);
  };

  requestPermission();

  return () => {
    window.removeEventListener("deviceorientation", handler);
  };
}

/* ==================== BATTERY STATUS (snapshot) – v6.0 ==================== */
async function getBatteryStatus(): Promise<{
  level?: number;
  charging?: boolean;
  chargingTime?: number | null;
  dischargingTime?: number | null;
}> {
  if (!("getBattery" in navigator)) {
    return {};
  }

  try {
    const battery = await (navigator as any).getBattery();
    return {
      level: battery.level,
      charging: battery.charging,
      chargingTime: battery.chargingTime === Infinity ? null : battery.chargingTime,
      dischargingTime: battery.dischargingTime === Infinity ? null : battery.dischargingTime,
    };
  } catch {
    return {};
  }
}

/* ==================== LIVE BATTERY HELPER (v6.0) ==================== */
export function startLiveBattery(
  callback: (data: {
    batteryLevel?: number;
    isCharging?: boolean;
    chargingTime?: number | null;
    dischargingTime?: number | null;
  }) => void
) {
  if (!("getBattery" in navigator)) return () => {};

  let batteryManager: any = null;

  const update = () => {
    if (!batteryManager) return;
    const level = batteryManager.level;
    const charging = batteryManager.charging;
    const chargingTime = batteryManager.chargingTime === Infinity ? null : batteryManager.chargingTime;
    const dischargingTime = batteryManager.dischargingTime === Infinity ? null : batteryManager.dischargingTime;

    callback({
      batteryLevel: level,
      isCharging: charging,
      chargingTime,
      dischargingTime,
    });
  };

  (navigator as any)
    .getBattery()
    .then((battery: any) => {
      batteryManager = battery;
      update();
      battery.addEventListener("levelchange", update);
      battery.addEventListener("chargingchange", update);
      battery.addEventListener("chargingtimechange", update);
      battery.addEventListener("dischargingtimechange", update);
    })
    .catch(() => {});

  // Cleanup is best-effort (listeners are removed on page unload anyway)
  return () => {
    if (batteryManager) {
      batteryManager.removeEventListener("levelchange", update);
      batteryManager.removeEventListener("chargingchange", update);
      batteryManager.removeEventListener("chargingtimechange", update);
      batteryManager.removeEventListener("dischargingtimechange", update);
    }
  };
}

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

    /* ==================== 1. HIGH ENTROPY UA ==================== */
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
      } catch {}
    }

    /* ==================== 2. UA PARSER ==================== */
    const UAParser: any =
      (UAParserModule as any).default ??
      (UAParserModule as any).UAParser ??
      UAParserModule;

    const parser = typeof UAParser === "function" ? new UAParser(ua) : new (UAParser as any)(ua);
    const result = parser.getResult();

    info.brand = result.device?.vendor || info.brand;
    if (info.model === "Unknown") info.model = result.device?.model || "Unknown";

    if (info.os === "Unknown") {
      info.os = result.os?.name || "Unknown";
      info.osVersion = result.os?.version || undefined;
    }

    info.browser = result.browser?.name || "Unknown";
    if (result.browser?.version) {
      info.browser += ` ${result.browser.version}`;
      info.browserVersion = result.browser.version;
    }

    /* ==================== 3. BRAND FIX ==================== */
    if (info.brand === "Unknown" || info.brand === "") {
      const modelLower = info.model.toLowerCase();
      if (modelLower.startsWith("sm-") || ua.includes("SAMSUNG")) {
        info.brand = "Samsung";
      } else if (modelLower.includes("rmx")) info.brand = "Realme";
      else if (modelLower.includes("redmi") || modelLower.includes("xiaomi")) info.brand = "Xiaomi";
      else if (modelLower.includes("pixel")) info.brand = "Google";
    }

    /* ==================== 4. HARDWARE (cores + RAM + basic CPU) ==================== */
    info.cpuCores = nav.hardwareConcurrency || undefined;
    if (nav.deviceMemory) {
      info.ramGB = nav.deviceMemory;
      info.ramGBApprox = true;
    }

    if (ua.includes("Intel")) info.cpuModelHint = "Intel";
    else if (ua.includes("AMD")) info.cpuModelHint = "AMD";
    else if (ua.includes("Apple") && (info.os.toLowerCase().includes("ios") || info.os.toLowerCase().includes("mac"))) {
      info.cpuModelHint = "Apple Silicon";
    }

    /* ==================== 5. WEBGL GPU ==================== */
    try {
      const canvas = document.createElement("canvas");
      let gl: WebGLRenderingContext | null = null;
      gl = (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

      if (gl) {
        const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
        if (debugInfo) {
          info.webGLVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || undefined;
          info.webGLRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || undefined;
          info.gpuDetailed = `${info.webGLVendor || ""} | ${info.webGLRenderer || ""}`.trim();
        }

        const webglHash = `${info.webGLVendor || ""}${info.webGLRenderer || ""}${gl.getParameter(gl.VERSION)}`;
        info.webglFingerprint = simpleHash(webglHash);
      }
    } catch {}

    /* ==================== 5.5 CPU HINT FOR ANDROID (STRENGTHENED – now AFTER WebGL) ==================== */
    if (!info.cpuModelHint && info.os.toLowerCase().includes("android")) {
      const rendererLower = (info.webGLRenderer || "").toLowerCase();
      const vendorLower = (info.webGLVendor || "").toLowerCase();
      if (rendererLower.includes("mali") || vendorLower.includes("arm") || rendererLower.includes("mediatek")) {
        info.cpuModelHint = "MediaTek";
      } else if (ua.includes("Exynos")) info.cpuModelHint = "Exynos";
      else if (ua.includes("Snapdragon") || ua.includes("SM")) info.cpuModelHint = "Snapdragon";
      else info.cpuModelHint = "ARM (Mobile)";
    }

    /* ==================== 6. DISPLAY ==================== */
    info.screenWidth = window.screen.width;
    info.screenHeight = window.screen.height;
    info.availWidth = window.screen.availWidth;
    info.availHeight = window.screen.availHeight;
    info.pixelRatio = window.devicePixelRatio || 1;
    info.colorDepth = window.screen.colorDepth || undefined;
    info.orientation = window.innerWidth > window.innerHeight ? "landscape" : "portrait";

    info.colorGamut = window.matchMedia("(color-gamut: p3)").matches
      ? "P3"
      : window.matchMedia("(color-gamut: rec2020)").matches
      ? "Rec2020"
      : "sRGB";
    info.isHDR = info.colorGamut !== "sRGB";

    /* ==================== 7. SYSTEM PREFERENCES ==================== */
    info.language = navigator.language || undefined;
    info.languages = navigator.languages || [];
    try {
      info.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {}
    info.darkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
    info.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    info.prefersReducedData = window.matchMedia("(prefers-reduced-data: reduce)").matches;
    info.prefersContrast = window.matchMedia("(prefers-contrast: high)").matches ? "high" : "no-preference";
    info.doNotTrack = navigator.doNotTrack || null;
    info.cookieEnabled = navigator.cookieEnabled;

    /* ==================== 8. BROWSER & PLATFORM ==================== */
    info.platform = navigator.platform;
    info.vendor = navigator.vendor;

    /* ==================== 9. MOBILE / DESKTOP SPECIFIC ==================== */
    info.touchPoints = nav.maxTouchPoints || 0;
    info.isTouchDevice = (info.touchPoints ?? 0) > 0;
    info.isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    info.isMobileApp = info.isStandalone || (typeof (navigator as any).standalone !== "undefined" && (navigator as any).standalone === true);

    /* ==================== 10. DEVICE TYPE ==================== */
    if (result.device?.type === "mobile" || (info.touchPoints ?? 0) > 2) {
      info.type = "Mobile";
    } else if (result.device?.type === "tablet") {
      info.type = "Tablet";
    } else {
      info.type = "Desktop";
    }

    /* ==================== 11. GYROSCOPE (one-shot) ==================== */
    const gyro = await getCurrentOrientation();
    info.orientationAlpha = gyro.alpha;
    info.orientationBeta = gyro.beta;
    info.orientationGamma = gyro.gamma;
    info.orientationAbsolute = gyro.absolute;

    /* ==================== 12. 🔥 BATTERY STATUS (v6.0) ==================== */
    const batteryInfo = await getBatteryStatus();
    info.batteryLevel = batteryInfo.level;
    info.isCharging = batteryInfo.charging;
    info.chargingTime = batteryInfo.chargingTime;
    info.dischargingTime = batteryInfo.dischargingTime;

    /* ==================== 13. 🌐 NETWORK CONNECTION (v6.0) ==================== */
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (connection) {
      info.connectionEffectiveType = connection.effectiveType;
      info.connectionDownlink = typeof connection.downlink === "number" ? connection.downlink : undefined;
      info.connectionRtt = typeof connection.rtt === "number" ? connection.rtt : undefined;
      info.connectionSaveData = !!connection.saveData;
    }

    /* ==================== 14. FINGERPRINTS ==================== */
    try {
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      if (ctx) {
        c.width = 220;
        c.height = 60;
        ctx.textBaseline = "top";
        ctx.font = "18px Arial";
        ctx.fillStyle = "#f60";
        ctx.fillRect(0, 0, 220, 60);
        ctx.fillStyle = "#069";
        ctx.fillText("🕵️‍♂️ SpyTracker", 12, 32);
        const dataUrl = c.toDataURL();
        info.canvasFingerprint = simpleHash(dataUrl);
      }
    } catch {}

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const compressor = audioContext.createDynamicsCompressor();
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.connect(compressor);
      compressor.connect(audioContext.destination);
      oscillator.start(0);

      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.3, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) {
        data[i] = Math.sin(i * 0.01) * 0.8;
      }
      const audioHash = Array.from(data.slice(0, 200)).join("").substring(0, 300);
      info.audioFingerprint = simpleHash(audioHash);
    } catch {}

    /* ==================== 15. RAW UA ==================== */
    info.userAgent = ua.substring(0, 300);

    console.info("🕵️‍♂️ [DEVICE DETECTOR v6.0] ULTRA SPY PROFILE CAPTURED (battery + network + live helpers):", info);
  } catch (err) {
    console.warn("❌ Device detection failed partially:", err);
  }

  return info;
}