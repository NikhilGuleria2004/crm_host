import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { ReportsService } from '../src/modules/reports/reports.service';
import { ReportsRepository } from '../src/modules/reports/reports.repository';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };
}

const mockDeals = createMockCollection();
const mockLeads = createMockCollection();
const mockActivities = createMockCollection();
const mockUsers = createMockCollection();
const mockPipelineStages = createMockCollection();
const mockReportJobs = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    deals: () => mockDeals,
    leads: () => mockLeads,
    activities: () => mockActivities,
    users: () => mockUsers,
    pipelineStages: () => mockPipelineStages,
    reportJobs: () => mockReportJobs,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

vi.mock('../src/queue', () => ({
  queue: {
    enqueue: vi.fn().mockResolvedValue('queue-job-id'),
  },
}));

describe('ReportsService', () => {
  let service: ReportsService;
  let repository: ReportsRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new ReportsRepository();
    service = new ReportsService(repository);
  });

  describe('getSalesReport', () => {
    it('should return sales report with aggregations', async () => {
      const orgId = new ObjectId().toHexString();

      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'won', count: 10, total: 5000000 },
          { _id: 'lost', count: 5, total: 2000000 },
        ]),
      } as any);

      const result = await service.getSalesReport(orgId, {});

      expect(result.revenue).toBe(5000000);
      expect(result.wonDeals).toBe(10);
      expect(result.lostDeals).toBe(5);
      expect(result.averageDealSize).toBe(500000);
      expect(result.winRate).toBeCloseTo(66.7, 0);
    });

    it('should return zero values when no deals exist', async () => {
      const orgId = new ObjectId().toHexString();

      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);

      const result = await service.getSalesReport(orgId, {});

      expect(result.revenue).toBe(0);
      expect(result.wonDeals).toBe(0);
      expect(result.lostDeals).toBe(0);
      expect(result.averageDealSize).toBe(0);
      expect(result.winRate).toBe(0);
    });
  });

  describe('getPipelineReport', () => {
    it('should return pipeline stages with deal stats', async () => {
      const orgId = new ObjectId().toHexString();
      const stageId = new ObjectId().toHexString();

      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: new ObjectId(stageId), name: 'New', order: 0 },
          ]),
        }),
      } as any);

      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(stageId), dealCount: 8, dealValue: 1200000 },
        ]),
      } as any);

      const result = await service.getPipelineReport(orgId, {});

      expect(result).toHaveLength(1);
      expect(result[0].stageName).toBe('New');
      expect(result[0].dealCount).toBe(8);
      expect(result[0].dealValue).toBe(1200000);
    });

    it('should return empty array when no stages exist', async () => {
      const orgId = new ObjectId().toHexString();

      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.getPipelineReport(orgId, {});

      expect(result).toEqual([]);
    });
  });

  describe('getLeadsReport', () => {
    it('should return lead conversion by source', async () => {
      const orgId = new ObjectId().toHexString();

      mockLeads.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'website', total: 100, qualified: 60, converted: 30 },
          { _id: 'referral', total: 50, qualified: 40, converted: 25 },
        ]),
      } as any);

      const result = await service.getLeadsReport(orgId, {});

      expect(result).toHaveLength(2);
      expect(result[0].source).toBe('website');
      expect(result[0].leads).toBe(100);
      expect(result[0].qualified).toBe(60);
      expect(result[0].converted).toBe(30);
      expect(result[0].conversionRate).toBe(30);
      expect(result[1].source).toBe('referral');
      expect(result[1].conversionRate).toBe(50);
    });

    it('should default source to Unknown when null', async () => {
      const orgId = new ObjectId().toHexString();

      mockLeads.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: null, total: 10, qualified: 5, converted: 2 },
        ]),
      } as any);

      const result = await service.getLeadsReport(orgId, {});

      expect(result[0].source).toBe('Unknown');
      expect(result[0].conversionRate).toBe(20);
    });
  });

  describe('getActivityReport', () => {
    it('should return activity summary by user', async () => {
      const orgId = new ObjectId().toHexString();
      const userId = new ObjectId().toHexString();

      mockActivities.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(userId), calls: 5, emails: 10, meetings: 3, tasks: 2 },
        ]),
      } as any);

      mockUsers.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(userId), firstName: 'John', lastName: 'Doe' },
        ]),
      } as any);

      const result = await service.getActivityReport(orgId, {});

      expect(result).toHaveLength(1);
      expect(result[0].userName).toBe('John Doe');
      expect(result[0].calls).toBe(5);
      expect(result[0].emails).toBe(10);
      expect(result[0].meetings).toBe(3);
      expect(result[0].tasks).toBe(2);
    });
  });

  describe('createSalesExportJob', () => {
    it('should create a report job and enqueue processing', async () => {
      const orgId = new ObjectId().toHexString();
      const userId = new ObjectId().toHexString();
      const insertedId = new ObjectId().toHexString();

      mockReportJobs.insertOne.mockResolvedValue({ insertedId: new ObjectId(insertedId) } as any);
      mockReportJobs.findOne.mockResolvedValueOnce({
        _id: new ObjectId(insertedId),
        organizationId: new ObjectId(orgId),
        type: 'sales',
        status: 'pending',
        params: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
      });

      const result = await service.createSalesExportJob(orgId, userId, {});

      expect(result.type).toBe('sales');
      expect(result.status).toBe('pending');
      expect(result.id).toBe(insertedId);
      expect(mockReportJobs.insertOne).toHaveBeenCalledTimes(1);
      expect(mockReportJobs.findOne).toHaveBeenCalledTimes(1);
    });
  });

  describe('getExportJob', () => {
    it('should return job by id', async () => {
      const orgId = new ObjectId().toHexString();
      const jobId = new ObjectId().toHexString();

      mockReportJobs.findOne.mockResolvedValue({
        _id: new ObjectId(jobId),
        organizationId: new ObjectId(orgId),
        type: 'sales',
        status: 'completed',
        fileKey: 'reports/test.csv',
        params: {},
        createdBy: new ObjectId(),
        createdAt: new Date(),
        completedAt: new Date(),
      });

      const result = await service.getExportJob(jobId, orgId);

      expect(result).toBeDefined();
      expect(result?.status).toBe('completed');
      expect(result?.fileKey).toBe('reports/test.csv');
    });

    it('should return null when job does not exist', async () => {
      mockReportJobs.findOne.mockResolvedValue(null);
      const result = await service.getExportJob('nonexistent', new ObjectId().toHexString());
      expect(result).toBeNull();
    });

    it('should return null for invalid object id', async () => {
      const result = await service.getExportJob('invalid', new ObjectId().toHexString());
      expect(result).toBeNull();
    });
  });
});
