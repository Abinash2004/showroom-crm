const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Next local midnight (strictly after `now`) for a fixed UTC offset. O(1). */
export function nextMidnight(now: Date, offsetMinutes: number): Date {
  const local = now.getTime() + offsetMinutes * MINUTE_MS;
  const nextLocal = (Math.floor(local / DAY_MS) + 1) * DAY_MS;
  return new Date(nextLocal - offsetMinutes * MINUTE_MS);
}
