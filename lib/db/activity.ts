import "server-only";
import { connectDb } from "./connection";
import { ActivityLogModel, BranchModel, InteractionModel, LeadModel, UserModel } from "./models";
import { iso, localDayRange, oid, pageWindow } from "./helpers";
import { ACTIVITY_ENTITIES, PAGE_SIZE } from "@/lib/constants";
import type { ActivityAction, ActivityEntity } from "@/lib/constants";
import type { ActivityDTO, Json, Page } from "@/lib/types";
import type { ActivityFilters } from "@/lib/validators/entities";
import type { Actor } from "@/lib/types";
import type { ActivityRecorder } from "@/lib/auth/ports";
import { assertAdmin } from "./helpers";
import type { Types } from "mongoose";

export interface ActivityEntry {
  entity: ActivityEntity;
  entityId: string;
  action: ActivityAction;
  changes: Record<string, { from: Json; to: Json }>;
  actionBy: string;
  actionIP: string;
}

/** Append-only write. Nothing in the app can update or delete log rows. */
export async function logActivity(entry: ActivityEntry): Promise<void> {
  await connectDb();
  await ActivityLogModel.create({
    entity: entry.entity,
    entityId: oid(entry.entityId),
    action: entry.action,
    changes: entry.changes,
    actionBy: oid(entry.actionBy),
    actionIP: entry.actionIP,
  });
}

export const mongoActivityRecorder: ActivityRecorder = { record: logActivity };

interface LeanLog {
  _id: Types.ObjectId;
  entity: ActivityEntity;
  entityId: Types.ObjectId;
  action: ActivityAction;
  changes: Record<string, { from: Json; to: Json }>;
  actionBy: Types.ObjectId;
  actionIP: string;
  createdAt: Date;
}

/** Entries per entity for the current date range (entity filter itself ignored). One aggregation, served by { createdAt }. */
export async function activityEntityCounts(
  actor: Actor,
  filters: Pick<ActivityFilters, "from" | "to">,
): Promise<Record<ActivityEntity, number>> {
  assertAdmin(actor);
  await connectDb();
  const match: Record<string, unknown> = {};
  // createdAt is a real timestamp: filter by showroom-local (IST) days, not UTC days.
  const range = localDayRange(filters.from, filters.to);
  if (range) match.createdAt = range;
  const rows = await ActivityLogModel.aggregate<{ _id: ActivityEntity; n: number }>([
    { $match: match },
    { $group: { _id: "$entity", n: { $sum: 1 } } },
  ]);
  const counts = Object.fromEntries(ACTIVITY_ENTITIES.map((e) => [e, 0])) as Record<ActivityEntity, number>;
  for (const r of rows) counts[r._id] = r.n;
  return counts;
}

/**
 * Readable subject per log row ("entity:id" -> name), resolved set-based: one `$in` query per entity type
 * (interactions need one extra hop to their lead), never a query per row.
 */
async function subjectMap(rows: LeanLog[]): Promise<Map<string, string>> {
  const ids: Record<ActivityEntity, Types.ObjectId[]> = { branch: [], user: [], lead: [], interaction: [] };
  for (const r of rows) ids[r.entity].push(r.entityId);
  const named = { _id: 1, name: 1 } as const;
  const [branches, users, leads, interactions] = await Promise.all([
    ids.branch.length ? BranchModel.find({ _id: { $in: ids.branch } }, named).lean<{ _id: Types.ObjectId; name: string }[]>() : [],
    ids.user.length ? UserModel.find({ _id: { $in: ids.user } }, named).lean<{ _id: Types.ObjectId; name: string }[]>() : [],
    ids.lead.length
      ? LeadModel.find({ _id: { $in: ids.lead } }, { customerName: 1 }).lean<{ _id: Types.ObjectId; customerName: string }[]>()
      : [],
    ids.interaction.length
      ? InteractionModel.find({ _id: { $in: ids.interaction } }, { leadId: 1 }).lean<{ _id: Types.ObjectId; leadId: Types.ObjectId }[]>()
      : [],
  ]);
  const interactionLeads = interactions.length
    ? await LeadModel.find({ _id: { $in: interactions.map((i) => i.leadId) } }, { customerName: 1 }).lean<
        { _id: Types.ObjectId; customerName: string }[]
      >()
    : [];
  const leadName = new Map(interactionLeads.map((l) => [l._id.toHexString(), l.customerName]));

  const out = new Map<string, string>();
  for (const b of branches) out.set(`branch:${b._id.toHexString()}`, b.name);
  for (const u of users) out.set(`user:${u._id.toHexString()}`, u.name);
  for (const l of leads) out.set(`lead:${l._id.toHexString()}`, l.customerName);
  for (const i of interactions) {
    const customer = leadName.get(i.leadId.toHexString());
    if (customer) out.set(`interaction:${i._id.toHexString()}`, customer);
  }
  return out;
}

export async function listActivity(actor: Actor, filters: ActivityFilters): Promise<Page<ActivityDTO>> {
  assertAdmin(actor);
  await connectDb();
  const filter: Record<string, unknown> = {};
  if (filters.entity) filter.entity = filters.entity;
  // createdAt is a real timestamp: filter by showroom-local (IST) days, not UTC days.
  const range = localDayRange(filters.from, filters.to);
  if (range) filter.createdAt = range;
  const { skip, limit } = pageWindow(filters.page, PAGE_SIZE);
  const [rows, total] = await Promise.all([
    ActivityLogModel.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean<LeanLog[]>(),
    ActivityLogModel.countDocuments(filter),
  ]);

  // One set-based lookup for actor names instead of a query per row.
  const userIds = [...new Set(rows.map((r) => r.actionBy.toHexString()))].map(oid);
  const users = await UserModel.find({ _id: { $in: userIds } }, { name: 1 }).lean<{ _id: Types.ObjectId; name: string }[]>();
  const names = new Map(users.map((u) => [u._id.toHexString(), u.name]));
  const subjects = await subjectMap(rows);

  return {
    total,
    page: filters.page,
    pageSize: PAGE_SIZE,
    items: rows.map((r) => ({
      id: r._id.toHexString(),
      entity: r.entity,
      entityId: r.entityId.toHexString(),
      subject: subjects.get(`${r.entity}:${r.entityId.toHexString()}`) ?? "Deleted record",
      action: r.action,
      changes: r.changes ?? {},
      actionBy: r.actionBy.toHexString(),
      actionByName: names.get(r.actionBy.toHexString()) ?? "Unknown",
      actionIP: r.actionIP,
      createdAt: iso(r.createdAt),
    })),
  };
}
