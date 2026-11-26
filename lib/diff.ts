import type { Json } from "@/lib/types";

function normalize(value: unknown): Json {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    const maybeId = value as { toHexString?: () => string };
    if (typeof maybeId.toHexString === "function") return maybeId.toHexString();
    return String(value);
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return String(value);
}

/** Field-level diff for the activity log. Only listed fields are compared; O(fields). */
export function computeChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: readonly string[],
): Record<string, { from: Json; to: Json }> {
  const changes: Record<string, { from: Json; to: Json }> = {};
  for (const field of fields) {
    const from = normalize(before[field]);
    const to = normalize(after[field]);
    if (JSON.stringify(from) !== JSON.stringify(to)) changes[field] = { from, to };
  }
  return changes;
}

/** Snapshot of a created record for the activity log (`from` is always null). */
export function creationChanges(
  record: Record<string, unknown>,
  fields: readonly string[],
): Record<string, { from: Json; to: Json }> {
  const changes: Record<string, { from: Json; to: Json }> = {};
  for (const field of fields) {
    const to = normalize(record[field]);
    if (to !== null) changes[field] = { from: null, to };
  }
  return changes;
}
