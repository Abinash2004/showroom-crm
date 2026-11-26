export const LEAD_STATUSES = ["Opened", "Booked", "Rejected", "Purchased"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const ACTIVITY_ENTITIES = ["branch", "user", "lead", "interaction"] as const;
export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];

export const ACTIVITY_ACTIONS = ["create", "update", "delete"] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

/** Daily session reset happens at local midnight in this zone (IST has no DST, so a fixed offset is exact). */
export const APP_TIMEZONE = "Asia/Kolkata";
export const APP_TZ_OFFSET_MINUTES = 330;

export const AUTH_POLICY = {
  maxFailedAttempts: 5,
  lockMinutes: 15,
  touchIntervalMs: 60_000,
} as const;

export interface RateLimitRule {
  readonly limit: number;
  readonly windowSec: number;
}

export const RATE_LIMITS = {
  loginIp: { limit: 30, windowSec: 900 },
  loginPhone: { limit: 10, windowSec: 900 },
  signupIp: { limit: 20, windowSec: 900 },
  signupPhone: { limit: 8, windowSec: 900 },
  write: { limit: 60, windowSec: 60 },
} as const satisfies Record<string, RateLimitRule>;

export const PAGE_SIZE = 20;
/** Lead list is browsed on phones: smaller pages keep each screen quick to scan. */
export const LEAD_PAGE_SIZE = 10;
export const FOLLOW_UP_PAGE_SIZE = 10;
