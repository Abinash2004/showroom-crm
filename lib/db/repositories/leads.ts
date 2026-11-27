import "server-only";
import type { PipelineStage, Types } from "mongoose";
import { connectDb } from "../connection";
import { BranchModel, InteractionModel, LeadModel } from "../models";
import { branchScope, canAccessBranch, escapeRegex, iso, localDayRange, oid, pageWindow } from "../helpers";
import { logActivity } from "../activity";
import { AppError } from "@/lib/errors";
import { computeChanges, creationChanges } from "@/lib/diff";
import { LEAD_PAGE_SIZE, LEAD_STATUSES } from "@/lib/constants";
import type { InteractionBucket, LeadStatus } from "@/lib/constants";
import type { Actor, LeadDTO, LeadListItem, Page } from "@/lib/types";
import type { LeadCreateInput, LeadEditInput, LeadFilters } from "@/lib/validators/entities";

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

type LeadQuery = Partial<Pick<LeadFilters, "q" | "status" | "branchId" | "from" | "to" | "interactions">>;

/**
 * Pipeline stages that keep only leads with the chosen number of interactions: exactly 0, 1 or 2, or more than 2.
 * Each lead's interactions are counted through the { leadId, date, _id } index (an equality lookup per lead).
 * Only used while the filter is on; the plain list keeps its indexed find + sort.
 */
function interactionStages(bucket: InteractionBucket): PipelineStage[] {
  return [
    {
      $lookup: {
        from: InteractionModel.collection.name,
        localField: "_id",
        foreignField: "leadId",
        as: "ix",
        pipeline: [{ $project: { _id: 1 } }],
      },
    },
    { $addFields: { interactionCount: { $size: "$ix" } } },
    { $project: { ix: 0 } },
    { $match: { interactionCount: bucket === "more" ? { $gt: 2 } : Number(bucket) } },
  ];
}

function buildFilter(actor: Actor, f: LeadQuery): Record<string, unknown> {
  const filter: Record<string, unknown> = { ...branchScope(actor) };
  if (f.branchId) {
    if (!canAccessBranch(actor, f.branchId)) throw new AppError("FORBIDDEN", "You do not have access to this branch.");
    filter.branchId = oid(f.branchId);
  }
  if (f.status) filter.status = f.status;
  // Visit dates are timestamps: filter by showroom-local (IST) days.
  const range = localDayRange(f.from, f.to);
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

/**
 * Interactions per lead for one page of leads: a single grouped query on the { leadId, date, _id } index,
 * returned as a hash map so each row is an O(1) lookup.
 */
async function interactionCountMap(leadIds: Types.ObjectId[]): Promise<Map<string, number>> {
  if (leadIds.length === 0) return new Map();
  const rows = await InteractionModel.aggregate<{ _id: Types.ObjectId; n: number }>([
    { $match: { leadId: { $in: leadIds } } },
    { $group: { _id: "$leadId", n: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id.toHexString(), r.n]));
}

export async function listLeads(actor: Actor, filters: LeadFilters): Promise<Page<LeadListItem>> {
  await connectDb();
  const filter = buildFilter(actor, filters);
  const { skip, limit } = pageWindow(filters.page, LEAD_PAGE_SIZE);

  if (filters.interactions) {
    // Rows come back with their count already attached, so no second count query is needed.
    const [result] = await LeadModel.aggregate<{ rows: (LeanLead & { interactionCount: number })[]; total: { n: number }[] }>([
      { $match: filter },
      ...interactionStages(filters.interactions),
      {
        $facet: {
          rows: [{ $sort: { visitDate: -1, _id: -1 } }, { $skip: skip }, { $limit: limit }, { $project: { ...PROJECTION, interactionCount: 1 } }],
          total: [{ $count: "n" }],
        },
      },
    ]);
    const rows = result?.rows ?? [];
    const names = await branchNameMap(rows.map((r) => r.branchId));
    return {
      items: rows.map((r) => ({ ...toDTO(r, names), interactionCount: r.interactionCount })),
      total: result?.total[0]?.n ?? 0,
      page: filters.page,
      pageSize: LEAD_PAGE_SIZE,
    };
  }

  // Most recent visit first, served by the { branchId, visitDate, _id } index.
  const [rows, total] = await Promise.all([
    LeadModel.find(filter, PROJECTION).sort({ visitDate: -1, _id: -1 }).skip(skip).limit(limit).lean<LeanLead[]>(),
    LeadModel.countDocuments(filter),
  ]);
  const [names, counts] = await Promise.all([branchNameMap(rows.map((r) => r.branchId)), interactionCountMap(rows.map((r) => r._id))]);
  return {
    items: rows.map((r) => ({ ...toDTO(r, names), interactionCount: counts.get(r._id.toHexString()) ?? 0 })),
    total,
    page: filters.page,
    pageSize: LEAD_PAGE_SIZE,
  };
}

/** Lead counts per status for the current search/date/branch filters (status itself ignored). One aggregation. */
export async function leadStatusCounts(actor: Actor, filters: Omit<LeadQuery, "status"> = {}): Promise<Record<LeadStatus, number>> {
  await connectDb();
  const match = buildFilter(actor, { q: filters.q, branchId: filters.branchId, from: filters.from, to: filters.to });
  const rows = await LeadModel.aggregate<{ _id: LeadStatus; n: number }>([
    { $match: match },
    ...(filters.interactions ? interactionStages(filters.interactions) : []),
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
    // Stamped by the server, never taken from the client.
    visitDate: new Date(),
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

/**
 * The only change allowed after creation: status, customer location and vehicle details. Everything else
 * (name, phones, branch, visit date) is fixed at creation, for every user including admins. One write and
 * one activity-log entry with the changed fields.
 */
export async function updateLead(actor: Actor, id: string, input: LeadEditInput, ip: string): Promise<LeadDTO> {
  await connectDb();
  const scopedFilter = { _id: oid(id), ...branchScope(actor) };
  const before = await LeadModel.findOne(scopedFilter, PROJECTION).lean<LeanLead>();
  if (!before) throw new AppError("NOT_FOUND", "Lead not found.");
  const after = await LeadModel.findOneAndUpdate(
    scopedFilter,
    {
      $set: {
        status: input.status,
        customerLocation: input.customerLocation ?? null,
        vehicleDetails: input.vehicleDetails ?? null,
        updatedBy: oid(actor.id),
      },
    },
    { returnDocument: "after", projection: PROJECTION },
  ).lean<LeanLead>();
  if (!after) throw new AppError("NOT_FOUND", "Lead not found.");
  const changes = computeChanges({ ...before }, { ...after }, AUDIT_FIELDS);
  if (Object.keys(changes).length > 0) {
    await logActivity({ entity: "lead", entityId: id, action: "update", changes, actionBy: actor.id, actionIP: ip });
  }
  const names = await branchNameMap([after.branchId]);
  return toDTO(after, names);
}
