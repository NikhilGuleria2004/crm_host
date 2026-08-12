import { logger } from '../utils/logger';
import { HttpError } from './http-error';
import { z } from 'zod';

export function errorHandler() {
  return async (c: any, next: any) => {
    try {
      return await next();
    } catch (error) {
      const requestId = c.get('requestId') || 'unknown';
      const user = c.get('user');
      const organizationId = c.get('organizationId');

      if (error instanceof HttpError) {
        logger.error({
          requestId,
          method: c.req.method,
          path: c.req.path,
          userId: user?.id ?? null,
          organizationId: organizationId ?? null,
          status: error.status,
          code: error.code,
          message: error.message,
        });
        const response: Record<string, unknown> = {
          error: {
            code: error.code,
            message: error.message,
          },
        };
        if (error.details) {
          response.error.details = error.details;
        }
        c.status(error.status);
        return c.json(response);
      }

      if (error instanceof z.ZodError) {
        logger.error({
          requestId,
          method: c.req.method,
          path: c.req.path,
          userId: user?.id ?? null,
          organizationId: organizationId ?? null,
          status: 422,
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          fields: error.flatten().fieldErrors,
        });
        c.status(422);
        return c.json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            fields: error.flatten().fieldErrors,
          },
        });
      }

      logger.error({
        requestId,
        method: c.req.method,
        path: c.req.path,
        userId: user?.id ?? null,
        organizationId: organizationId ?? null,
        status: 500,
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
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
