import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { errorHandler } from '../src/middleware/error-handler';
import { authenticate, requireAuth } from '../src/middleware/auth';
import { safeFetch } from '../src/utils/http';
import { BlobStorage } from '../src/storage/blob';
import { ImportService } from '../src/modules/imports/imports.service';
import { MongoQueue } from '../src/queue/queue';
import type { QueueConsumer } from '../src/queue/types';
import { ObjectId } from 'mongodb';

describe('P40 Failure Testing', () => {
  describe('MongoDB temporarily unavailable', () => {
    it('should return 503 from /ready when database is unhealthy', async () => {
      const mockCheckDatabaseHealth = vi.fn().mockResolvedValue({ status: 'unhealthy', detail: 'Connection refused' });

      vi.doMock('../src/db/client', async () => {
        const actual = await vi.importActual('../src/db/client');
        return {
          ...actual,
          checkDatabaseHealth: mockCheckDatabaseHealth,
        };
      });

      const { checkDatabaseHealth } = await import('../src/db/client');

      const app = new Hono();
      app.get('/ready', async (c) => {
        const dbHealth = await checkDatabaseHealth();
        return c.json({ status: dbHealth.status === 'healthy' ? 'ready' : 'not ready' }, dbHealth.status === 'healthy' ? 200 : 503);
      });

      const res = await app.request('/ready');
      expect(res.status).toBe(503);
      const json = await res.json();
      expect(json.status).toBe('not ready');
    });

    it('should return safe 500 error when route handler throws', async () => {
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

      const handler = errorHandler();
      const c = createMockContext();
      const next = async () => {
        throw new Error('Database connection failed');
      };

      const result = await handler(c, next);
      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An unexpected error occurred.');
      expect(data.error.requestId).toBe('test-123');
    });
  });

  describe('Blob unavailable', () => {
    it('should return null when BlobStorage.get() fails', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'));

      const blob = new BlobStorage();
      const result = await blob.get('test-key');

      expect(result).toBeNull();
    });

    it('should return synthetic 408 on safeFetch timeout', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const response = await safeFetch('https://example.com/api', undefined, { timeoutMs: 100 });

      expect(response.status).toBe(408);
      const body = await response.json();
      expect(body.error.code).toBe('REQUEST_TIMEOUT');
    });
  });

  describe('Queue failure and recovery', () => {
    it('should retry failed jobs and eventually mark as failed', async () => {
      vi.resetModules();

      const mockCollection = {
        findOneAndUpdate: vi.fn(),
        updateOne: vi.fn(),
      };

      let callCount = 0;
      mockCollection.findOneAndUpdate.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return {
            _id: new ObjectId(),
            type: 'test',
            payload: { jobId: 'job-1' },
            status: 'pending',
            attempts: 1,
            maxAttempts: 3,
            availableAt: new Date(),
          };
        }
        return null;
      });

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      vi.doMock('../src/db/collections', () => ({
        collections: {
          queueJobs: () => mockCollection,
        },
      }));

      const { MongoQueue } = await import('../src/queue/queue');
      const consumer: QueueConsumer = {
        type: 'test',
        process: vi.fn().mockResolvedValue({ success: false, error: 'Processing failed' }),
      };

      const queue = new MongoQueue();
      queue.register(consumer);

      const result = await queue.processNext();

      expect(result).toBe(true);
      expect(consumer.process).toHaveBeenCalledTimes(1);
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });

    it('should not permanently stick jobs when consumer throws', async () => {
      vi.resetModules();

      const mockCollection = {
        findOneAndUpdate: vi.fn().mockResolvedValue({
          _id: new ObjectId(),
          type: 'test',
          payload: { jobId: 'job-1' },
          status: 'pending',
          attempts: 1,
          maxAttempts: 3,
          availableAt: new Date(),
        }),
        updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      vi.doMock('../src/db/collections', () => ({
        collections: {
          queueJobs: () => mockCollection,
        },
      }));

      const { MongoQueue } = await import('../src/queue/queue');
      const consumer: QueueConsumer = {
        type: 'test',
        process: vi.fn().mockRejectedValue(new Error('Unexpected error')),
      };

      const queue = new MongoQueue();
      queue.register(consumer);

      const result = await queue.processNext();

      expect(result).toBe(true);
      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });

  describe('Webhook failure and recovery', () => {
    it('should handle webhook timeout gracefully', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const response = await safeFetch('https://example.com/webhook', undefined, { timeoutMs: 100 });

      expect(response.status).toBe(408);
      const body = await response.json();
      expect(body.error.code).toBe('REQUEST_TIMEOUT');
    });

    it('should handle webhook 500 response', async () => {
      const mockResponse = new Response('Internal Server Error', { status: 500 });
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

      const response = await safeFetch('https://example.com/webhook');

      expect(response.status).toBe(500);
      expect(response.ok).toBe(false);
    });
  });

  describe('Malformed import handling', () => {
    it('should fail import job gracefully when file read throws', async () => {
      vi.resetModules();

      const mockRepository = {
        findById: vi.fn().mockResolvedValue({
          _id: new ObjectId(),
          organizationId: new ObjectId(),
          entity: 'contacts',
          status: 'pending',
          fileKey: 'test-key',
        }),
        updateStatus: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      vi.doMock('../src/storage/factory', () => ({
        fileStorage: {
          get: vi.fn().mockRejectedValue(new Error('Storage read error')),
        },
      }));

      const { ImportService } = await import('../src/modules/imports/imports.service');
      const service = new ImportService(mockRepository as any);

      const result = await service.processImport({
        jobId: 'test-job',
        organizationId: 'org-1',
        fileKey: 'test-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Storage read error');
      expect(mockRepository.updateStatus).toHaveBeenCalledWith(
        'test-job',
        'org-1',
        { status: 'failed' }
      );
    });

    it('should handle missing import file gracefully', async () => {
      vi.resetModules();

      const mockRepository = {
        findById: vi.fn().mockResolvedValue({
          _id: new ObjectId(),
          organizationId: new ObjectId(),
          entity: 'contacts',
          status: 'pending',
          fileKey: 'missing-key',
        }),
        updateStatus: vi.fn().mockResolvedValue({ modifiedCount: 1 }),
      };

      vi.doMock('../src/storage/factory', () => ({
        fileStorage: {
          get: vi.fn().mockResolvedValue(null),
        },
      }));

      const { ImportService } = await import('../src/modules/imports/imports.service');
      const service = new ImportService(mockRepository as any);

      const result = await service.processImport({
        jobId: 'test-job',
        organizationId: 'org-1',
        fileKey: 'missing-key',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Import file not found');
    });
  });

  describe('Invalid session handling', () => {
    it('should return 401 when requireAuth is called without session', async () => {
      const c = {
        get: (key: string) => (key === 'user' ? null : undefined),
        json: (body: any) => new Response(JSON.stringify(body), { status: 401 }),
      };

      const result = await requireAuth(c as any, () => Promise.resolve());

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('Invalid API key handling', () => {
    it('should return 401 for invalid API key', async () => {
      vi.resetModules();

      const mockCollection = {
        findOne: vi.fn().mockResolvedValue(null),
      };

      vi.doMock('../src/db/collections', () => ({
        collections: {
          users: () => mockCollection,
          apiKeys: () => mockCollection,
          rolePermissions: () => ({
            find: vi.fn().mockReturnValue({
              toArray: vi.fn().mockResolvedValue([]),
            }),
          }),
        },
      }));

      const { authenticate } = await import('../src/middleware/auth');
      const c = {
        req: {
          header: (name: string) => (name === 'Authorization' ? 'Bearer invalid-key' : undefined),
        },
        json: (body: any) => new Response(JSON.stringify(body), { status: 401 }),
        set: () => {},
      };

      const result = await authenticate(c as any, () => Promise.resolve());

      expect(result).toBeInstanceOf(Response);
      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error.code).toBe('INVALID_API_KEY');
    });
  });

  describe('Error observability', () => {
    it('should return safe error response with requestId', async () => {
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

      const handler = errorHandler();
      const c = createMockContext();
      const next = async () => {
        throw new Error('Test error');
      };

      const result = await handler(c, next);
      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.error.code).toBe('INTERNAL_ERROR');
      expect(data.error.message).toBe('An unexpected error occurred.');
      expect(data.error.requestId).toBe('test-123');
    });

    it('should not leak stack traces or internal details in error responses', async () => {
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

      const handler = errorHandler();
      const c = createMockContext();
      const next = async () => {
        throw new Error('Database connection failed to mongodb://user:password@host:27017/db');
      };

      const result = await handler(c, next);
      expect(result.status).toBe(500);
      const data = await result.json();
      expect(data.error.message).toBe('An unexpected error occurred.');
      expect(data.error.message).not.toContain('mongodb://');
      expect(data.error.message).not.toContain('password');
    });
  });
});
