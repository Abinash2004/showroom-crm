import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "./connection";
import { SessionModel, UserModel } from "./models";
import { oid } from "./helpers";
import type {
  ActiveSession,
  AuthUserRecord,
  NewSession,
  SessionRepository,
  UserAuthRepository,
} from "@/lib/auth/ports";

interface LeanAuthUser {
  _id: Types.ObjectId;
  name: string;
  code: string;
  phone: string;
  passwordHash?: string | null;
  isActive: boolean;
  isAdmin: boolean;
  branchIds: Types.ObjectId[];
  failedAttempt: number;
  lockedUntil?: Date | null;
}

export class MongoUserAuthRepository implements UserAuthRepository {
  async findByPhone(phone: string): Promise<AuthUserRecord | null> {
    await connectDb();
    const u = await UserModel.findOne({ phone }).select("+passwordHash").lean<LeanAuthUser>();
    if (!u) return null;
    return {
      id: u._id.toHexString(),
      name: u.name,
      code: u.code,
      phone: u.phone,
      passwordHash: u.passwordHash ?? null,
      isActive: u.isActive,
      isAdmin: u.isAdmin,
      branchIds: u.branchIds.map((b) => b.toHexString()),
      failedAttempt: u.failedAttempt,
      lockedUntil: u.lockedUntil ?? null,
    };
  }

  async setPasswordIfUnset(userId: string, passwordHash: string, now: Date): Promise<boolean> {
    await connectDb();
    const res = await UserModel.updateOne(
      { _id: oid(userId), $or: [{ passwordHash: null }, { passwordHash: { $exists: false } }] },
      { $set: { passwordHash, failedAttempt: 0, lockedUntil: null, updatedAt: now } },
    );
    return res.modifiedCount === 1;
  }

  async registerFailure(userId: string): Promise<number> {
    await connectDb();
    const u = await UserModel.findByIdAndUpdate(oid(userId), { $inc: { failedAttempt: 1 } }, { returnDocument: "after", lean: true });
    return u?.failedAttempt ?? 0;
  }

  async lock(userId: string, until: Date): Promise<void> {
    await connectDb();
    await UserModel.updateOne({ _id: oid(userId) }, { $set: { lockedUntil: until, failedAttempt: 0 } });
  }

  async registerSuccess(userId: string, now: Date): Promise<void> {
    await connectDb();
    await UserModel.updateOne({ _id: oid(userId) }, { $set: { failedAttempt: 0, lockedUntil: null, lastLoginAt: now } });
  }
}

export class MongoSessionRepository implements SessionRepository {
  async create(s: NewSession): Promise<void> {
    await connectDb();
    await SessionModel.create({
      userId: oid(s.userId),
      tokenHash: s.tokenHash,
      userIp: s.userIp,
      userAgent: s.userAgent,
      lastActiveAt: s.now,
      expiresAt: s.expiresAt,
      revokedAt: null,
    });
  }

  async findActive(tokenHash: string, now: Date): Promise<ActiveSession | null> {
    await connectDb();
    const session = await SessionModel.findOne({ tokenHash, revokedAt: null, expiresAt: { $gt: now } })
      .select({ userId: 1, lastActiveAt: 1 })
      .lean<{ _id: Types.ObjectId; userId: Types.ObjectId; lastActiveAt: Date }>();
    if (!session) return null;
    const user = await UserModel.findOne({ _id: session.userId, isActive: true })
      .select({ name: 1, isAdmin: 1, branchIds: 1 })
      .lean<{ _id: Types.ObjectId; name: string; isAdmin: boolean; branchIds: Types.ObjectId[] }>();
    if (!user) return null;
    return {
      sessionId: session._id.toHexString(),
      lastActiveAt: session.lastActiveAt,
      actor: {
        id: user._id.toHexString(),
        name: user.name,
        isAdmin: user.isAdmin,
        branchIds: user.branchIds.map((b) => b.toHexString()),
      },
    };
  }

  async touch(sessionId: string, now: Date): Promise<void> {
    await connectDb();
    await SessionModel.updateOne({ _id: oid(sessionId) }, { $set: { lastActiveAt: now } });
  }

  async revokeByTokenHash(tokenHash: string, now: Date): Promise<void> {
    await connectDb();
    await SessionModel.updateOne({ tokenHash, revokedAt: null }, { $set: { revokedAt: now } });
  }
}
