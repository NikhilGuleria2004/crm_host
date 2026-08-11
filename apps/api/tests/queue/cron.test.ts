import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../src/queue/cron';

vi.mock('../../src/db/client', () => ({
  connectDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/queue/queue', () => ({
  queue: {
    register: vi.fn(),
    processAll: vi.fn().mockResolvedValue(3),
  },
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('P10 Queue Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to database and process queue jobs', async () => {
    const response = await handler();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ processed: 3 });
  });

  it('should return 500 on failure', async () => {
    const { connectDatabase } = await import('../../src/db/client');
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error('DB error'));

    const response = await handler();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
