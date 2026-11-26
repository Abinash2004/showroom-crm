import "server-only";
import { connectDb } from "./connection";
import { RateLimitModel } from "./models";
import type { RateLimiter, RateLimitResult } from "@/lib/auth/ports";
import type { RateLimitRule } from "@/lib/constants";

/**
 * Fixed-window counter backed by MongoDB. A single atomic upsert with an aggregation pipeline
 * either starts a new window (count=1) or increments the current one, so concurrent serverless
 * invocations cannot under-count. Expired documents are removed by a TTL index.
 */
export class MongoRateLimiter implements RateLimiter {
  constructor(private readonly now: () => Date = () => new Date()) {}

  async hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
    await connectDb();
    const now = this.now();
    const newWindowEnd = new Date(now.getTime() + rule.windowSec * 1000);
    const pipeline = [
      {
        $set: {
          count: { $cond: [{ $lt: ["$windowEndsAt", now] }, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] },
          windowEndsAt: { $cond: [{ $lt: ["$windowEndsAt", now] }, newWindowEnd, "$windowEndsAt"] },
        },
      },
    ];

    let doc = null;
    for (let attempt = 0; attempt < 2 && !doc; attempt++) {
      try {
        doc = await RateLimitModel.findOneAndUpdate({ key }, pipeline, {
          upsert: true,
          updatePipeline: true,
          returnDocument: "after",
          lean: true,
        });
      } catch (err) {
        // Two first-ever hits can race on the unique index; the retry then takes the update path.
        if (attempt === 1 || !(err instanceof Error) || !/E11000/.test(err.message)) throw err;
      }
    }
    if (!doc) return { allowed: true, retryAfterSec: 0 };
    const allowed = doc.count <= rule.limit;
    const retryAfterSec = allowed ? 0 : Math.max(1, Math.ceil((doc.windowEndsAt.getTime() - now.getTime()) / 1000));
    return { allowed, retryAfterSec };
  }
}
