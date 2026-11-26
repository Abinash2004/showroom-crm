import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { RATE_LIMITS } from "@/lib/constants";
import type { Actor } from "@/lib/types";
import { getAuthService } from "./container";
import { MongoRateLimiter } from "@/lib/db/rate-limiter";
import type { RequestInfo } from "./auth-service";

const isProd = process.env.NODE_ENV === "production";
export const SESSION_COOKIE = isProd ? "__Host-sid" : "sid";

export async function getRequestInfo(): Promise<RequestInfo> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ip: forwarded || h.get("x-real-ip") || "unknown",
    userAgent: (h.get("user-agent") ?? "").slice(0, 300),
  };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Per-request memoized actor lookup. Always hits the DB-backed session, so deactivation takes effect immediately. */
export const getActor = cache(async (): Promise<Actor | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getAuthService().authenticate(token);
});

/** For pages/layouts: redirects to /login when unauthenticated. */
export async function requireActor(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  return actor;
}

/** For admin pages: 404 for non-admins so admin routes are not discoverable. */
export async function requireAdminPage(): Promise<Actor> {
  const actor = await requireActor();
  if (!actor.isAdmin) notFound();
  return actor;
}

const writeLimiter = new MongoRateLimiter();

/** For Server Actions: throws typed errors and applies the per-user write rate limit. */
export async function requireWriteActor(): Promise<{ actor: Actor; req: RequestInfo }> {
  const actor = await getActor();
  if (!actor) throw new AppError("UNAUTHENTICATED", "Your session has expired. Please sign in again.");
  const result = await writeLimiter.hit(`write:${actor.id}`, RATE_LIMITS.write);
  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", "You are doing that too quickly. Please wait a moment.", undefined, result.retryAfterSec);
  }
  return { actor, req: await getRequestInfo() };
}
