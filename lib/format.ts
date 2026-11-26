import { APP_TIMEZONE, APP_TZ_OFFSET_MINUTES } from "@/lib/constants";

const dateFmt = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
const dateTimeFmt = new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: APP_TIMEZONE });

/** Date-only values (visit date, interaction date) are stored at UTC midnight and shown in UTC. */
export const formatDate = (iso: string): string => dateFmt.format(new Date(iso));
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

export const toInputDate = (iso: string): string => iso.slice(0, 10);
export const todayInputDate = (): string => new Date(Date.now() + APP_TZ_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
/** "just now", "5 min ago", "2 h ago", or the date and time when older than a day. */
export function formatAgo(iso: string, nowMs: number): string {
  const minutes = Math.floor((nowMs - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} h ago`;
  return formatDateTime(iso);
}