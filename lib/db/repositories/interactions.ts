import "server-only";
import type { Types } from "mongoose";
import { connectDb } from "../connection";
import { BranchModel, InteractionModel, LeadModel, UserModel } from "../models";
import { branchScope, canAccessBranch, dateRange, iso, oid, pageWindow } from "../helpers";
import { customerSearchFilter } from "./leads";
import { logActivity } from "../activity";
import { AppError } from "@/lib/errors";
import { computeChanges, creationChanges } from "@/lib/diff";
import { FOLLOW_UP_PAGE_SIZE } from "@/lib/constants";
import type { Actor, InteractionDTO, InteractionReportRow, Page } from "@/lib/types";
import { parseIsoDate } from "@/lib/validators/common";
import type {
  InteractionCreateInput,
  InteractionFilters,
  InteractionUpdateInput,
} from "@/lib/validators/entities";

interface LeanInteraction {
  _id: Types.ObjectId;
  leadId: Types.ObjectId;
  outcome: string;
  date: Date;
  actionBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AUDIT_FIELDS = ["outcome", "date"] as const;

async function userNameMap(ids: Types.ObjectId[]): Promise<Map<string, string>> {
  const unique = [...new Map(ids.map((i) => [i.toHexString(), i])).values()];
  const rows = await UserModel.find({ _id: { $in: unique } }, { name: 1 }).lean<{ _id: Types.ObjectId; name: string }[]>();
  return new Map(rows.map((r) => [r._id.toHexString(), r.name]));
}

const toDTO = (i: LeanInteraction, names: Map<string, string>): InteractionDTO => ({
  id: i._id.toHexString(),
  leadId: i.leadId.toHexString(),
  outcome: i.outcome,
  date: iso(i.date),
  actionBy: i.actionBy.toHexString(),
  actionByName: names.get(i.actionBy.toHexString()) ?? "Unknown",
  createdAt: iso(i.createdAt),
  updatedAt: iso(i.updatedAt),
});

/** Verifies the lead exists inside the actor's branch scope. */
async function assertLeadAccess(actor: Actor, leadId: string): Promise<void> {
  const lead = await LeadModel.exists({ _id: oid(leadId), ...branchScope(actor) });
  if (!lead) throw new AppError("NOT_FOUND", "Lead not found.");
}

export async function listInteractionsForLead(actor: Actor, leadId: string): Promise<InteractionDTO[]> {
  await connectDb();
  await assertLeadAccess(actor, leadId);
  const rows = await InteractionModel.find({ leadId: oid(leadId) })
    .sort({ date: -1, _id: -1 })
    .limit(200)
    .lean<LeanInteraction[]>();
  const names = await userNameMap(rows.map((r) => r.actionBy));
  return rows.map((r) => toDTO(r, names));
}

export async function createInteraction(actor: Actor, input: InteractionCreateInput, ip: string): Promise<InteractionDTO> {
  await connectDb();
  await assertLeadAccess(actor, input.leadId);
  const doc = await InteractionModel.create({
    leadId: oid(input.leadId),
    outcome: input.outcome,
    date: parseIsoDate(input.date),
    actionBy: oid(actor.id),
    createdBy: oid(actor.id),
    updatedBy: oid(actor.id),
  });
  const dto = toDTO(doc.toObject() as LeanInteraction, new Map([[actor.id, actor.name]]));
  await logActivity({
    entity: "interaction",
    entityId: dto.id,
    action: "create",
    changes: creationChanges({ ...dto, leadId: dto.leadId }, ["leadId", ...AUDIT_FIELDS]),
    actionBy: actor.id,
    actionIP: ip,
  });
  return dto;
}

export async function updateInteraction(actor: Actor, input: InteractionUpdateInput, ip: string): Promise<InteractionDTO> {
  await connectDb();
  const before = await InteractionModel.findById(oid(input.id)).lean<LeanInteraction>();
  if (!before) throw new AppError("NOT_FOUND", "Interaction not found.");
  await assertLeadAccess(actor, before.leadId.toHexString());
  const after = await InteractionModel.findByIdAndUpdate(
    before._id,
    { $set: { outcome: input.outcome, date: parseIsoDate(input.date), updatedBy: oid(actor.id) } },
    { returnDocument: "after", lean: true },
  );
  if (!after) throw new AppError("NOT_FOUND", "Interaction not found.");
  const changes = computeChanges({ ...before }, { ...after }, AUDIT_FIELDS);
  if (Object.keys(changes).length > 0) {
    await logActivity({ entity: "interaction", entityId: input.id, action: "update", changes, actionBy: actor.id, actionIP: ip });
  }
  const names = await userNameMap([before.actionBy]);
  return toDTO(after as unknown as LeanInteraction, names);
}

interface ReportRow extends LeanInteraction {
  lead: { customerName: string; branchId: Types.ObjectId };
}

/** Branch name + location for a page of rows: one `$in` query, hash-map lookups per row (O(1)). */
async function branchInfoMap(branchIds: Types.ObjectId[]): Promise<Map<string, { name: string; location: string }>> {
  const unique = [...new Map(branchIds.map((b) => [b.toHexString(), b])).values()];
  const rows = await BranchModel.find({ _id: { $in: unique } }, { name: 1, location: 1 }).lean<
    { _id: Types.ObjectId; name: string; location: string }[]
  >();
  return new Map(rows.map((r) => [r._id.toHexString(), { name: r.name, location: r.location }]));
}

/**
 * Position of each row within its lead's follow-ups ("2nd of 3"), ordered by date then _id.
 * One aggregation for the whole page; each lookup is an equality on leadId, served by the
 * { leadId, date, _id } index. Cost: O(page size x follow-ups per lead).
 */
async function sequenceMap(rows: LeanInteraction[]): Promise<Map<string, { n: number; total: number }>> {
  if (rows.length === 0) return new Map();
  const out = await InteractionModel.aggregate<{ _id: Types.ObjectId; pos: { n: number; total: number } | null }>([
    { $match: { _id: { $in: rows.map((r) => r._id) } } },
    {
      $lookup: {
        from: InteractionModel.collection.name,
        let: { lead: "$leadId", d: "$date", id: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$leadId", "$$lead"] } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              n: {
                $sum: {
                  $cond: [
                    { $or: [{ $lt: ["$date", "$$d"] }, { $and: [{ $eq: ["$date", "$$d"] }, { $lte: ["$_id", "$$id"] }] }] },
                    1,
                    0,
                  ],
                },
              },
            },
          },
        ],
        as: "pos",
      },
    },
    { $project: { pos: { $first: "$pos" } } },
  ]);
  return new Map(out.map((o) => [o._id.toHexString(), { n: o.pos?.n ?? 1, total: o.pos?.total ?? 1 }]));
}

