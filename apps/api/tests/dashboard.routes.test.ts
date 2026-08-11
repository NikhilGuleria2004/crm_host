import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { authenticate } from '../src/middleware/auth';
import { organizationContext } from '../src/middleware/organization';
import { authorize } from '../src/middleware/authorization';
import { createDashboardRoutes } from '../src/modules/dashboard/dashboard.routes';

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

const mockSessions = createMockCollection();
const mockUsers = createMockCollection();
const mockMemberships = createMockCollection();
const mockDeals = createMockCollection();
const mockLeads = createMockCollection();
const mockTasks = createMockCollection();
const mockPipelineStages = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    sessions: () => mockSessions,
    users: () => mockUsers,
    organizationMemberships: () => mockMemberships,
    deals: () => mockDeals,
    leads: () => mockLeads,
    tasks: () => mockTasks,
    pipelineStages: () => mockPipelineStages,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'dashboard.read', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/dashboard', createDashboardRoutes());
  return app;
}

describe('P30 Dashboard Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'dashboard.read', scope: 'ORGANIZATION' }]),
    } as any);
    mockSessions.findOne.mockResolvedValue({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
    });
    mockUsers.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: 'user@example.com',
      status: 'active',
      roleIds: [],
      teamIds: [],
    });
    mockMemberships.findOne.mockResolvedValue({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      roleId: new ObjectId(),
      teamIds: [],
      status: 'active',
    });
  });

  describe('GET /api/v1/dashboard/summary', () => {
    it('should return summary data', async () => {
      mockDeals.countDocuments.mockResolvedValue(10);
      mockDeals.aggregate.mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([{ total: 5000000 }]),
      } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([{ total: 1000000 }]),
        } as any)
        .mockReturnValueOnce({
          toArray: vi.fn().mockResolvedValue([]),
        } as any);
      mockLeads.countDocuments.mockReturnValueOnce(5).mockReturnValueOnce(3);
      mockTasks.countDocuments.mockResolvedValue(2);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/dashboard/summary');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.openDeals).toBe(10);
      expect(json.data.wonRevenue).toBe(5000000);
      expect(json.data.newLeads).toBe(5);
      expect(json.data.overdueTasks).toBe(2);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/dashboard/summary');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/dashboard/pipeline', () => {
    it('should return pipeline stages with deal stats', async () => {
      const stageId = new ObjectId().toHexString();

      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            { _id: new ObjectId(stageId), name: 'New', order: 0 },
          ]),
        }),
      } as any);

      mockDeals.aggregate.mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(stageId), dealCount: 8, totalValue: 1200000 },
        ]),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/dashboard/pipeline');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].stageName).toBe('New');
      expect(json.data[0].dealCount).toBe(8);
      expect(json.data[0].totalValue).toBe(1200000);
    });

    it('should return empty data when no stages exist', async () => {
      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/dashboard/pipeline');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });
  });
});
