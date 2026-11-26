import "server-only";
import { connectDb } from "../connection";
import { ActivityLogModel, BranchModel, SessionModel, UserModel } from "../models";
import { assertAdmin } from "../helpers";
import { APP_TZ_OFFSET_MINUTES } from "@/lib/constants";
import type { Actor } from "@/lib/types";

export interface AdminOverview {
  branches: { total: number; active: number };
  users: { total: number; active: number; pendingSignup: number; locked: number };
  sessions: { active: number };
  activity: { today: number };
}

/** Start of the current day in the showroom timezone, as a UTC instant. */
function startOfToday(now: Date): Date {
  const offset = APP_TZ_OFFSET_MINUTES * 60_000;
  const local = new Date(now.getTime() + offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset);
}

/** Headline counts for the admin hub. All counts run in parallel; each is an indexed or small-collection count. */
export async function adminOverview(actor: Actor): Promise<AdminOverview> {
  assertAdmin(actor);
  await connectDb();
  const now = new Date();
  const [branchTotal, branchActive, userTotal, userActive, pendingSignup, locked, sessions, activityToday] = await Promise.all([
    BranchModel.countDocuments({}),
    BranchModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({}),
    UserModel.countDocuments({ isActive: true }),
    UserModel.countDocuments({ isActive: true, $or: [{ passwordHash: null }, { passwordHash: { $exists: false } }] }),
    UserModel.countDocuments({ lockedUntil: { $gt: now } }),
    SessionModel.countDocuments({ revokedAt: null, expiresAt: { $gt: now } }),
    ActivityLogModel.countDocuments({ createdAt: { $gte: startOfToday(now) } }),
  ]);
  return {
    branches: { total: branchTotal, active: branchActive },
    users: { total: userTotal, active: userActive, pendingSignup, locked },
    sessions: { active: sessions },
    activity: { today: activityToday },
  };
}
