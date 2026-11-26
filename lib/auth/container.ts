import "server-only";
import { AuthService } from "./auth-service";
import { CryptoTokenGenerator, ScryptHasher } from "./password";
import { MongoSessionRepository, MongoUserAuthRepository } from "@/lib/db/auth-repositories";
import { MongoRateLimiter } from "@/lib/db/rate-limiter";
import { mongoActivityRecorder } from "@/lib/db/activity";

let service: AuthService | undefined;

/** Composition root: wires the AuthService to its MongoDB adapters. */
export function getAuthService(): AuthService {
  service ??= new AuthService({
    users: new MongoUserAuthRepository(),
    sessions: new MongoSessionRepository(),
    limiter: new MongoRateLimiter(),
    hasher: new ScryptHasher(),
    tokens: new CryptoTokenGenerator(),
    activity: mongoActivityRecorder,
    clock: { now: () => new Date() },
  });
  return service;
}