/** Interaction report across the actor's branches. Branch scope is applied on the joined lead. */
export async function interactionReport(actor: Actor, filters: InteractionFilters): Promise<Page<InteractionReportRow>> {
  await connectDb();
  if (filters.branchId && !canAccessBranch(actor, filters.branchId)) {
    throw new AppError("FORBIDDEN", "You do not have access to this branch.");
  }
  const leadMatch: Record<string, unknown> = { ...branchScope(actor) };
  if (filters.branchId) leadMatch.branchId = oid(filters.branchId);
  if (filters.q) Object.assign(leadMatch, customerSearchFilter(filters.q));
  const match: Record<string, unknown> = {};
  const range = dateRange(filters.from, filters.to);
  if (range) match.date = range;
  const { skip, limit } = pageWindow(filters.page, FOLLOW_UP_PAGE_SIZE);

  const leadLookup = {
    $lookup: {
      from: LeadModel.collection.name,
      localField: "leadId",
      foreignField: "_id",
      as: "lead",
      pipeline: [{ $match: leadMatch }, { $project: { customerName: 1, branchId: 1 } }],
    },
  };

  const [result] = await InteractionModel.aggregate<{ rows: ReportRow[]; total: { n: number }[] }>([
    { $match: match },
    leadLookup,
    { $unwind: "$lead" },
    {
      $facet: {
        rows: [{ $sort: { date: -1, _id: -1 } }, { $skip: skip }, { $limit: limit }],
        total: [{ $count: "n" }],
      },
    },
  ]);
  const rows = result?.rows ?? [];
  const total = result?.total[0]?.n ?? 0;

  const [users, branches, positions] = await Promise.all([
    userNameMap(rows.map((r) => r.actionBy)),
    branchInfoMap(rows.map((r) => r.lead.branchId)),
    sequenceMap(rows),
  ]);
  return {
    total,
    page: filters.page,
    pageSize: FOLLOW_UP_PAGE_SIZE,
    items: rows.map((r) => ({
      ...toDTO(r, users),
      customerName: r.lead.customerName,
      branchId: r.lead.branchId.toHexString(),
      branchName: branches.get(r.lead.branchId.toHexString())?.name ?? "Unknown branch",
      branchLocation: branches.get(r.lead.branchId.toHexString())?.location ?? "",
      sequence: positions.get(r._id.toHexString())?.n ?? 1,
      sequenceTotal: positions.get(r._id.toHexString())?.total ?? 1,
    })),
  };
}
