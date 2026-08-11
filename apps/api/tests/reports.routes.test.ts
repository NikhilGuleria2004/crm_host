import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { authenticate } from '../src/middleware/auth';
import { organizationContext } from '../src/middleware/organization';
import { authorize } from '../src/middleware/authorization';
import { createReportsRoutes } from '../src/modules/reports/reports.routes';

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
const mockActivities = createMockCollection();
const mockPipelineStages = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    sessions: () => mockSessions,
    users: () => mockUsers,
    organizationMemberships: () => mockMemberships,
    deals: () => mockDeals,
    leads: () => mockLeads,
    activities: () => mockActivities,
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
    c.set('permissions', overrides.permissions || [{ permission: 'reports.read', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/reports', createReportsRoutes());
  return app;
}

describe('P31 Reports Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'reports.read', scope: 'ORGANIZATION' }]),
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

  describe('GET /api/v1/reports/sales', () => {
    it('should return sales report data', async () => {
      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'won', count: 10, total: 5000000 },
          { _id: 'lost', count: 5, total: 2000000 },
        ]),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/reports/sales');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.revenue).toBe(5000000);
      expect(json.data.wonDeals).toBe(10);
      expect(json.data.winRate).toBeCloseTo(66.7, 0);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/reports/sales');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/reports/pipeline', () => {
    it('should return pipeline report data', async () => {
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

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/reports/pipeline');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].stageName).toBe('New');
      expect(json.data[0].dealCount).toBe(8);
    });

    it('should return empty data when no stages exist', async () => {
      mockPipelineStages.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/reports/pipeline');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toEqual([]);
    });
  });

  describe('GET /api/v1/reports/leads', () => {
    it('should return lead conversion report data', async () => {
      mockLeads.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'website', total: 100, qualified: 60, converted: 30 },
        ]),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/reports/leads');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].source).toBe('website');
      expect(json.data[0].conversionRate).toBe(30);
    });
  });

  describe('GET /api/v1/reports/activity', () => {
    it('should return activity report data', async () => {
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

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/reports/activity');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].userName).toBe('John Doe');
      expect(json.data[0].calls).toBe(5);
    });
  });

  describe('GET /api/v1/reports/sales/export', () => {
    it('should return CSV export', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { permission: 'reports.read', scope: 'ORGANIZATION' },
          { permission: 'reports.export', scope: 'ORGANIZATION' },
        ]),
      } as any);

      mockDeals.aggregate.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: 'won', count: 10, total: 5000000 },
          { _id: 'lost', count: 5, total: 2000000 },
        ]),
      } as any);

      const app = createAppWithAuth({
        permissions: [
          { permission: 'reports.read', scope: 'ORGANIZATION' },
          { permission: 'reports.export', scope: 'ORGANIZATION' },
        ],
      });
      const res = await app.request('/api/v1/reports/sales/export');
      expect(res.status).toBe(200);
      expect(res.headers.get('Content-Type')).toBe('text/csv');
      const text = await res.text();
      expect(text).toContain('Revenue');
      expect(text).toContain('5000000');
    });
  });
});
