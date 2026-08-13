import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { requestSizeLimit } from '../src/middleware/request-size-limit';

describe('P33 Request Size Limit', () => {
  it('should reject requests exceeding JSON body size limit', async () => {
    const app = new Hono();
    app.use('*', requestSizeLimit());
    app.post('/test', (c) => c.json({ ok: true }, 200));

    const largeBody = JSON.stringify({ data: 'x'.repeat(2 * 1024 * 1024) });
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(largeBody.length),
      },
      body: largeBody,
    });

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('should accept requests within JSON body size limit', async () => {
    const app = new Hono();
    app.use('*', requestSizeLimit());
    app.post('/test', (c) => c.json({ ok: true }, 200));

    const smallBody = JSON.stringify({ data: 'hello' });
    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': String(smallBody.length),
      },
      body: smallBody,
    });

    expect(res.status).toBe(200);
  });

  it('should accept requests without content-length', async () => {
    const app = new Hono();
    app.use('*', requestSizeLimit());
    app.post('/test', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data: 'hello' }),
    });

    expect(res.status).toBe(200);
  });

  it('should reject multipart requests exceeding size limit', async () => {
    const app = new Hono();
    app.use('*', requestSizeLimit());
    app.post('/upload', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
        'Content-Length': String(11 * 1024 * 1024),
      },
    });

    expect(res.status).toBe(413);
    const body = await res.json();
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });
});
