import { connectDatabase } from './db';
import { logger } from './utils/logger';
import app from './app';

connectDatabase().catch((error) => {
  logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to connect to database on cold start');
});

export const fetch = app.fetch.bind(app);

export const config = {
  runtime: 'nodejs',
};
