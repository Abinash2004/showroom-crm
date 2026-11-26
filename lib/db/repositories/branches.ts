import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../connection";
import { BranchModel } from "../models";
import { assertAdmin, iso, oid } from "../helpers";
import { logActivity } from "../activity";
import { AppError } from "@/lib/errors";
import { computeChanges, creationChanges } from "@/lib/diff";
import type { Actor, BranchDTO } from "@/lib/types";
import type { BranchCreateInput, BranchUpdateInput } from "@/lib/validators/entities";

interface LeanBranch {
  _id: Types.ObjectId;
  code: string;
  name: string;
  location: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const FIELDS = ["code", "name", "location", "phone", "isActive"] as const;

const toDTO = (b: LeanBranch): BranchDTO => ({
  id: b._id.toHexString(),
  code: b.code,
  name: b.name,
  location: b.location,
  phone: b.phone,
  isActive: b.isActive,
  createdAt: iso(b.createdAt),
  updatedAt: iso(b.updatedAt),
});

function isDuplicateKey(err: unknown): boolean {
  return err instanceof Error && /E11000/.test(err.message);
}

/** Admins see every branch; others only their assigned ones. */
export async function listBranches(actor: Actor, opts: { activeOnly?: boolean } = {}): Promise<BranchDTO[]> {
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (!actor.isAdmin) filter._id = { $in: actor.branchIds.map(oid) };
  if (opts.activeOnly) filter.isActive = true;
  const rows = await BranchModel.find(filter).sort({ name: 1 }).lean<LeanBranch[]>();
  return rows.map(toDTO);
}

export async function createBranch(actor: Actor, input: BranchCreateInput, ip: string): Promise<BranchDTO> {
  assertAdmin(actor);
  await connectDb();
  try {
    const doc = await BranchModel.create({ ...input, isActive: true, createdBy: oid(actor.id), updatedBy: oid(actor.id) });
    const dto = toDTO(doc.toObject() as LeanBranch);
    await logActivity({
      entity: "branch",
      entityId: dto.id,
      action: "create",
      changes: creationChanges({ ...dto }, FIELDS),
      actionBy: actor.id,
      actionIP: ip,
    });
    return dto;
  } catch (err) {
    if (isDuplicateKey(err)) throw new AppError("CONFLICT", "A branch with this code already exists.", { code: ["Already in use"] });
    throw err;
  }
}

export async function updateBranch(actor: Actor, id: string, input: BranchUpdateInput, ip: string): Promise<BranchDTO> {
  assertAdmin(actor);
  await connectDb();
  const before = await BranchModel.findById(oid(id)).lean<LeanBranch>();
  if (!before) throw new AppError("NOT_FOUND", "Branch not found.");
  const after = await BranchModel.findByIdAndUpdate(
    before._id,
    { $set: { ...input, updatedBy: oid(actor.id) } },
    { returnDocument: "after", lean: true },
  );
  if (!after) throw new AppError("NOT_FOUND", "Branch not found.");
  const changes = computeChanges({ ...before }, { ...after }, FIELDS);
  if (Object.keys(changes).length > 0) {
    await logActivity({ entity: "branch", entityId: id, action: "update", changes, actionBy: actor.id, actionIP: ip });
  }
  return toDTO(after as unknown as LeanBranch);
}

export async function setBranchActive(actor: Actor, id: string, isActive: boolean, ip: string): Promise<void> {
  assertAdmin(actor);
  await connectDb();
  const before = await BranchModel.findOneAndUpdate(
    { _id: oid(id), isActive: !isActive },
    { $set: { isActive, updatedBy: oid(actor.id) } },
    { returnDocument: "before", lean: true },
  );
  if (!before) return;
  await logActivity({
    entity: "branch",
    entityId: id,
    action: "update",
    changes: { isActive: { from: !isActive, to: isActive } },
    actionBy: actor.id,
    actionIP: ip,
  });
}
