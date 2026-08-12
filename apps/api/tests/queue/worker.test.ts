import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processBatch, BATCH_SIZE, SLEEP_MS } from '../../src/worker/index';

vi.mock('../../src/db/client', () => ({
  connectDatabase: vi.fn().mockResolvedValue({}),
  closeDatabase: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/queue', () => ({
  queue: {
    register: vi.fn(),
    processAll: vi.fn().mockResolvedValue(0),
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
  });

  it('should connect to database and process jobs', async () => {
    const { queue } = await import('../../src/queue');
    vi.mocked(queue.processAll).mockResolvedValueOnce(2);

    await processBatch();

    const { connectDatabase, closeDatabase } = await import('../../src/db/client');
    expect(connectDatabase).toHaveBeenCalledTimes(1);
    expect(queue.processAll).toHaveBeenCalledWith(BATCH_SIZE);
    expect(closeDatabase).toHaveBeenCalledTimes(1);
  });

  it('should log when jobs are processed', async () => {
    const { queue } = await import('../../src/queue');
    vi.mocked(queue.processAll).mockResolvedValueOnce(3);

    await processBatch();

    const { logger } = await import('../../src/utils/logger');
    expect(logger.info).toHaveBeenCalledWith({ processed: 3 }, 'Worker processed queue jobs');
  });

  it('should not log when no jobs are processed', async () => {
    const { queue } = await import('../../src/queue');
    vi.mocked(queue.processAll).mockResolvedValueOnce(0);

    await processBatch();

    const { logger } = await import('../../src/utils/logger');
    expect(logger.info).not.toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    const { connectDatabase } = await import('../../src/db/client');
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error('connection failed'));

    await expect(processBatch()).rejects.toThrow('connection failed');
  });
});
