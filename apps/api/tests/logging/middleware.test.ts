import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requestLogger } from '../../src/middleware/logging';
import { requestId } from '../../src/middleware/security';
import { logger } from '../../src/utils/logger';

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('P12 Logging Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should log structured request fields including userId and organizationId', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.use('*', requestLogger());
    app.get('/test', (c) => {
      c.set('user', { id: 'user-123' });
      c.set('organizationId', 'org-456');
      return c.json({ ok: true }, 200);
    });

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toBeTruthy();

    expect(logger.info).toHaveBeenCalledTimes(1);
    const logArgs = (logger.info as any).mock.calls[0];
    expect(logArgs[0]).toMatchObject({
      requestId: expect.any(String),
      method: 'GET',
      path: '/test',
      status: 200,
      duration: expect.any(Number),
      userId: 'user-123',
      organizationId: 'org-456',
    });
  });

  it('should log null userId and organizationId for unauthenticated requests', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.use('*', requestLogger());
    app.get('/public', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/public');
    expect(res.status).toBe(200);

    const logArgs = (logger.info as any).mock.calls[0];
    expect(logArgs[0]).toMatchObject({
      userId: null,
      organizationId: null,
    });
  });
});
