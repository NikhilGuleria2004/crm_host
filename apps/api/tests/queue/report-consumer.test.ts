import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';

const mockReportJobs = {
  findOne: vi.fn(),
  updateOne: vi.fn(),
};

(globalThis as any).__mockReportJobs = mockReportJobs;

vi.mock('../../src/db/collections', () => ({
  collections: {
    reportJobs: () => (globalThis as any).__mockReportJobs,
  },
}));

vi.mock('../../src/storage/factory', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('../../src/modules/reports/reports.repository', () => ({
  ReportsRepository: class MockReportsRepository {
    getSalesReport = vi.fn().mockResolvedValue({
      revenue: 5000000,
      wonDeals: 10,
      lostDeals: 5,
      averageDealSize: 500000,
      winRate: 66.7,
    });
    getPipelineReport = vi.fn().mockResolvedValue([]);
    getLeadsReport = vi.fn().mockResolvedValue([]);
    getActivityReport = vi.fn().mockResolvedValue([]);
  }
}));

vi.mock('../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { reportConsumer } from '../../src/queue/consumers';
import { fileStorage } from '../../src/storage/factory';

describe('P17 Report Consumer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReportJobs.findOne.mockResolvedValue(null);
    mockReportJobs.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('should process a sales report job and store CSV', async () => {
    const jobId = new ObjectId().toHexString();
    const orgId = new ObjectId().toHexString();

    mockReportJobs.findOne.mockResolvedValueOnce({
      _id: new ObjectId(jobId),
      organizationId: new ObjectId(orgId),
      type: 'sales',
      status: 'pending',
      params: {},
      createdBy: new ObjectId(),
      createdAt: new Date(),
    });

    const result = await reportConsumer.process(
      {
        jobId,
        organizationId: orgId,
        reportType: 'sales',
        params: {},
      },
      1
    );

    expect(result.success).toBe(true);
    expect(mockReportJobs.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: {
          status: 'completed',
          fileKey: `reports/${jobId}.csv`,
          completedAt: expect.any(Date),
        },
      }
    );
    expect(fileStorage.put).toHaveBeenCalledWith(
      expect.stringContaining('reports/'),
      expect.any(Object),
      'text/csv'
    );
  });

  it('should fail when job is not found', async () => {
    mockReportJobs.findOne.mockResolvedValue(null);

    const result = await reportConsumer.process(
      {
        jobId: 'nonexistent',
        organizationId: new ObjectId().toHexString(),
        reportType: 'sales',
        params: {},
      },
      1
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Report job not found');
  });

  it('should fail for unsupported report type', async () => {
    const jobId = new ObjectId().toHexString();
    mockReportJobs.findOne.mockResolvedValueOnce({
      _id: new ObjectId(jobId),
      organizationId: new ObjectId().toHexString(),
      type: 'unknown',
      status: 'pending',
      params: {},
      createdBy: new ObjectId(),
      createdAt: new Date(),
    });

    const result = await reportConsumer.process(
      {
        jobId,
        organizationId: new ObjectId().toHexString(),
        reportType: 'unknown',
        params: {},
      },
      1
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Unsupported report type');
  });
});
