import "server-only";
import { toActionError } from "@/lib/errors";
import type { ActionResult } from "@/lib/errors";

/** Converts thrown errors into typed results. Never wrap `redirect()` in this: call it after the result is known. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    return { ok: false, error: toActionError(err) };
  }
}
