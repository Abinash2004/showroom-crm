import { APP_TIMEZONE, APP_TZ_OFFSET_MINUTES } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: APP_TIMEZONE });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE });
const stampDayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: APP_TIMEZONE });
const stampTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: APP_TIMEZONE });
const cardTimeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: APP_TIMEZONE });

/**
 * Calendar day in showroom time (IST). Visit and interaction dates are server timestamps; older records
 * were stored at UTC midnight (05:30 IST), which still falls on the same IST day.
 */
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso));

/** "29 Nov 2026 | 08:00 PM" in showroom time (IST). Used by the read-only date fields. */
export function formatStamp(iso: string): string {
  const d = new Date(iso);
  return `${stampDayFmt.format(d)} | ${stampTimeFmt.format(d)}`;
}

/** "27 Nov 2026 | 8:00 PM" in showroom time (IST): the lead and follow-up cards. */
export function formatCardStamp(iso: string): string {
  const d = new Date(iso);
  return `${stampDayFmt.format(d)} | ${cardTimeFmt.format(d)}`;
}
export const formatDateTime = (iso: string): string => dateTimeFmt.format(new Date(iso));
const shortDateFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });
const shortDateYearFmt = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** "5 Nov" for an ISO day; adds the year when it differs from `refYear`. */
export const formatShortDate = (isoDay: string, refYear?: string): string => {
  const d = new Date(`${isoDay}T00:00:00.000Z`);
  return refYear && isoDay.slice(0, 4) !== refYear ? shortDateYearFmt.format(d) : shortDateFmt.format(d);
};
/** Groups 10-digit Indian mobile numbers as "98863 58887" for readability; other formats are left as entered. */
export function formatPhone(phone: string): string {
  return /^\d{10}$/.test(phone) ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

export const todayInputDate = (): string => new Date(Date.now() + APP_TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
/** "just now", "5 min ago", "2 h ago", or the date and time when older than a day. */
export function formatAgo(iso: string, nowMs: number): string {
  const minutes = Math.floor((nowMs - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatDateTime(iso);
}

/** 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 11 -> "11th", 22 -> "22nd". */
export function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/** "Abinash Parida" -> "AP", "Ayushi" -> "A". Pure, so server and client components can both use it. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase() || "?";
}
