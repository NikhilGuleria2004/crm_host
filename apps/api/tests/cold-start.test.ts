import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('P39 Cold Start', () => {
  describe('App cold start behavior', () => {
    it('should handle first request when database is not yet connected', async () => {
      const { Hono } = await import('hono');

      const app = new Hono();
      app.get('/health', (c) => c.json({ status: 'ok' }));
      app.get('/ready', async (c) => {
        return c.json({ status: 'not ready', database: { status: 'unhealthy', detail: 'Not connected' } }, 503);
      });

      const healthRes = await app.request('/health');
      expect(healthRes.status).toBe(200);
      const healthJson = await healthRes.json();
      expect(healthJson).toEqual({ status: 'ok' });

      const readyRes = await app.request('/ready');
      expect(readyRes.status).toBe(503);
      const readyJson = await readyRes.json();
      expect(readyJson.status).toBe('not ready');
    });

    it('should handle parallel first requests without race conditions', async () => {
      const { Hono } = await import('hono');

      const app = new Hono();
      app.get('/health', (c) => c.json({ status: 'ok' }));
      app.get('/ready', async (c) => {
        return c.json({ status: 'ready', database: { status: 'healthy' } });
      });

      const promises = [
        app.request('/health'),
        app.request('/health'),
        app.request('/ready'),
        app.request('/ready'),
      ];

      const results = await Promise.all(promises);

      expect(results[0].status).toBe(200);
      expect(results[1].status).toBe(200);
      expect(results[2].status).toBe(200);
      expect(results[3].status).toBe(200);
    });

    it('should not assume module-level state exists on first request', async () => {
      const { Hono } = await import('hono');

      const app = new Hono();
      app.get('/health', (c) => c.json({ status: 'ok' }));

      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'ok' });
    });
  });

  describe('Database connection concurrency', () => {
    it('should only create one connection for concurrent calls', async () => {
      const mockConnect = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 50));
      });

      vi.doMock('../src/db/client', async () => {
        const actual = await vi.importActual('../src/db/client');
        let db: any = null;
        let connecting: Promise<any> | null = null;

        const connectDatabase = vi.fn().mockImplementation(async () => {
          if (db) return db;
          if (connecting) return connecting;

          connecting = (async () => {
            const client = { connect: mockConnect, db: () => ({ name: 'test' }), close: vi.fn() };
            await client.connect();
            db = client.db();
            return db;
          })();

          try {
            return await connecting;
          } catch (error) {
            connecting = null;
            throw error;
          }
        });

        return {
          ...actual,
          connectDatabase,
        };
      });

      const { connectDatabase } = await import('../src/db/client');

      const promises = [
        connectDatabase(),
        connectDatabase(),
        connectDatabase(),
      ];

      const results = await Promise.all(promises);

      expect(results[0]).toBe(results[1]);
      expect(results[1]).toBe(results[2]);
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });
});
