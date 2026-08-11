import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { DashboardRepository } from '../src/modules/dashboard/dashboard.repository';

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
const mockTasks = createMockCollection();
const mockPipelineStages = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    deals: () => mockDeals,
    leads: () => mockLeads,
    tasks: () => mockTasks,
    pipelineStages: () => mockPipelineStages,
  },
}));

describe('DashboardService', () => {
  let service: DashboardService;
  let repository: DashboardRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new DashboardRepository();
    service = new DashboardService(repository);
  });

  describe('getSummary', () => {
    it('should return dashboard summary with aggregations', async () => {
      const orgId = new ObjectId().toHexString();

      mockDeals.countDocuments.mockResolvedValue(42);
      mockDeals.aggregate
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([{ total: 5000000 }]),
        } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([{ total: 1000000 }]),
        } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([]),
        } as any);
      mockLeads.countDocuments.mockImplementation((query: any) => {
        if (query.status === 'new') return Promise.resolve(128);
        if (query.status === 'qualified') return Promise.resolve(54);
        return Promise.resolve(0);
      });
      mockTasks.countDocuments.mockResolvedValue(17);

      const result = await service.getSummary(orgId);

      expect(result.openDeals).toBe(42);
      expect(result.wonRevenue).toBe(5000000);
      expect(result.lostRevenue).toBe(1000000);
      expect(result.newLeads).toBe(128);
      expect(result.qualifiedLeads).toBe(54);
      expect(result.overdueTasks).toBe(17);
      expect(result.winRate).toBeGreaterThan(0);
    });

    it('should handle zero won and lost deals', async () => {
      const orgId = new ObjectId().toHexString();

      mockDeals.countDocuments.mockResolvedValue(0);
      mockDeals.aggregate
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([]),
        } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([]),
        } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([]),
        } as any);
      mockLeads.countDocuments.mockImplementation((query: any) => {
        if (query.status === 'new') return Promise.resolve(0);
        if (query.status === 'qualified') return Promise.resolve(0);
        return Promise.resolve(0);
      });
      mockTasks.countDocuments.mockResolvedValue(0);

      const result = await service.getSummary(orgId);

      expect(result.openDeals).toBe(0);
      expect(result.wonRevenue).toBe(0);
      expect(result.lostRevenue).toBe(0);
      expect(result.winRate).toBe(0);
      expect(result.pipelineValue).toBe(0);
    });
  });

  describe('getPipeline', () => {
    it('should return pipeline stages with deal counts and values', async () => {
      const orgId = new ObjectId().toHexString();
      const stageId1 = new ObjectId().toHexString();
      const stageId2 = new ObjectId().toHexString();

      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: new ObjectId(stageId1), name: 'New', order: 0 },
            { _id: new ObjectId(stageId2), name: 'Qualified', order: 1 },
          ]),
        }),
      } as any);

      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(stageId1), dealCount: 5, totalValue: 500000 },
          { _id: new ObjectId(stageId2), dealCount: 3, totalValue: 750000 },
        ]),
      } as any);

      const result = await service.getPipeline(orgId);

      expect(result).toHaveLength(2);
      expect(result[0].stageName).toBe('New');
      expect(result[0].dealCount).toBe(5);
      expect(result[0].totalValue).toBe(500000);
      expect(result[1].stageName).toBe('Qualified');
      expect(result[1].dealCount).toBe(3);
      expect(result[1].totalValue).toBe(750000);
    });

    it('should return empty array when no pipeline stages exist', async () => {
      const orgId = new ObjectId().toHexString();

      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const result = await service.getPipeline(orgId);

      expect(result).toEqual([]);
    });
  });
});
