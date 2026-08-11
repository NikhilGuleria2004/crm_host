import { logger } from '../utils/logger';

export function errorHandler() {
  return async (c: any, next: any) => {
    try {
      await next();
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown';
      const user = c.get('user');
      const organizationId = c.get('organizationId');
      logger.error({
        requestId,
        method: c.req.method,
        path: c.req.path,
        userId: user?.id ?? null,
        organizationId: organizationId ?? null,
        error: error instanceof Error ? error.message : String(error),
      });
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
