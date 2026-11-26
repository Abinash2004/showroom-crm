import type { RateLimitRule } from "@/lib/constants";
import type { Actor, Json } from "@/lib/types";
import type { ActivityAction, ActivityEntity } from "@/lib/constants";

/** Ports (interfaces) the AuthService depends on. Adapters live in lib/db; tests supply in-memory fakes. */

export interface AuthUserRecord {
  id: string;
  name: string;
  code: string;
  phone: string;
  passwordHash: string | null;
  isActive: boolean;
  isAdmin: boolean;
  branchIds: string[];
  failedAttempt: number;
  lockedUntil: Date | null;
}

export interface UserAuthRepository {
  findByPhone(phone: string): Promise<AuthUserRecord | null>;
  /** Atomically sets the password only if none exists. Returns false if sign-up was already completed. */
  setPasswordIfUnset(userId: string, passwordHash: string, now: Date): Promise<boolean>;
  /** Increments and returns the failed-attempt counter. */
  registerFailure(userId: string): Promise<number>;
  lock(userId: string, until: Date): Promise<void>;
  registerSuccess(userId: string, now: Date): Promise<void>;
}

export interface NewSession {
  userId: string;
  tokenHash: string;
  userIp: string;
  userAgent: string;
  now: Date;
  expiresAt: Date;
}

export interface ActiveSession {
  sessionId: string;
  lastActiveAt: Date;
  actor: Actor;
}

export interface SessionRepository {
  create(session: NewSession): Promise<void>;
  /** Returns the session + user only when not revoked, not expired and the user is active. */
  findActive(tokenHash: string, now: Date): Promise<ActiveSession | null>;
  touch(sessionId: string, now: Date): Promise<void>;
  revokeByTokenHash(tokenHash: string, now: Date): Promise<void>;
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export interface RateLimiter {
  hit(key: string, rule: RateLimitRule): Promise<RateLimitResult>;
}

export interface PasswordHasher {
  hash(password: string): Promise<string>;
  verify(password: string, stored: string): Promise<boolean>;
}

export interface ActivityRecorder {
  record(entry: {
    entity: ActivityEntity;
    entityId: string;
    action: ActivityAction;
    changes: Record<string, { from: Json; to: Json }>;
    actionBy: string;
    actionIP: string;
  }): Promise<void>;
}

export interface Clock {
  now(): Date;
}

export interface TokenGenerator {
  /** Returns an opaque random token and its storage hash. */
  generate(): { token: string; tokenHash: string };
  hash(token: string): string;
}
