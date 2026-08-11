import { connectDatabase, bootstrapIndexes, closeDatabase } from '../db';
import { logger } from '../utils/logger';

async function main() {
  try {
    await connectDatabase();
    logger.info('Database connected, ensuring indexes...');
    await bootstrapIndexes();
    logger.info('Indexes ensured successfully');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to ensure indexes');
    process.exit(1);
  } finally {
    await closeDatabase();
  }
}

main();
