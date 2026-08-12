import { describe, it, expect } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler';
import { HttpError } from '../src/middleware/http-error';
import { z } from 'zod';

describe('P20 Error Handler', () => {
  const createMockContext = () => {
    let _status = 200;
    let _json: any = null;
    const c = {
      get: (key: string) => (key === 'requestId' ? 'test-123' : null),
      req: { method: 'GET', path: '/test' },
      status: (status: number) => {
        _status = status;
        return c;
      },
      json: (body: any) => {
        _json = body;
        return new Response(JSON.stringify(body), { status: _status });
      },
      _status,
      _json,
    };
    return c;
  };

  it('should handle HttpError with correct status and code', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const next = async () => {
      throw new HttpError(400, 'BAD_REQUEST', 'Invalid input');
    };

    const result = await handler(c, next);
    expect(result.status).toBe(400);
    const data = await result.json();
    expect(data.error.code).toBe('BAD_REQUEST');
    expect(data.error.message).toBe('Invalid input');
  });

  it('should include details in HttpError response', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const next = async () => {
      throw new HttpError(422, 'VALIDATION_ERROR', 'Invalid request body', {
        field: { _errors: ['Required'] },
      });
    };

    const result = await handler(c, next);
    expect(result.status).toBe(422);
    const data = await result.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.details).toBeDefined();
  });

  it('should handle ZodError with 422 and field errors', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const next = async () => {
      const schema = z.object({ name: z.string() });
      schema.parse({});
    };

    const result = await handler(c, next);
    expect(result.status).toBe(422);
    const data = await result.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.fields).toBeDefined();
  });

  it('should handle generic errors as 500 INTERNAL_ERROR', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const next = async () => {
      throw new Error('Something went wrong');
    };

    const result = await handler(c, next);
    expect(result.status).toBe(500);
    const data = await result.json();
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toBe('An unexpected error occurred.');
    expect(data.error.requestId).toBe('test-123');
  });

  it('should preserve existing error responses when not using HttpError', async () => {
    const handler = errorHandler();
    const c = createMockContext();
    const next = async () => {
      return new Response(JSON.stringify({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Item not found' } }), { status: 404 });
    };

    const result = await handler(c, next);
    expect(result.status).toBe(404);
    const data = await result.json();
    expect(data.error.code).toBe('RESOURCE_NOT_FOUND');
    expect(data.error.message).toBe('Item not found');
  });
});
