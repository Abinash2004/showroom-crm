import { formatShortDate } from "@/lib/format";

const DAY_MS = 86_400_000;

/** Shifts an ISO day (YYYY-MM-DD) by whole days. O(1). */
export function shiftIsoDate(isoDay: string, days: number): string {
  return new Date(Date.parse(`${isoDay}T00:00:00.000Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export interface DatePreset {
  id: "today" | "yesterday" | "7d" | "month";
  label: string;
  from: string;
  to: string;
}

/** One-tap visit-date ranges relative to `today` (an ISO day in the showroom timezone). */
export function datePresets(today: string): DatePreset[] {
  const yesterday = shiftIsoDate(today, -1);
  return [
    { id: "today", label: "Today", from: today, to: today },
    { id: "yesterday", label: "Yesterday", from: yesterday, to: yesterday },
    { id: "7d", label: "Last 7 days", from: shiftIsoDate(today, -6), to: today },
    { id: "month", label: "This month", from: `${today.slice(0, 8)}01`, to: today },
  ];
}

export function matchPreset(presets: DatePreset[], from?: string, to?: string): DatePreset | undefined {
  if (!from || !to) return undefined;
  return presets.find((p) => p.from === from && p.to === to);
}

/** Human label for an arbitrary range, e.g. "1 Nov - 5 Nov", "From 1 Nov", "Until 5 Nov". */
export function describeDateRange(from: string | undefined, to: string | undefined, today: string): string | undefined {
  const year = today.slice(0, 4);
  if (from && to) return from === to ? formatShortDate(from, year) : `${formatShortDate(from, year)} - ${formatShortDate(to, year)}`;
  if (from) return `From ${formatShortDate(from, year)}`;
  if (to) return `Until ${formatShortDate(to, year)}`;
  return undefined;
}

export const isoMonth = (isoDay: string): string => isoDay.slice(0, 7);

function splitMonth(month: string): [number, number] {
  const [y, m] = month.split("-").map(Number);
  return [y ?? 1970, m ?? 1];
}

/** Moves a YYYY-MM month by `n` months. */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = splitMonth(month);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
}

/** Sunday-first grid of ISO days for a month, padded with nulls to whole weeks. O(42). */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = splitMonth(month);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export interface DayRange {
  from?: string;
  to?: string;
}

/** Tap logic for a range calendar: first tap sets the start, second sets the end (swapped if earlier). */
export function pickRangeDay(range: DayRange, day: string): DayRange {
  if (!range.from || range.to) return { from: day };
  return day < range.from ? { from: day, to: range.from } : { from: range.from, to: day };
}