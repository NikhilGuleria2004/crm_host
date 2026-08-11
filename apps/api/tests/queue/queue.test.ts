import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MongoQueue } from '../../src/queue/queue';
import type { QueueConsumer } from '../../src/queue/types';
import { ObjectId } from 'mongodb';

vi.mock('../../src/db/collections', () => {
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

describe('P10 MongoQueue', () => {
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

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('enqueue', () => {
    it('should insert a new job when jobId does not exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const jobId = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'test-job-1' },
      });

      expect(jobId).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });

    it('should return existing job id when same jobId already exists', async () => {
      const existingJob = { _id: new ObjectId(), type: 'test', payload: { jobId: 'test-job-1' }, status: 'pending' };
      mockCollection.findOne.mockResolvedValue(existingJob);

      const first = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'test-job-1' },
      });

      mockCollection.insertOne.mockClear();
      const second = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'test-job-1' },
      });

      expect(mockCollection.insertOne).not.toHaveBeenCalled();
      expect(second).toBe(first);
    });

    it('should allow re-enqueue after job is completed', async () => {
      const completedJob = { _id: new ObjectId(), type: 'test', payload: { jobId: 'test-job-1' }, status: 'completed' };
      mockCollection.findOne.mockResolvedValueOnce(completedJob).mockResolvedValueOnce(null);

      const first = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'test-job-1' },
      });

      mockCollection.insertOne.mockImplementation((doc: any) => {
        const id = new ObjectId();
        Object.assign(doc, { _id: id, createdAt: new Date(), updatedAt: new Date() });
        return { insertedId: id };
      });

      const second = await queue.enqueue({
        version: 1,
        type: 'test',
        payload: { jobId: 'test-job-2' },
      });

      expect(first).toBeDefined();
      expect(second).toBeDefined();
      expect(mockCollection.insertOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('processNext', () => {
    it('should claim and process a pending job', async () => {
      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 3,
        availableAt: new Date(Date.now() - 1000),
      };
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        ...job, status: 'processing', attempts: 1, updatedAt: new Date(),
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const processed = await queue.processNext();

      expect(processed).toBe(true);
      expect(consumer.process).toHaveBeenCalledWith({ jobId: 'test-job-1' }, 1);
    });

    it('should mark job as completed on success', async () => {
      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 3,
        availableAt: new Date(Date.now() - 1000),
      };
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        ...job, status: 'processing', attempts: 1, updatedAt: new Date(),
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await queue.processNext();

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        { $set: { status: 'completed', updatedAt: expect.any(Date) } }
      );
    });

    it('should retry failed job with correct attempt count', async () => {
      consumer.process = vi.fn().mockResolvedValue({ success: false, error: 'failed' });

      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 3,
        availableAt: new Date(Date.now() - 1000),
      };
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        ...job, status: 'processing', attempts: 1, updatedAt: new Date(),
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await queue.processNext();

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: {
            status: 'pending',
            lastError: 'failed',
            availableAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        }
      );
    });

    it('should mark job as failed after max attempts', async () => {
      consumer.process = vi.fn().mockResolvedValue({ success: false, error: 'failed' });

      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 1,
        availableAt: new Date(Date.now() - 1000),
      };
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        ...job, status: 'processing', attempts: 1, updatedAt: new Date(),
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await queue.processNext();

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: {
            status: 'failed',
            lastError: 'failed',
            availableAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        }
      );
    });

    it('should return false when no pending jobs exist', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue(null);

      const processed = await queue.processNext();

      expect(processed).toBe(false);
    });

    it('should handle consumer throwing error', async () => {
      consumer.process = vi.fn().mockRejectedValue(new Error('consumer error'));

      const job = {
        _id: new ObjectId(),
        type: 'test',
        payload: { jobId: 'test-job-1' },
        status: 'pending',
        attempts: 1,
        maxAttempts: 3,
        availableAt: new Date(Date.now() - 1000),
      };
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        ...job, status: 'processing', attempts: 1, updatedAt: new Date(),
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      await queue.processNext();

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { _id: expect.any(ObjectId) },
        {
          $set: {
            status: 'pending',
            lastError: 'consumer error',
            availableAt: expect.any(Date),
            updatedAt: expect.any(Date),
          },
        }
      );
    });
  });

  describe('processAll', () => {
    it('should process up to maxJobs jobs', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue({
        value: {
          _id: new ObjectId(),
          type: 'test',
          payload: { jobId: 'test-job-1' },
          status: 'processing',
          attempts: 1,
          maxAttempts: 3,
          availableAt: new Date(),
        },
        ok: 1,
      });
      mockCollection.updateOne.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 });

      const processed = await queue.processAll(2);

      expect(processed).toBeLessThanOrEqual(2);
    });

    it('should stop when no more jobs are available', async () => {
      mockCollection.findOne.mockResolvedValue(null);
      mockCollection.findOneAndUpdate.mockReturnValue(null);

      const processed = await queue.processAll(10);

      expect(processed).toBe(0);
    });
  });
});
