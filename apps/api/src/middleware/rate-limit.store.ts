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
      { $inc: { count: 1 }, $setOnInsert: { resetAt } },
      { upsert: true, returnDocument: 'after' }
    );

    const count = result.count;
    if (count > max) {
      return { allowed: false, remaining: 0, resetAt: result.resetAt };
    }

    return { allowed: true, remaining: max - count, resetAt: result.resetAt };
  }
}

export const rateLimitStore = new MongoRateLimitStore();
