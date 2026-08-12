import { connectDatabase, closeDatabase } from '../db/client';
import { createQueue } from '../queue/factory';
import { exportConsumer, importConsumer, createWebhookConsumer, outboxConsumer, reportConsumer } from '../queue/consumers';
import { logger } from '../utils/logger';

const queue = createQueue();
queue.registerConsumer(exportConsumer);
queue.registerConsumer(importConsumer);
queue.registerConsumer(createWebhookConsumer());
queue.registerConsumer(outboxConsumer);
queue.registerConsumer(reportConsumer);

export const BATCH_SIZE = parseInt(process.env.QUEUE_BATCH_SIZE || '10', 10);
export const SLEEP_MS = parseInt(process.env.QUEUE_SLEEP_MS || '5000', 10);

export async function processBatch(): Promise<void> {
  await connectDatabase();
  const processed = await queue.processAll(BATCH_SIZE);
  if (processed > 0) {
    logger.info({ processed }, 'Worker processed queue jobs');
  }
  await closeDatabase();
}

async function run(): Promise<void> {
  logger.info('Worker started, processing queue in batches');
  while (true) {
    try {
      await processBatch();
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker batch failed');
    }
    await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
  }
}

if (process.env.NODE_ENV !== 'test') {
  run();
}
