"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/errors";
import { loginSchema, signupSchema } from "@/lib/validators/auth";
import { formDataToObject, parseInput } from "@/lib/validators/parse";
import { getAuthService } from "@/lib/auth/container";
import { clearSessionCookie, getRequestInfo, SESSION_COOKIE, setSessionCookie } from "@/lib/auth/session";
import { BRANCH_COOKIE } from "@/lib/branch-preference";
import { runAction } from "./run";

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const input = parseInput(loginSchema, formDataToObject(formData));
    const { token, expiresAt } = await getAuthService().login(input, await getRequestInfo());
    await setSessionCookie(token, expiresAt);
  });
  if (result.ok) redirect("/leads");
  return result;
}

export async function signupAction(formData: FormData): Promise<ActionResult> {
  const result = await runAction(async () => {
    const input = parseInput(signupSchema, formDataToObject(formData));
    await getAuthService().signUp(input, await getRequestInfo());
  });
  if (result.ok) redirect("/login?registered=1");
  return result;
}

export async function logoutAction(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await getAuthService().logout(token);
  await clearSessionCookie();
  (await cookies()).delete(BRANCH_COOKIE);
  redirect("/login");
}
