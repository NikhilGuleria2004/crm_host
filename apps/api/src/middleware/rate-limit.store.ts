export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

export interface RateLimitStore {
  hit(key: string, windowMs: number, max: number): Promise<RateLimitResult>;
}

import { collections } from '@/db/collections';

export class MongoRateLimitStore implements RateLimitStore {
  async hit(key: string, windowMs: number, max: number): Promise<RateLimitResult> {
    const now = Date.now();
    const resetAt = now + windowMs;

    const result = await collections.rateLimits().findOneAndUpdate(
      { _id: key, resetAt: { $gt: now } },
      { $inc: { count: 1 } },
      { upsert: false, returnDocument: 'after' }
    );

    if (result) {
      if (result.count > max) {
        return { allowed: false, remaining: 0, resetAt: result.resetAt };
      }
      return { allowed: true, remaining: max - result.count, resetAt: result.resetAt };
    }

    await collections.rateLimits().updateOne(
      { _id: key },
      { $set: { count: 1, resetAt } },
      { upsert: true }
    );

    return { allowed: true, remaining: max - 1, resetAt };
  }
}

export const rateLimitStore = new MongoRateLimitStore();
