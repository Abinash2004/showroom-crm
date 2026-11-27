import { z } from "zod";
import { LEAD_STATUSES } from "@/lib/constants";

export const objectIdSchema = z.string().regex(/^[a-fA-F0-9]{24}$/, "Invalid identifier");

export const phoneSchema = z
  .string()
  .trim()
  .transform((s) => s.replace(/[\s-]/g, ""))
  .pipe(z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number"));

export const optionalPhoneSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  phoneSchema.optional(),
);

export const requiredText = (label: string, max: number) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} must be at most ${max} characters`);

export const optionalText = (max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max, `Must be at most ${max} characters`).optional(),
  );

export const isoDateSchema = z
  .string({ error: "Date is required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((s) => {
    const d = new Date(`${s}T00:00:00.000Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
  }, "Enter a valid date");

export const leadStatusSchema = z.enum(LEAD_STATUSES, { error: "Select a valid status" });

export const checkboxSchema = z.preprocess(
  (v) => v === true || v === "on" || v === "true",
  z.boolean(),
);
