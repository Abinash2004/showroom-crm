import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../connection";
import { BranchModel, LeadModel } from "../models";
import { branchScope, canAccessBranch, dateRange, escapeRegex, iso, oid, pageWindow } from "../helpers";
import { logActivity } from "../activity";
import { AppError } from "@/lib/errors";
import { computeChanges, creationChanges } from "@/lib/diff";
import { LEAD_PAGE_SIZE, LEAD_STATUSES } from "@/lib/constants";
import type { LeadStatus } from "@/lib/constants";
import type { Actor, LeadDTO, Page } from "@/lib/types";
import { parseIsoDate } from "@/lib/validators/common";
import type { LeadCreateInput, LeadFilters, LeadUpdateInput } from "@/lib/validators/entities";

export interface LeanLead {
  _id: Types.ObjectId;
  visitDate: Date;
  branchId: Types.ObjectId;
  customerName: string;
  customerPhone: string;
  alternativePhone?: string | null;
  customerLocation?: string | null;
  vehicleDetails?: string | null;
  status: LeadStatus;
  createdAt: Date;
  updatedAt: Date;
}

const AUDIT_FIELDS = [
  "branchId",
  "visitDate",
  "customerName",
  "customerPhone",
  "alternativePhone",
  "customerLocation",
  "vehicleDetails",
  "status",
] as const;

const PROJECTION = {
  visitDate: 1,
  branchId: 1,
  customerName: 1,
  customerPhone: 1,
  alternativePhone: 1,
  customerLocation: 1,
  vehicleDetails: 1,
  status: 1,
  createdAt: 1,
  updatedAt: 1,
} as const;

function toDTO(l: LeanLead, branchNames: Map<string, string>): LeadDTO {
  const branchId = l.branchId.toHexString();
  return {
    id: l._id.toHexString(),
    visitDate: iso(l.visitDate),
    branchId,
    branchName: branchNames.get(branchId) ?? "Unknown branch",
    customerName: l.customerName,
    customerPhone: l.customerPhone,
    alternativePhone: l.alternativePhone ?? null,
    customerLocation: l.customerLocation ?? null,
    vehicleDetails: l.vehicleDetails ?? null,
    status: l.status,
    createdAt: iso(l.createdAt),
    updatedAt: iso(l.updatedAt),
  };
}

/** Single `$in` query for branch names; callers map rows through the returned hash map (O(1) per row). */
export async function branchNameMap(branchIds: Types.ObjectId[]): Promise<Map<string, string>> {
  const unique = [...new Map(branchIds.map((b) => [b.toHexString(), b])).values()];
  const rows = await BranchModel.find({ _id: { $in: unique } }, { name: 1 }).lean<{ _id: Types.ObjectId; name: string }[]>();
  return new Map(rows.map((r) => [r._id.toHexString(), r.name]));
}

type LeadQuery = Partial<Pick<LeadFilters, "q" | "status" | "branchId" | "from" | "to">>;

function buildFilter(actor: Actor, f: LeadQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...branchScope(actor) };
  if (f.branchId) {
    if (!canAccessBranch(actor, f.branchId)) throw new AppError("FORBIDDEN", "You do not have access to this branch.");
    filter.branchId = oid(f.branchId);
  }
  if (f.status) filter.status = f.status;
  const range = dateRange(f.from, f.to);
  if (range) filter.visitDate = range;
  if (f.q) Object.assign(filter, customerSearchFilter(f.q));
  return filter;
}

/**
 * Customer search on lead fields: 3+ digits match a phone prefix (main or alternative),
 * anything else matches the name. Input is regex-escaped. Shared by the lead list and follow-ups.
 */
export function customerSearchFilter(q: string): Record<string, unknown> {
  const digits = q.replace(/[\s-]/g, "");
  if (/^\+?\d{3,}$/.test(digits)) {
    const prefix = new RegExp(`^${escapeRegex(digits)}`);
    return { $or: [{ customerPhone: prefix }, { alternativePhone: prefix }] };
  }
  return { customerName: new RegExp(escapeRegex(q), "i") };
}

export async function listLeads(actor: Actor, filters: LeadFilters): Promise<Page<LeadDTO>> {
  await connectDb();
  const filter = buildFilter(actor, filters);
  const { skip, limit } = pageWindow(filters.page, LEAD_PAGE_SIZE);
  // Most recent visit first, served by the { branchId, visitDate, _id } index.
  const [rows, total] = await Promise.all([
    LeadModel.find(filter, PROJECTION).sort({ visitDate: -1, _id: -1 }).skip(skip).limit(limit).lean<LeanLead[]>(),
    LeadModel.countDocuments(filter),
  ]);
  const names = await branchNameMap(rows.map((r) => r.branchId));
  return { items: rows.map((r) => toDTO(r, names)), total, page: filters.page, pageSize: LEAD_PAGE_SIZE };
}

