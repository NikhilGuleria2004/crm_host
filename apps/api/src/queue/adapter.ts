import { MongoQueue } from './queue';
import type { QueueAdapter, QueueConsumer, JobMessage } from './types';

export class MongoQueueAdapter implements QueueAdapter {
  private queue: MongoQueue;

  constructor() {
    this.queue = new MongoQueue();
  }

  async enqueue(message: JobMessage): Promise<string> {
    return this.queue.enqueue(message);
  }

  registerConsumer(consumer: QueueConsumer): void {
    this.queue.register(consumer);
  }

  async processNext(): Promise<boolean> {
    return this.queue.processNext();
  }

  async processAll(maxJobs?: number): Promise<number> {
    return this.queue.processAll(maxJobs);
  }
}
