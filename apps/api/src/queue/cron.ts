import { connectDatabase } from '../db/client';
import { queue } from './queue';
import { exportConsumer, importConsumer, createWebhookConsumer, outboxConsumer } from './consumers';
import { logger } from '../utils/logger';

queue.register(exportConsumer);
queue.register(importConsumer);
queue.register(createWebhookConsumer());
queue.register(outboxConsumer);

export default async function handler() {
  try {
    await connectDatabase();
    const processed = await queue.processAll(10);
    logger.info({ processed }, 'Cron processed queue jobs');
    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Cron failed');
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
