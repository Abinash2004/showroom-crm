"use server";

import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/errors";
import { getActor } from "@/lib/auth/session";
import { interactionReport } from "@/lib/db/repositories/interactions";
import type { InteractionReportRow, Page } from "@/lib/types";
import { interactionFilterSchema } from "@/lib/validators/entities";
import { parseInput } from "@/lib/validators/parse";
import { runAction } from "./run";

/**
 * Next page of the follow-up list for mobile infinite scroll. Read-only, so it uses the session check
 * without the write rate limit. Branch scope is enforced inside `interactionReport`.
 */
export async function loadFollowUpsPageAction(
  params: Record<string, string | undefined>,
  page: number,
): Promise<ActionResult<Page<InteractionReportRow>>> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
    const filters = parseInput(interactionFilterSchema, { ...params, page: String(page) });
    return interactionReport(actor, filters);
  });
}
