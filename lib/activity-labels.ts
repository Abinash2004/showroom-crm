import type { ActivityAction, ActivityEntity } from "@/lib/constants";
import { formatDate, formatPhone } from "@/lib/format";
import type { Json } from "@/lib/types";

/**
 * Presentation of activity-log entries: database field names -> the labels used in the app's forms,
 * and stored values -> what users see (Active/Inactive, branch names, formatted phones and dates).
 */

export const ACTION_LABEL: Record<ActivityAction, string> = { create: "Created", update: "Updated", delete: "Deleted" };
export const ENTITY_LABEL: Record<ActivityEntity, string> = { branch: "Branch", user: "User", lead: "Lead", interaction: "Interaction" };

const FIELD_LABELS: Record<ActivityEntity, Record<string, string>> = {
  branch: { code: "Branch code", name: "Name", location: "Location", phone: "Phone", isActive: "Status" },
  user: {
    code: "Employee code",
    name: "Name",
    phone: "Phone",
    branchIds: "Assigned branches",
    isAdmin: "Role",
    isActive: "Status",
    passwordSet: "Sign-up",
  },
  lead: {
    branchId: "Branch",
    visitDate: "Visit date",
    customerName: "Customer name",
    customerPhone: "Phone",
    alternativePhone: "Alternative phone",
    customerLocation: "Customer location",
    vehicleDetails: "Vehicle details",
    status: "Status",
  },
  interaction: { leadId: "Lead", date: "Date", outcome: "Outcome" },
};

/** Fields that only repeat the entry's subject (shown in the card title), so they are not listed. */
const HIDDEN_FIELDS: Partial<Record<ActivityEntity, ReadonlySet<string>>> = { interaction: new Set(["leadId"]) };

const PHONE_FIELDS = new Set(["phone", "customerPhone", "alternativePhone"]);
const DATE_FIELDS = new Set(["visitDate", "date"]);

/** Readable field label; unknown keys fall back to a spaced version of the key ("someField" -> "Some field"). */
export function fieldLabel(entity: ActivityEntity, field: string): string {
  const known = FIELD_LABELS[entity][field];
  if (known) return known;
  const spaced = field.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function isShownField(entity: ActivityEntity, field: string): boolean {
  return !HIDDEN_FIELDS[entity]?.has(field);
}

/** Stored value -> display text. `branchNames` resolves branch ids (O(1) per id). `null` means "not set". */
export function formatValue(entity: ActivityEntity, field: string, value: Json, branchNames: ReadonlyMap<string, string>): string | null {
  if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  if (field === "isActive") return value ? "Active" : "Inactive";
  if (field === "isAdmin") return value ? "Administrator" : "Sales user";
  if (field === "passwordSet") return value ? "Completed" : "Pending";
  if (field === "branchId" && typeof value === "string") return branchNames.get(value) ?? "Unknown branch";
  if (field === "branchIds" && Array.isArray(value)) {
    return value.map((id) => (typeof id === "string" ? (branchNames.get(id) ?? "Unknown branch") : String(id))).join(", ");
  }
  if (PHONE_FIELDS.has(field) && typeof value === "string") return formatPhone(value);
  if (DATE_FIELDS.has(field) && typeof value === "string" && !Number.isNaN(Date.parse(value))) return formatDate(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}
