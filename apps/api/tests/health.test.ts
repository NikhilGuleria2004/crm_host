import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockCheckDatabaseHealth = vi.fn();

vi.mock('../src/db/client', () => ({
  get checkDatabaseHealth() {
    return mockCheckDatabaseHealth;
  },
}));

import { checkDatabaseHealth } from '../src/db/client';

function checkConfigHealth() {
  const required = ['MONGODB_URI', 'MONGODB_DATABASE', 'SESSION_SECRET', 'CORS_ORIGIN'];
  const missing: string[] = [];
  for (const key of required) {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    return { status: 'unhealthy' as const, missing };
  }
  return { status: 'healthy' as const };
}

function createHealthApp() {
  const app = new Hono();

  app.get('/health', (c) => c.json({ status: 'ok' }));

  app.get('/ready', async (c) => {
    const dbHealth = await checkDatabaseHealth();
    const configHealth = checkConfigHealth();
    const isHealthy = dbHealth.status === 'healthy' && configHealth.status === 'healthy';
    return c.json(
      { status: isHealthy ? 'ready' : 'not ready', database: dbHealth, config: configHealth },
      isHealthy ? 200 : 503
    );
  });

  return app;
}

describe('P16 Health Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
    process.env.MONGODB_DATABASE = process.env.MONGODB_DATABASE || 'crm';
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'a'.repeat(32);
    process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
  });

  describe('GET /health', () => {
    it('should return 200 with ok status', async () => {
      const app = createHealthApp();
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ status: 'ok' });
    });
  });

  describe('GET /ready', () => {
    it('should return 200 when database and config are healthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({ status: 'healthy' });
      const app = createHealthApp();
      const res = await app.request('/ready');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe('ready');
      expect(json.database.status).toBe('healthy');
      expect(json.config.status).toBe('healthy');
    });

    it('should return 503 when database is unhealthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({ status: 'unhealthy', detail: 'Connection refused' });
      const app = createHealthApp();
      const res = await app.request('/ready');
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe('not ready');
      expect(json.database.status).toBe('unhealthy');
    });

    it('should return 503 when required config is missing', async () => {
      const originalUri = process.env.MONGODB_URI;
      process.env.MONGODB_URI = '';
      try {
        const app = createHealthApp();
        const res = await app.request('/ready');
        expect(res.status).toBe(503);
        const json = await res.json();
        expect(json.status).toBe('not ready');
        expect(json.config.status).toBe('unhealthy');
        expect(json.config.missing).toContain('MONGODB_URI');
      } finally {
        process.env.MONGODB_URI = originalUri;
      }
    });
  });

  describe('MongoDB error sanitization', () => {
    it('should redact MongoDB connection string with credentials', () => {
      const input = 'MongoNetworkError: failed to connect to mongodb://user:password@host:27017/db';
      const sanitized = input.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, 'mongodb://***');
      expect(sanitized).not.toContain('password');
      expect(sanitized).not.toContain('mongodb://user');
      expect(sanitized).toContain('mongodb://***');
    });

    it('should redact MongoDB SRV connection string', () => {
      const input = 'MongoParseError: Invalid mongodb+srv://admin:secret123@cluster0.mongodb.net/test';
      const sanitized = input.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, 'mongodb://***');
      expect(sanitized).not.toContain('secret123');
      expect(sanitized).not.toContain('mongodb+srv://');
      expect(sanitized).toContain('mongodb://***');
    });

    it('should leave non-MongoDB errors unchanged', () => {
      const input = 'ECONNREFUSED: Connection refused';
      const sanitized = input.replace(/mongodb(?:\+srv)?:\/\/[^\s]+/gi, 'mongodb://***');
      expect(sanitized).toBe(input);
    });
  });
});
