import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { ObjectId } from 'mongodb';
import { requestId } from '../src/middleware/security';
import { requestLogger } from '../src/middleware/logging';
import { exportConsumer } from '../src/queue/consumers';
import type { QueueConsumer } from '../src/queue/types';
import { logger } from '../src/utils/logger';

vi.mock('../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const mockExportJobs = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
};

(globalThis as any).__mockExportJobs = mockExportJobs;

vi.mock('../src/db/collections', () => ({
  collections: {
    exportJobs: () => (globalThis as any).__mockExportJobs,
  },
}));

vi.mock('../src/storage/factory', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

describe('P36 Observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should set X-Request-Id header on every HTTP request', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.get('/test', (c) => c.json({ ok: true }, 200));

    const res = await app.request('/test');
    expect(res.status).toBe(200);
    expect(res.headers.get('X-Request-Id')).toBeTruthy();
  });

  it('should log requestId for every HTTP request', async () => {
    const app = new Hono();
    app.use('*', requestId());
    app.use('*', requestLogger());
    app.get('/test', (c) => c.json({ ok: true }, 200));

    await app.request('/test');
    expect(logger.info).toHaveBeenCalledTimes(1);
    const logArgs = (logger.info as any).mock.calls[0];
    expect(logArgs[0]).toMatchObject({
      requestId: expect.any(String),
      method: 'GET',
      path: '/test',
      status: 200,
    });
  });

  it('should include jobId and requestId in consumer logs', async () => {
    mockExportJobs.findOne.mockResolvedValue({
      _id: { toHexString: () => 'export-123' },
      organizationId: { toHexString: () => 'org-123' },
      entity: 'contacts',
      fields: ['firstName', 'email'],
      filters: {},
      status: 'pending',
      attempts: 0,
      maxAttempts: 3,
      availableAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockExportJobs.updateOne.mockResolvedValue({ modifiedCount: 1 });

    const consumer = exportConsumer as QueueConsumer;
    const payload = {
      jobId: new ObjectId().toHexString(),
      requestId: 'req-456',
      fields: ['firstName', 'email'],
    };

    const result = await consumer.process(payload, 1);
    expect(result.success).toBe(true);

    const infoCalls = (logger.info as any).mock.calls;
    const startCall = infoCalls.find((call: any) => call[0]?.jobId === payload.jobId && call[1] === 'Export consumer started');
    expect(startCall).toBeTruthy();
    expect(startCall[0]).toMatchObject({
      jobId: payload.jobId,
      requestId: 'req-456',
      consumer: 'export',
    });
  });
});
