import { connectDatabase, closeDatabase } from '../db/client';
import { queue } from '../queue';
import { exportConsumer, importConsumer, createWebhookConsumer, outboxConsumer } from '../queue/consumers';
import { logger } from '../utils/logger';

queue.register(exportConsumer);
queue.register(importConsumer);
queue.register(createWebhookConsumer());
queue.register(outboxConsumer);

async function processQueue() {
  try {
    await connectDatabase();
    logger.info('Worker started, processing queue jobs...');

    const processed = await queue.processAll(10);
    logger.info({ processed }, 'Worker processed queue jobs');

    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker failed');
    process.exit(1);
  }
}

processQueue();
