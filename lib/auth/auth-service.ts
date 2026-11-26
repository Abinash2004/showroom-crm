import { AppError } from "@/lib/errors";
import { APP_TZ_OFFSET_MINUTES, AUTH_POLICY, RATE_LIMITS } from "@/lib/constants";
import type { RateLimitRule } from "@/lib/constants";
import type { Actor } from "@/lib/types";
import type { LoginInput, SignupInput } from "@/lib/validators/auth";
import { nextMidnight } from "./session-time";
import type {
  ActivityRecorder,
  Clock,
  PasswordHasher,
  RateLimiter,
  SessionRepository,
  TokenGenerator,
  UserAuthRepository,
} from "./ports";

export interface AuthDeps {
  users: UserAuthRepository;
  sessions: SessionRepository;
  limiter: RateLimiter;
  hasher: PasswordHasher;
  tokens: TokenGenerator;
  activity: ActivityRecorder;
  clock: Clock;
}

export interface RequestInfo {
  ip: string;
  userAgent: string;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
}

const INVALID_LOGIN = "Invalid phone number or password.";
const SIGNUP_UNAVAILABLE = "Sign-up is not available for these details. Contact your administrator.";

export class AuthService {
  private dummyHash: Promise<string> | null = null;

  constructor(private readonly deps: AuthDeps) {}

  /** Completes the one-time sign-up for an admin-created user. */
  async signUp(input: SignupInput, req: RequestInfo): Promise<void> {
    await this.enforce(`signup:ip:${req.ip}`, RATE_LIMITS.signupIp);
    await this.enforce(`signup:phone:${input.phone}`, RATE_LIMITS.signupPhone);

    const user = await this.deps.users.findByPhone(input.phone);
    // Same message for unknown phone, wrong code, inactive user or already signed up: no account enumeration.
    if (!user || !user.isActive || user.passwordHash || user.code !== input.code) {
      if (!user) await this.burnTime(input.password);
      throw new AppError("FORBIDDEN", SIGNUP_UNAVAILABLE);
    }

    const now = this.deps.clock.now();
    const hash = await this.deps.hasher.hash(input.password);
    const updated = await this.deps.users.setPasswordIfUnset(user.id, hash, now);
    if (!updated) throw new AppError("FORBIDDEN", SIGNUP_UNAVAILABLE);

    await this.deps.activity.record({
      entity: "user",
      entityId: user.id,
      action: "update",
      changes: { passwordSet: { from: false, to: true } },
      actionBy: user.id,
      actionIP: req.ip,
    });
  }

  async login(input: LoginInput, req: RequestInfo): Promise<LoginResult> {
    await this.enforce(`login:ip:${req.ip}`, RATE_LIMITS.loginIp);
    await this.enforce(`login:phone:${input.phone}`, RATE_LIMITS.loginPhone);

    const now = this.deps.clock.now();
    const user = await this.deps.users.findByPhone(input.phone);

    if (!user || !user.passwordHash) {
      await this.burnTime(input.password);
      throw new AppError("UNAUTHENTICATED", INVALID_LOGIN);
    }

    if (user.lockedUntil && user.lockedUntil > now) {
      const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000));
      throw new AppError("LOCKED", `Account locked after too many failed attempts. Try again in ${minutes} minute(s).`);
    }

    const valid = await this.deps.hasher.verify(input.password, user.passwordHash);
    if (!valid || !user.isActive) {
      if (valid === false) {
        const attempts = await this.deps.users.registerFailure(user.id);
        if (attempts >= AUTH_POLICY.maxFailedAttempts) {
          await this.deps.users.lock(user.id, new Date(now.getTime() + AUTH_POLICY.lockMinutes * 60_000));
        }
      }
      throw new AppError("UNAUTHENTICATED", INVALID_LOGIN);
    }

    await this.deps.users.registerSuccess(user.id, now);
    const { token, tokenHash } = this.deps.tokens.generate();
    const expiresAt = nextMidnight(now, APP_TZ_OFFSET_MINUTES);
    await this.deps.sessions.create({
      userId: user.id,
      tokenHash,
      userIp: req.ip,
      userAgent: req.userAgent,
      now,
      expiresAt,
    });
    return { token, expiresAt };
  }

  async logout(token: string): Promise<void> {
    await this.deps.sessions.revokeByTokenHash(this.deps.tokens.hash(token), this.deps.clock.now());
  }

  /** Resolves the actor for a session token, or null if missing/expired/revoked/deactivated. */
  async authenticate(token: string): Promise<Actor | null> {
    const now = this.deps.clock.now();
    const active = await this.deps.sessions.findActive(this.deps.tokens.hash(token), now);
    if (!active) return null;
    if (now.getTime() - active.lastActiveAt.getTime() > AUTH_POLICY.touchIntervalMs) {
      await this.deps.sessions.touch(active.sessionId, now);
    }
    return active.actor;
  }

  private async enforce(key: string, rule: RateLimitRule): Promise<void> {
    const result = await this.deps.limiter.hit(key, rule);
    if (!result.allowed) {
      throw new AppError("RATE_LIMITED", "Too many attempts. Please wait before trying again.", undefined, result.retryAfterSec);
    }
  }

  /** Equalizes response time when the account does not exist. */
  private async burnTime(password: string): Promise<void> {
    this.dummyHash ??= this.deps.hasher.hash("timing-equalizer");
    await this.deps.hasher.verify(password, await this.dummyHash);
  }
}
