import { ObjectId } from 'mongodb';

export type JobType = 'export' | 'import' | 'webhook' | 'outbox' | 'report';

export interface JobMessage {
  version: 1;
  type: JobType;
  payload: Record<string, unknown>;
}

export interface JobResult {
  success: boolean;
  error?: string;
}

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

export interface QueueAdapter {
  enqueue(message: JobMessage): Promise<string>;
  registerConsumer(consumer: QueueConsumer): void;
  processNext(): Promise<boolean>;
  processAll(maxJobs?: number): Promise<number>;
}

export interface QueueConsumer {
  type: JobType;
  process: (payload: Record<string, unknown>, attempts: number) => Promise<JobResult>;
}
