import { z } from "zod";
import { LEAD_STATUSES, ACTIVITY_ENTITIES, INTERACTION_BUCKETS } from "@/lib/constants";
import { employeeCodeSchema } from "./auth";
import {
  isoDateSchema,
  leadStatusSchema,
  checkboxSchema,
  objectIdSchema,
  optionalPhoneSchema,
  optionalText,
  phoneSchema,
  requiredText,
} from "./common";

/* ---------- Branch ---------- */
export const branchCreateSchema = z.object({
  code: employeeCodeSchema,
  name: requiredText("Name", 100),
  location: requiredText("Location", 200),
  phone: phoneSchema,
});
export const branchUpdateSchema = branchCreateSchema.omit({ code: true });

/* ---------- User ---------- */
const branchIdsSchema = z.preprocess(
  (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]),
  z.array(objectIdSchema).max(100),
);

const userBaseShape = {
  name: requiredText("Name", 100),
  phone: phoneSchema,
  branchIds: branchIdsSchema,
  isAdmin: checkboxSchema,
};

const needsBranch = (v: { isAdmin: boolean; branchIds: string[] }) => v.isAdmin || v.branchIds.length > 0;
const needsBranchIssue = { path: ["branchIds"], message: "Assign at least one branch to a non-admin user" };

export const userCreateSchema = z
  .object({ code: employeeCodeSchema, ...userBaseShape })
  .refine(needsBranch, needsBranchIssue);
export const userUpdateSchema = z.object(userBaseShape).refine(needsBranch, needsBranchIssue);

/* ---------- Lead ---------- */
// Visit date is not an input: the server stamps it with the current date and time when the lead is created.
export const leadCreateSchema = z.object({
  branchId: objectIdSchema,
  customerName: requiredText("Customer name", 100),
  customerPhone: phoneSchema,
  alternativePhone: optionalPhoneSchema,
  customerLocation: optionalText(200),
  vehicleDetails: optionalText(500),
});
/** After creation only status, customer location and vehicle details can change (for every user, admins included). */
export const leadEditSchema = z.object({
  status: leadStatusSchema,
  customerLocation: optionalText(200),
  vehicleDetails: optionalText(500),
});

/* ---------- Interaction ---------- */
// Interactions are write-once: logged with a server timestamp, never edited. Date is not an input.
export const interactionCreateSchema = z.object({
  leadId: objectIdSchema,
  outcome: requiredText("Outcome", 2000),
});

/* ---------- Filters (URL search params). Invalid values fall back to "no filter". ---------- */
const firstValue = (v: unknown): unknown => (Array.isArray(v) ? v[0] : v);
const blankToUndefined = (v: unknown): unknown => {
  const f = firstValue(v);
  return typeof f === "string" && f.trim() === "" ? undefined : f;
};

const filterText = z.preprocess(blankToUndefined, z.string().trim().max(50).optional()).catch(undefined);
const filterDate = z.preprocess(blankToUndefined, isoDateSchema.optional()).catch(undefined);
const filterId = z.preprocess(blankToUndefined, objectIdSchema.optional()).catch(undefined);
const filterPage = z.preprocess(firstValue, z.coerce.number().int().min(1).max(10_000)).catch(1);

export const leadFilterSchema = z.object({
  q: filterText,
  status: z.preprocess(blankToUndefined, z.enum(LEAD_STATUSES).optional()).catch(undefined),
  interactions: z.preprocess(blankToUndefined, z.enum(INTERACTION_BUCKETS).optional()).catch(undefined),
  branchId: filterId,
  from: filterDate,
  to: filterDate,
  page: filterPage,
});

export const interactionFilterSchema = z.object({
  q: filterText,
  branchId: filterId,
  from: filterDate,
  to: filterDate,
  page: filterPage,
});

export const activityFilterSchema = z.object({
  entity: z.preprocess(blankToUndefined, z.enum(ACTIVITY_ENTITIES).optional()).catch(undefined),
  from: filterDate,
  to: filterDate,
  page: filterPage,
});

export type BranchCreateInput = z.output<typeof branchCreateSchema>;
export type BranchUpdateInput = z.output<typeof branchUpdateSchema>;
export type UserCreateInput = z.output<typeof userCreateSchema>;
export type UserUpdateInput = z.output<typeof userUpdateSchema>;
export type LeadCreateInput = z.output<typeof leadCreateSchema>;
export type LeadEditInput = z.output<typeof leadEditSchema>;
export type InteractionCreateInput = z.output<typeof interactionCreateSchema>;
export type LeadFilters = z.output<typeof leadFilterSchema>;
export type InteractionFilters = z.output<typeof interactionFilterSchema>;
export type ActivityFilters = z.output<typeof activityFilterSchema>;
