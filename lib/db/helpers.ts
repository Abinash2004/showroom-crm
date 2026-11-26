import "server-only";
import { Types } from "mongoose";
import { AppError } from "@/lib/errors";
import type { Actor } from "@/lib/types";

export function oid(id: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(id) || String(new Types.ObjectId(id)) !== id.toLowerCase()) {
    throw new AppError("VALIDATION", "Invalid identifier.");
  }
  return new Types.ObjectId(id);
}

export const iso = (d: Date): string => d.toISOString();
export const isoOrNull = (d: Date | null | undefined): string | null => (d ? d.toISOString() : null);

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Branch scope applied inside every query: admins see all, others only their assigned branches. */
export function branchScope(actor: Actor): { branchId?: { $in: Types.ObjectId[] } } {
  if (actor.isAdmin) return {};
  return { branchId: { $in: actor.branchIds.map(oid) } };
}

export function canAccessBranch(actor: Actor, branchId: string): boolean {
  return actor.isAdmin || actor.branchIds.includes(branchId);
}

export function assertAdmin(actor: Actor): void {
  if (!actor.isAdmin) throw new AppError("FORBIDDEN", "Administrator access required.");
}

export function pageWindow(page: number, pageSize: number): { skip: number; limit: number } {
  return { skip: (page - 1) * pageSize, limit: pageSize };
}

/** Inclusive [from, to] range over ISO day strings (UTC), or undefined when neither bound is set. */
export function dateRange(from?: string, to?: string): { $gte?: Date; $lte?: Date } | undefined {
  if (!from && !to) return undefined;
  const range: { $gte?: Date; $lte?: Date } = {};
  if (from) range.$gte = new Date(`${from}T00:00:00.000Z`);
  if (to) range.$lte = new Date(`${to}T23:59:59.999Z`);
  return range;
}