/** Lead counts per status for the current search/date/branch filters (status itself ignored). One aggregation. */
export async function leadStatusCounts(actor: Actor, filters: Omit<LeadQuery, "status"> = {}): Promise<Record<LeadStatus, number>> {
  await connectDb();
  const match = buildFilter(actor, { q: filters.q, branchId: filters.branchId, from: filters.from, to: filters.to });
  const rows = await LeadModel.aggregate<{ _id: LeadStatus; n: number }>([
    { $match: match },
    { $group: { _id: "$status", n: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(LEAD_STATUSES.map((s) => [s, 0])) as Record<LeadStatus, number>;
  for (const r of rows) counts[r._id] = r.n;
  return counts;
}

export async function getLead(actor: Actor, id: string): Promise<LeadDTO | null> {
  await connectDb();
  const row = await LeadModel.findOne({ _id: oid(id), ...branchScope(actor) }, PROJECTION).lean<LeanLead>();
  if (!row) return null;
  const names = await branchNameMap([row.branchId]);
  return toDTO(row, names);
}

export async function createLead(actor: Actor, input: LeadCreateInput, ip: string): Promise<LeadDTO> {
  await connectDb();
  if (!canAccessBranch(actor, input.branchId)) throw new AppError("FORBIDDEN", "You do not have access to this branch.");
  const branch = await BranchModel.findById(oid(input.branchId), { name: 1, isActive: 1 }).lean<{ _id: Types.ObjectId; name: string; isActive: boolean }>();
  if (!branch) throw new AppError("NOT_FOUND", "Branch not found.");
  if (!branch.isActive) throw new AppError("VALIDATION", "This branch is inactive.", { branchId: ["Branch is inactive"] });

  const doc = await LeadModel.create({
    branchId: branch._id,
    visitDate: parseIsoDate(input.visitDate),
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    alternativePhone: input.alternativePhone ?? null,
    customerLocation: input.customerLocation ?? null,
    vehicleDetails: input.vehicleDetails ?? null,
    status: "Opened",
    createdBy: oid(actor.id),
    updatedBy: oid(actor.id),
  });
  const dto = toDTO(doc.toObject() as LeanLead, new Map([[branch._id.toHexString(), branch.name]]));
  await logActivity({
    entity: "lead",
    entityId: dto.id,
    action: "create",
    changes: creationChanges({ ...dto }, AUDIT_FIELDS),
    actionBy: actor.id,
    actionIP: ip,
  });
  return dto;
}

async function applyUpdate(actor: Actor, id: string, set: Record<string, unknown>, ip: string): Promise<LeadDTO> {
  await connectDb();
  const scopedFilter = { _id: oid(id), ...branchScope(actor) };
  const before = await LeadModel.findOne(scopedFilter, PROJECTION).lean<LeanLead>();
  if (!before) throw new AppError("NOT_FOUND", "Lead not found.");
  const after = await LeadModel.findOneAndUpdate(
    scopedFilter,
    { $set: { ...set, updatedBy: oid(actor.id) } },
    { returnDocument: "after", lean: true, projection: PROJECTION },
  );
  if (!after) throw new AppError("NOT_FOUND", "Lead not found.");
  const changes = computeChanges({ ...before }, { ...after }, AUDIT_FIELDS);
  if (Object.keys(changes).length > 0) {
    await logActivity({ entity: "lead", entityId: id, action: "update", changes, actionBy: actor.id, actionIP: ip });
  }
  // After a branch move the name must come from the new branch.
  const names = await branchNameMap([(after as unknown as LeanLead).branchId]);
  return toDTO(after as unknown as LeanLead, names);
}

/**
 * Details, plus status and branch when given: one write and one activity-log entry with every changed field.
 * A branch move is checked only when the branch actually changes: the target must be in the actor's scope
 * (all branches for admins, assigned ones otherwise) and active. Keeping a lead in its current inactive branch is fine.
 */
export async function updateLead(
  actor: Actor,
  id: string,
  input: LeadUpdateInput & { status?: LeadStatus; branchId?: string },
  ip: string,
): Promise<LeadDTO> {
  let move: Types.ObjectId | undefined;
  if (input.branchId) {
    await connectDb();
    const current = await LeadModel.findOne({ _id: oid(id), ...branchScope(actor) }, { branchId: 1 }).lean<{ branchId: Types.ObjectId }>();
    if (!current) throw new AppError("NOT_FOUND", "Lead not found.");
    if (current.branchId.toHexString() !== input.branchId) {
      if (!canAccessBranch(actor, input.branchId)) {
        throw new AppError("FORBIDDEN", "You do not have access to this branch.", { branchId: ["Not one of your branches"] });
      }
      const target = await BranchModel.findById(oid(input.branchId), { isActive: 1 }).lean<{ _id: Types.ObjectId; isActive: boolean }>();
      if (!target) throw new AppError("VALIDATION", "Branch not found.", { branchId: ["Branch not found"] });
      if (!target.isActive) throw new AppError("VALIDATION", "This branch is inactive.", { branchId: ["Branch is inactive"] });
      move = target._id;
    }
  }
  return applyUpdate(
    actor,
    id,
    {
      visitDate: parseIsoDate(input.visitDate),
      customerName: input.customerName,
      customerPhone: input.customerPhone,
      alternativePhone: input.alternativePhone ?? null,
      customerLocation: input.customerLocation ?? null,
      vehicleDetails: input.vehicleDetails ?? null,
      ...(input.status ? { status: input.status } : {}),
      ...(move ? { branchId: move } : {}),
    },
    ip,
  );
}
