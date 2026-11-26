import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../connection";
import { BranchModel, SessionModel, UserModel } from "../models";
import { assertAdmin, iso, isoOrNull, oid } from "../helpers";
import { logActivity } from "../activity";
import { AppError } from "@/lib/errors";
import { computeChanges, creationChanges } from "@/lib/diff";
import type { ActiveSessionDTO, Actor, UserDTO } from "@/lib/types";
import type { UserCreateInput, UserUpdateInput } from "@/lib/validators/entities";

interface LeanUser {
  _id: Types.ObjectId;
  code: string;
  name: string;
  phone: string;
  passwordHash?: string | null;
  branchIds: Types.ObjectId[];
  isAdmin: boolean;
  isActive: boolean;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
}

const AUDIT_FIELDS = ["code", "name", "phone", "branchIds", "isAdmin", "isActive"] as const;

const toDTO = (u: LeanUser): UserDTO => ({
  id: u._id.toHexString(),
  code: u.code,
  name: u.name,
  phone: u.phone,
  branchIds: u.branchIds.map((b) => b.toHexString()),
  isAdmin: u.isAdmin,
  isActive: u.isActive,
  hasPassword: Boolean(u.passwordHash),
  isLocked: Boolean(u.lockedUntil && u.lockedUntil.getTime() > Date.now()),
  lastLoginAt: isoOrNull(u.lastLoginAt),
  createdAt: iso(u.createdAt),
});

const isDuplicateKey = (err: unknown): boolean => err instanceof Error && /E11000/.test(err.message);

async function assertBranchesExist(branchIds: string[]): Promise<void> {
  if (branchIds.length === 0) return;
  const unique = [...new Set(branchIds)];
  const count = await BranchModel.countDocuments({ _id: { $in: unique.map(oid) } });
  if (count !== unique.length) throw new AppError("VALIDATION", "One or more branches do not exist.", { branchIds: ["Unknown branch"] });
}

export async function listUsers(actor: Actor): Promise<UserDTO[]> {
  assertAdmin(actor);
  await connectDb();
  const rows = await UserModel.find({}).select("+passwordHash").sort({ name: 1 }).lean<LeanUser[]>();
  return rows.map(toDTO);
}

export async function createUser(actor: Actor, input: UserCreateInput, ip: string): Promise<UserDTO> {
  assertAdmin(actor);
  await connectDb();
  const branchIds = input.isAdmin ? [] : input.branchIds;
  await assertBranchesExist(branchIds);
  try {
    const doc = await UserModel.create({
      code: input.code,
      name: input.name,
      phone: input.phone,
      isAdmin: input.isAdmin,
      branchIds: branchIds.map(oid),
      isActive: true,
      createdBy: oid(actor.id),
      updatedBy: oid(actor.id),
    });
    const dto = toDTO(doc.toObject() as LeanUser);
    await logActivity({
      entity: "user",
      entityId: dto.id,
      action: "create",
      changes: creationChanges({ ...dto }, AUDIT_FIELDS),
      actionBy: actor.id,
      actionIP: ip,
    });
    return dto;
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw new AppError("CONFLICT", "A user with this employee code or phone already exists.", {
        code: ["Employee code or phone already in use"],
      });
    }
    throw err;
  }
}

export async function updateUser(actor: Actor, id: string, input: UserUpdateInput, ip: string): Promise<UserDTO> {
  assertAdmin(actor);
  await connectDb();
  const branchIds = input.isAdmin ? [] : input.branchIds;
  await assertBranchesExist(branchIds);
  if (id === actor.id && !input.isAdmin) {
    throw new AppError("FORBIDDEN", "You cannot remove your own administrator access.");
  }
  const before = await UserModel.findById(oid(id)).lean<LeanUser>();
  if (!before) throw new AppError("NOT_FOUND", "User not found.");
  try {
    const after = await UserModel.findByIdAndUpdate(
      before._id,
      { $set: { name: input.name, phone: input.phone, isAdmin: input.isAdmin, branchIds: branchIds.map(oid), updatedBy: oid(actor.id) } },
      { returnDocument: "after", lean: true },
    );
    if (!after) throw new AppError("NOT_FOUND", "User not found.");
    const dtoBefore = toDTO(before);
    const dtoAfter = toDTO(after as unknown as LeanUser);
    const changes = computeChanges({ ...dtoBefore }, { ...dtoAfter }, AUDIT_FIELDS);
    if (Object.keys(changes).length > 0) {
      await logActivity({ entity: "user", entityId: id, action: "update", changes, actionBy: actor.id, actionIP: ip });
    }
    // Authorization is re-read from the DB on every request, so role/branch changes apply immediately.
    return dtoAfter;
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("CONFLICT", "This phone number is already in use.", { phone: ["Already in use"] });
    throw err;
  }
}

/** Deactivating revokes every open session so the user is signed out immediately. */
export async function setUserActive(actor: Actor, id: string, isActive: boolean, ip: string): Promise<void> {
  assertAdmin(actor);
  if (id === actor.id && !isActive) throw new AppError("FORBIDDEN", "You cannot deactivate your own account.");
  await connectDb();
  const before = await UserModel.findOneAndUpdate(
    { _id: oid(id), isActive: !isActive },
    { $set: { isActive, updatedBy: oid(actor.id) } },
    { returnDocument: "before", lean: true },
  );
  if (!before) return;
  if (!isActive) {
    await SessionModel.updateMany({ userId: oid(id), revokedAt: null }, { $set: { revokedAt: new Date() } });
  }
  await logActivity({
    entity: "user",
    entityId: id,
    action: "update",
    changes: { isActive: { from: !isActive, to: isActive } },
    actionBy: actor.id,
    actionIP: ip,
  });
}

interface LeanSessionJoin {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  userIp: string;
  userAgent: string;
  createdAt: Date;
  lastActiveAt: Date;
  expiresAt: Date;
  user: { name: string; phone: string };
}

/** Currently logged-in sessions (not revoked, not expired). */
export async function listActiveSessions(actor: Actor): Promise<ActiveSessionDTO[]> {
  assertAdmin(actor);
  await connectDb();
  const rows = await SessionModel.aggregate<LeanSessionJoin>([
    { $match: { revokedAt: null, expiresAt: { $gt: new Date() } } },
    { $sort: { lastActiveAt: -1 } },
    { $limit: 200 },
    { $lookup: { from: UserModel.collection.name, localField: "userId", foreignField: "_id", as: "user", pipeline: [{ $project: { name: 1, phone: 1 } }] } },
    { $unwind: "$user" },
  ]);
  return rows.map((s) => ({
    id: s._id.toHexString(),
    userId: s.userId.toHexString(),
    userName: s.user.name,
    userPhone: s.user.phone,
    userIp: s.userIp,
    userAgent: s.userAgent,
    createdAt: iso(s.createdAt),
    lastActiveAt: iso(s.lastActiveAt),
    expiresAt: iso(s.expiresAt),
  }));
}
