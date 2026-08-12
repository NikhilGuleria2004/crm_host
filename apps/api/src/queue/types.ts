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

export interface QueueConsumer {
  type: JobType;
  process: (payload: Record<string, unknown>, attempts: number) => Promise<JobResult>;
}
