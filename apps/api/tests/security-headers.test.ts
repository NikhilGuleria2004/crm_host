import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { securityHeaders } from '../src/middleware/security';

describe('P32 Security Headers', () => {
  it('should apply security headers to all responses', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    app.get('/test', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/test');
    expect(res.status).toBe(200);

    const headers = res.headers;
    expect(headers.get('x-content-type-options')).toBe('nosniff');
    expect(headers.get('x-frame-options')).toBe('DENY');
    expect(headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none';");
  });

  it('should apply security headers to error responses', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    app.get('/test', (c) => c.json({ error: 'not found' }, 404));

    const res = await app.request('/test');
    expect(res.status).toBe(404);

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none';");
  });

  it('should apply security headers to POST requests', async () => {
    const app = new Hono();
    app.use('*', securityHeaders());
    app.post('/test', (c) => c.json({ created: true }, 201));

    const res = await app.request('/test', { method: 'POST', body: JSON.stringify({ name: 'test' }) });
    expect(res.status).toBe(201);

    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(res.headers.get('content-security-policy')).toBe("default-src 'none'; frame-ancestors 'none';");
  });
});
