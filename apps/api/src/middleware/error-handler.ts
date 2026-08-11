import { logger } from '../utils/logger';

export function errorHandler() {
  return async (c: any, next: any) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown';
      logger.error({ requestId, error: error instanceof Error ? error.message : String(error) });
      c.status(500);
      return c.json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
          requestId,
        },
      });
    }
  };
}
