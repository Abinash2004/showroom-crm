export interface DeviceInfo {
  /** e.g. "Chrome on Android" */
  label: string;
  kind: "phone" | "tablet" | "desktop";
}

// Order matters: Edge and Opera include "Chrome", Chrome includes "Safari".
const BROWSERS: [RegExp, string][] = [
  [/EdgA?\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/SamsungBrowser\//, "Samsung Internet"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMS: [RegExp, string][] = [
  [/Android/, "Android"],
  [/iPhone|iPod/, "iPhone"],
  [/iPad/, "iPad"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/CrOS/, "ChromeOS"],
  [/Linux/, "Linux"],
];

/** Short, human device description from a user-agent string. O(patterns). */
export function describeDevice(ua: string): DeviceInfo {
  const browser = BROWSERS.find(([re]) => re.test(ua))?.[1];
  const system = SYSTEMS.find(([re]) => re.test(ua))?.[1];
  const tablet = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua));
  const phone = !tablet && /Mobile|iPhone|Android/.test(ua);
  const label = browser && system ? `${browser} on ${system}` : (browser ?? system ?? "Unknown device");
  return { label, kind: tablet ? "tablet" : phone ? "phone" : "desktop" };
}

/**
 * Readable client address: loopback becomes "Local", IPv4-mapped IPv6 ("::ffff:1.2.3.4") is
 * shown as plain IPv4, and a missing address as "Unknown network".
 */
export function describeIp(ip: string): string {
  const raw = ip.trim();
  if (!raw || raw === "unknown") return "Unknown network";
  if (raw === "::1" || raw === "127.0.0.1" || raw === "::ffff:127.0.0.1") return "Local";
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(raw);
  return mapped?.[1] ?? raw;
}
