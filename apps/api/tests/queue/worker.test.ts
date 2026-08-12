import { describe, it, expect, vi, beforeEach } from 'vitest';

var mockQueue: any = null;

vi.mock('../../src/db/client', () => ({
  connectDatabase: vi.fn().mockResolvedValue({}),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/queue/queue', () => ({
  MongoQueue: class {
    register = mockQueue.register;
    processAll = mockQueue.processAll;
    enqueue = vi.fn();
    processNext = vi.fn();
  },
}));

vi.mock('../../src/queue/consumers', () => ({
  exportConsumer: { type: 'export', process: vi.fn() },
  importConsumer: { type: 'import', process: vi.fn() },
  createWebhookConsumer: vi.fn(() => ({ type: 'webhook', process: vi.fn() })),
  outboxConsumer: { type: 'outbox', process: vi.fn() },
  reportConsumer: { type: 'report', process: vi.fn() },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('P10 Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockQueue = {
      register: vi.fn(),
      processAll: vi.fn().mockResolvedValue(0),
    };
  });

  it('should connect to database and process jobs', async () => {
    mockQueue.processAll.mockResolvedValueOnce(2);

    const { processBatch, BATCH_SIZE } = await import('../../src/worker/index');
    await processBatch();

    const { connectDatabase, closeDatabase } = await import('../../src/db/client');
    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(mockQueue.processAll).toHaveBeenCalledWith(BATCH_SIZE);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
  });

  it('should log when jobs are processed', async () => {
    mockQueue.processAll.mockResolvedValueOnce(3);

    const { processBatch } = await import('../../src/worker/index');
    await processBatch();

    const { logger } = await import('../../src/utils/logger');
    expect(logger.info).toHaveBeenCalledWith({ processed: 3 }, 'Worker processed queue jobs');
  });

  it('should not log when no jobs are processed', async () => {
    mockQueue.processAll.mockResolvedValueOnce(0);

    const { processBatch } = await import('../../src/worker/index');
    await processBatch();

    const { logger } = await import('../../src/utils/logger');
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const { connectDatabase } = await import('../../src/db/client');
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error('connection failed'));

    const { processBatch } = await import('../../src/worker/index');
    await expect(processBatch()).rejects.toThrow('connection failed');
  });
});
