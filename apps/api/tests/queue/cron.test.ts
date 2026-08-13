import { describe, it, expect, vi, beforeEach } from 'vitest';
import handler from '../../src/queue/cron';

vi.mock('../../src/db/client', () => ({
  connectDatabase: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../src/db/collections', () => ({
  collections: {
    queueJobs: () => ({
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
    }),
    organizationMemberships: () => ({
      updateMany: vi.fn().mockResolvedValue({ modifiedCount: 2 }),
    }),
    organizations: () => ({
      find: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ _id: { toString: () => 'org1' } }]),
        }),
      }),
    }),
    contacts: () => ({
      countDocuments: vi.fn().mockResolvedValue(1),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    }),
    companies: () => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    }),
    leads: () => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    }),
    deals: () => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    }),
    notes: () => ({
      countDocuments: vi.fn().mockResolvedValue(0),
      deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    }),
  },
}));

vi.mock('../../src/queue/factory', () => ({
  createQueue: () => ({
    registerConsumer: vi.fn(),
    processAll: vi.fn().mockResolvedValue(3),
  }),
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('P27 Queue Cron', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should connect to database, run cleanup, process queue jobs, and return summary', async () => {
    const response = await handler();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({
      processed: 3,
      cleanup: {
        failedJobs: 3,
        expiredInvitations: 2,
        purgedOrgs: 1,
      },
    });
  });

  it('should return 500 on failure', async () => {
    const { connectDatabase } = await import('../../src/db/client');
    vi.mocked(connectDatabase).mockRejectedValueOnce(new Error('DB error'));

    const response = await handler();

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Internal server error' });
  });
});
