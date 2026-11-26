import { z } from "zod";
import { AppError } from "@/lib/errors";

/** Rejects `$operator` and dotted keys anywhere in untrusted input (NoSQL-injection guard). */
export function assertNoOperatorKeys(value: unknown, depth = 0): void {
  if (depth > 6) throw new AppError("VALIDATION", "Input is nested too deeply.");
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoOperatorKeys(item, depth + 1);
    return;
  }
  for (const [key, nested] of Object.entries(value)) {
    if (key.startsWith("$") || key.includes(".") || key === "__proto__" || key === "constructor") {
      throw new AppError("VALIDATION", "Input contains forbidden keys.");
    }
    assertNoOperatorKeys(nested, depth + 1);
  }
}

/** FormData -> plain object. Repeated keys become arrays; files are ignored. */
export function formDataToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(formData.keys())) {
    const values = formData.getAll(key).filter((v): v is string => typeof v === "string");
    if (values.length === 0) continue;
    out[key] = values.length === 1 ? values[0] : values;
  }
  return out;
}

export function parseInput<S extends z.ZodType>(schema: S, raw: unknown): z.output<S> {
  assertNoOperatorKeys(raw);
  const result = schema.safeParse(raw);
  if (!result.success) {
    const flat = z.flattenError(result.error);
    throw new AppError("VALIDATION", "Please fix the highlighted fields.", flat.fieldErrors as Record<string, string[]>);
  }
  return result.data;
}
