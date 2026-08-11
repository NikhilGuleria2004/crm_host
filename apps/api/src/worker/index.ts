import { connectDatabase, closeDatabase } from '../db/client';
import { collections } from '../db/collections';
import { logger } from '../utils/logger';

async function processOutboxEvents() {
  try {
    await connectDatabase();
    logger.info('Worker started, processing outbox events...');

    const outboxCollection = collections.outboxEvents();
    const event = await outboxCollection.findOne({ status: 'pending' });
    if (!event) {
      logger.info('No pending outbox events');
      await closeDatabase();
      process.exit(0);
    }

    logger.info({ eventId: event._id.toHexString(), type: event.type }, 'Processing outbox event');

    await outboxCollection.updateOne(
      { _id: event._id },
      { $set: { status: 'processing', processedAt: new Date() } }
    );

    logger.info('Outbox event processed');
    await closeDatabase();
    process.exit(0);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Worker failed');
    process.exit(1);
  }
}

processOutboxEvents();
