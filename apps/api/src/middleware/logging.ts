import { logger } from '../utils/logger';

export function requestLogger() {
  return async (c: any, next: any) => {
    const start = Date.now();
    await next();
    const duration = Date.now() - start;
    const requestId = c.get('requestId') || 'unknown';
    const user = c.get('user');
    const organizationId = c.get('organizationId');

    logger.info({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      duration,
      userId: user?.id ?? null,
      organizationId: organizationId ?? null,
    });
  };
}
