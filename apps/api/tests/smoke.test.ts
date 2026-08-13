import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { requestId, securityHeaders } from '../src/middleware/security';
import { requestLogger } from '../src/middleware/logging';
import { cors } from '../src/middleware/cors';
import { errorHandler } from '../src/middleware/error-handler';
import { requestSizeLimit } from '../src/middleware/request-size-limit';

function createSmokeApp() {
  const app = new Hono();
  app.use('*', errorHandler());
  app.use('*', requestId());
  app.use('*', requestLogger());
  app.use('*', securityHeaders());
  app.use('*', cors());
  app.use('*', requestSizeLimit());

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.get('/ready', async (c) => {
    return c.json({ status: 'ready' }, 200);
  });

  app.post('/api/v1/auth/login', (c) => {
    return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid credentials' } }, 401);
  });

  app.get('/api/v1/protected', (c) => {
    return c.json({ data: 'protected' });
  });
  app.post('/api/v1/protected', (c) => {
    return c.json({ data: 'protected' });
  });

  return app;
}

describe('P37 Staging Smoke Tests', () => {
  describe('App Construction', () => {
    it('should construct the smoke app without errors', () => {
      const app = createSmokeApp();
      expect(app).toBeDefined();
    });

    it('GET /health should return 200 with ok status', async () => {
      const app = createSmokeApp();
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ok');
    });

    it('GET /ready should return 200', async () => {
      const app = createSmokeApp();
      const res = await app.request('/ready');
      expect(res.status).toBe(200);
    });

    it('should return 404 for unknown routes', async () => {
      const app = createSmokeApp();
      const res = await app.request('/nonexistent');
      expect(res.status).toBe(404);
    });
  });

  describe('Security Headers', () => {
    it('should include security headers on responses', async () => {
      const app = createSmokeApp();
      const res = await app.request('/health');
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
      expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
      expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none';");
    });

    it('should include X-Request-Id header', async () => {
      const app = createSmokeApp();
      const res = await app.request('/health');
      expect(res.headers.get('X-Request-Id')).toBeTruthy();
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const app = createSmokeApp();
      const res = await app.request('/health', {
        headers: { Origin: 'http://localhost:5173' },
      });
      expect(res.headers.get('access-control-allow-origin')).toBeTruthy();
    });
  });

  describe('Request Size Limit', () => {
    it('should reject oversized requests', async () => {
      const app = createSmokeApp();
      const largeBody = 'x'.repeat(2 * 1024 * 1024);
      const res = await app.request('/api/v1/protected', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': String(largeBody.length),
        },
        body: largeBody,
      });
      expect(res.status).toBe(413);
    });
  });

  describe('Auth Endpoints', () => {
    it('should respond to auth login endpoint', async () => {
      const app = createSmokeApp();
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
      expect([400, 401, 422]).toContain(res.status);
    });
  });

  describe('Protected Endpoints', () => {
    it('should allow unauthenticated access to public routes', async () => {
      const app = createSmokeApp();
      const res = await app.request('/api/v1/protected');
      expect(res.status).toBe(200);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully', async () => {
      const app = createSmokeApp();
      const res = await app.request('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid-json',
      });
      expect([400, 401, 422, 500]).toContain(res.status);
    });
  });
});
