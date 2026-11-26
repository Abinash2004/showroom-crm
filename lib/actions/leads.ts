"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "@/lib/errors";
import { requireWriteActor } from "@/lib/auth/session";
import { formDataToObject, parseInput } from "@/lib/validators/parse";
import {
  interactionCreateSchema,
  interactionUpdateSchema,
  leadCreateSchema,
  leadEditSchema,
} from "@/lib/validators/entities";
import { objectIdSchema } from "@/lib/validators/common";
import { createLead, updateLead } from "@/lib/db/repositories/leads";
import { createInteraction, updateInteraction } from "@/lib/db/repositories/interactions";
import { runAction } from "./run";

export async function createLeadAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const input = parseInput(leadCreateSchema, formDataToObject(formData));
    return createLead(actor, input, req.ip);
  });
  if (!result.ok) return result;
  revalidatePath("/leads");
  redirect(`/leads/${result.data.id}`);
}

export async function updateLeadAction(leadId: string, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const id = parseInput(objectIdSchema, leadId);
    const input = parseInput(leadEditSchema, formDataToObject(formData));
    await updateLead(actor, id, input, req.ip);
    return id;
  });
  if (!result.ok) return result;
  // No redirect: the form is used both in the edit sheet and on the edit page, and each decides where to go.
  revalidatePath("/leads");
  revalidatePath(`/leads/${result.data}`);
  return { ok: true, data: undefined };
}

export async function createInteractionAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const input = parseInput(interactionCreateSchema, formDataToObject(formData));
    await createInteraction(actor, input, req.ip);
    return input.leadId;
  });
  if (!result.ok) return result;
  revalidatePath(`/leads/${result.data}`);
  revalidatePath("/interactions");
  return { ok: true, data: undefined };
}

export async function updateInteractionAction(leadId: string, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const lead = parseInput(objectIdSchema, leadId);
    const input = parseInput(interactionUpdateSchema, formDataToObject(formData));
    await updateInteraction(actor, input, req.ip);
    return lead;
  });
  if (!result.ok) return result;
  revalidatePath(`/leads/${result.data}`);
  revalidatePath("/interactions");
  return { ok: true, data: undefined };
}
