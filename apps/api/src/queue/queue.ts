import { ObjectId } from 'mongodb';
import { collections } from '../db/collections';
import type { JobMessage, QueueConsumer } from './types';

export interface QueueJob {
  _id: ObjectId;
  type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  availableAt: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class MongoQueue {
  private consumers = new Map<string, QueueConsumer>();

  register(consumer: QueueConsumer): void {
    this.consumers.set(consumer.type, consumer);
  }

  async enqueue(message: JobMessage): Promise<string> {
    const type = message.type;
    const jobId = message.payload.jobId as string | undefined;

    if (!jobId) {
      throw new Error('JobMessage payload must include jobId for idempotency');
    }

    const now = new Date();
    try {
      const result = await collections.queueJobs().insertOne({
        type,
        payload: message.payload,
        status: 'pending',
        attempts: 0,
        maxAttempts: 3,
        availableAt: now,
        createdAt: now,
        updatedAt: now,
      } as any);

      return result.insertedId.toHexString();
    } catch (error: any) {
      if (error.code !== 11000) {
        throw error;
      }

      const existing = await collections.queueJobs().findOne({
        type,
        'payload.jobId': jobId,
        status: { $in: ['pending', 'processing'] },
      });

      if (existing) {
        return existing._id.toHexString();
      }

      throw error;
    }
  }

  async processNext(): Promise<boolean> {
    const now = new Date();
    const result = await collections.queueJobs().findOneAndUpdate(
      { status: 'pending', availableAt: { $lte: now } },
      { $set: { status: 'processing', updatedAt: now }, $inc: { attempts: 1 } },
      { sort: { createdAt: 1 }, returnDocument: 'after' }
    );

    if (!result) return false;

    const doc = result as QueueJob;
    const consumer = this.consumers.get(doc.type);

    try {
      if (!consumer) {
        throw new Error(`No consumer registered for job type: ${doc.type}`);
      }

      const result = await consumer.process(doc.payload, doc.attempts);

      if (result.success) {
        await collections.queueJobs().updateOne(
          { _id: doc._id },
          { $set: { status: 'completed', updatedAt: new Date() } }
        );
      } else {
        const shouldRetry = doc.attempts < doc.maxAttempts;
        
        await collections.queueJobs().updateOne(
          { _id: doc._id },
          {
            $set: {
              status: shouldRetry ? 'pending' : 'failed',
              lastError: result.error,
              availableAt: shouldRetry ? new Date(Date.now() + 5000 * doc.attempts) : new Date(),
              updatedAt: new Date(),
            },
          }
        );
      }
    } catch (error) {
      const shouldRetry = doc.attempts < doc.maxAttempts;
      const errorMessage = error instanceof Error ? error.message : String(error);

        await collections.queueJobs().updateOne(
          { _id: doc._id },
          {
            $set: {
              status: shouldRetry ? 'pending' : 'failed',
              lastError: errorMessage,
              availableAt: shouldRetry ? new Date(Date.now() + 5000 * doc.attempts) : new Date(),
              updatedAt: new Date(),
            },
          }
        );
    }

    return true;
  }

  async processAll(maxJobs = 10): Promise<number> {
    let processed = 0;
    while (processed < maxJobs) {
      const hasMore = await this.processNext();
      if (!hasMore) break;
      processed++;
    }
    return processed;
  }
}

export const queue = new MongoQueue();
