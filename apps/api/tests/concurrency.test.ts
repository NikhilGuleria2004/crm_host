import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MongoQueue } from '../src/queue/queue';
import type { QueueConsumer } from '../src/queue/types';
import { ObjectId } from 'mongodb';

vi.mock('../src/db/collections', () => {
  const mockCollection = {
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    insertOne: vi.fn(),
    updateOne: vi.fn(),
  };
  (globalThis as any).__mockQueueCollection = mockCollection;
  return {
    collections: {
      queueJobs: vi.fn(() => mockCollection),
    },
  };
});

describe('P38 Concurrency', () => {
  let queue: MongoQueue;
  let consumer: QueueConsumer;
  let mockCollection: any;

  beforeEach(() => {
    mockCollection = (globalThis as any).__mockQueueCollection;
    mockCollection.findOne.mockClear();
    mockCollection.findOneAndUpdate.mockClear();
    mockCollection.insertOne.mockClear();
    mockCollection.updateOne.mockClear();

    queue = new MongoQueue();
    consumer = {
      type: 'test',
      process: vi.fn().mockResolvedValue({ success: true }),
    };
    queue.register(consumer);
  });

  describe('Queue enqueue duplicate key handling', () => {
    it('should return existing job ID on duplicate key error', async () => {
      const jobId = 'duplicate-job-1';
      const existingJob = { _id: new ObjectId(), type: 'test', payload: { jobId }, status: 'pending' };

      mockCollection.insertOne.mockRejectedValueOnce({
        code: 11000,
        message: 'E11000 duplicate key error',
      });
      mockCollection.findOne.mockResolvedValue(existingJob);

      const result = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId },
      });

      expect(result).toBe(existingJob._id.toHexString());
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        type: 'test',
        'payload.jobId': jobId,
        status: { $in: ['pending', 'processing'] },
      });
    });

    it('should rethrow non-duplicate key errors', async () => {
      mockCollection.insertOne.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        queue.enqueue({ version: 1, type: 'test', payload: { jobId: 'job-1' } })
      ).rejects.toThrow('Network error');
    });

    it('should insert new job when no duplicate exists', async () => {
      const newId = new ObjectId();
      mockCollection.insertOne.mockImplementation((doc: any) => {
        Object.assign(doc, { _id: newId, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: newId };
      });

      const result = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'new-job-1' },
      });

      expect(result).toBe(newId.toHexString());
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('Queue processNext concurrency', () => {
    it('should process jobs without duplicate processing using atomic findOneAndUpdate', async () => {
      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 3,
        availableAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockCollection.findOneAndUpdate.mockResolvedValueOnce(job).mockResolvedValueOnce(null);
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const promises = [
        queue.processNext(),
        queue.processNext(),
        queue.processNext(),
      ];

      const results = await Promise.all(promises);
      const successfulProcesses = results.filter(r => r === true);

      expect(successfulProcesses.length).toBe(1);
      expect(consumer.process).toHaveBeenCalledTimes(1);
    });
  });

  describe('Webhook delivery idempotency', () => {
    it('should generate unique jobIds for concurrent webhook deliveries', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const promises = [
        queue.enqueue({
          version: 1,
          type: 'webhook',
          payload: {
            jobId: `webhook:contact.created:${Date.now()}`,
            webhookId: 'wh-1',
            organizationId: 'org-1',
            eventType: 'contact.created',
            eventId: 'evt-1',
            payload: { name: 'Test' },
          },
        }),
        queue.enqueue({
          version: 1,
          type: 'webhook',
          payload: {
            jobId: `webhook:contact.created:${Date.now() + 1}`,
            webhookId: 'wh-1',
            organizationId: 'org-1',
            eventType: 'contact.created',
            eventId: 'evt-2',
            payload: { name: 'Test' },
          },
        }),
      ];

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results);

      expect(uniqueIds.size).toBe(2);
    });
  });

  describe('General concurrency', () => {
    it('should handle 10 concurrent enqueues of different jobs', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const promises = Array.from({ length: 10 }, (_, i) =>
        queue.enqueue({ version: 1, type: 'test', payload: { jobId: `job-${i}` } })
      );

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results);

      expect(uniqueIds.size).toBe(10);
    });

    it('should handle 50 concurrent enqueues of different jobs', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const promises = Array.from({ length: 50 }, (_, i) =>
        queue.enqueue({ version: 1, type: 'test', payload: { jobId: `job-${i}` } })
      );

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results);

      expect(uniqueIds.size).toBe(50);
    });

    it('should handle 100 concurrent enqueues of different jobs', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const promises = Array.from({ length: 100 }, (_, i) =>
        queue.enqueue({ version: 1, type: 'test', payload: { jobId: `job-${i}` } })
      );

      const results = await Promise.all(promises);
      const uniqueIds = new Set(results);

      expect(uniqueIds.size).toBe(100);
    });
  });
});
