import { MongoQueueAdapter } from './adapter';
import type { QueueAdapter } from './types';

let queue: QueueAdapter | null = null;

export function createQueue(): QueueAdapter {
  if (!queue) {
    queue = new MongoQueueAdapter();
  }
  return queue;
}
