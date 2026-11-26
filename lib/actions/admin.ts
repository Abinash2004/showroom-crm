"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/lib/errors";
import { requireWriteActor } from "@/lib/auth/session";
import { formDataToObject, parseInput } from "@/lib/validators/parse";
import {
  branchCreateSchema,
  branchUpdateSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validators/entities";
import { checkboxSchema, objectIdSchema } from "@/lib/validators/common";
import { createBranch, setBranchActive, updateBranch } from "@/lib/db/repositories/branches";
import { createUser, setUserActive, updateUser } from "@/lib/db/repositories/users";
import { runAction } from "./run";

const toggleSchema = z.object({ id: objectIdSchema, isActive: checkboxSchema });

export async function createBranchAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    await createBranch(actor, parseInput(branchCreateSchema, formDataToObject(formData)), req.ip);
  });
  // No redirect: the form lives in a sheet on the branch list, which refreshes in place.
  if (result.ok) {
    revalidatePath("/admin/branches");
    revalidatePath("/admin");
  }
  return result;
}

export async function updateBranchAction(branchId: string, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const id = parseInput(objectIdSchema, branchId);
    await updateBranch(actor, id, parseInput(branchUpdateSchema, formDataToObject(formData)), req.ip);
  });
  if (result.ok) revalidatePath("/admin/branches");
  return result;
}

export async function setBranchActiveAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const input = parseInput(toggleSchema, formDataToObject(formData));
    await setBranchActive(actor, input.id, input.isActive, req.ip);
  });
  if (result.ok) revalidatePath("/admin/branches");
  return result;
}

export async function createUserAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    await createUser(actor, parseInput(userCreateSchema, formDataToObject(formData)), req.ip);
  });
  // No redirect: the form lives in a sheet on the user list, which refreshes in place.
  if (result.ok) {
    revalidatePath("/admin/users");
    revalidatePath("/admin");
  }
  return result;
}

export async function updateUserAction(userId: string, formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const id = parseInput(objectIdSchema, userId);
    await updateUser(actor, id, parseInput(userUpdateSchema, formDataToObject(formData)), req.ip);
  });
  if (result.ok) {
    revalidatePath("/admin/users");
    revalidatePath("/admin");
  }
  return result;
}

export async function setUserActiveAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const { actor, req } = await requireWriteActor();
    const input = parseInput(toggleSchema, formDataToObject(formData));
    await setUserActive(actor, input.id, input.isActive, req.ip);
  });
  if (result.ok) {
    revalidatePath("/admin/users");
    revalidatePath("/admin/sessions");
  }
  return result;
}
