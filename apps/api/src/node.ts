import { serve } from '@hono/node-server';
import app from './app';
import { connectDatabase, bootstrapIndexes, closeDatabase } from './db';
import { logger } from './utils/logger';

const port = Number(process.env.PORT ?? 3000);

async function start() {
  try {
    await connectDatabase();
    await bootstrapIndexes();
    logger.info('Database connected and indexes bootstrapped');

    const server = serve({
      fetch: app.fetch,
      port,
    });

    logger.info(`API server running on http://localhost:${port}`);

    const shutdown = async () => {
      logger.info('Shutting down gracefully...');
      server.close(() => {
        logger.info('HTTP server closed');
      });
      await closeDatabase();
      logger.info('Database connection closed');
      process.exit(0);
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Failed to start server');
    process.exit(1);
  }
}

start();
