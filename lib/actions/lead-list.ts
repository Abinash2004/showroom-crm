"use server";

import { AppError } from "@/lib/errors";
import type { ActionResult } from "@/lib/errors";
import { getActor } from "@/lib/auth/session";
import { listLeads } from "@/lib/db/repositories/leads";
import type { LeadListItem, Page } from "@/lib/types";
import { leadFilterSchema } from "@/lib/validators/entities";
import { parseInput } from "@/lib/validators/parse";
import { runAction } from "./run";

/**
 * Next page of the lead list for mobile infinite scroll. Read-only, so it uses the session check
 * without the write rate limit. Branch scope is enforced inside `listLeads`.
 */
export async function loadLeadsPageAction(params: Record<string, string | undefined>, page: number): Promise<ActionResult<Page<LeadListItem>>> {
  return runAction(async () => {
    const actor = await getActor();
    if (!actor) throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
    const filters = parseInput(leadFilterSchema, { ...params, page: String(page) });
    return listLeads(actor, filters);
  });
}
