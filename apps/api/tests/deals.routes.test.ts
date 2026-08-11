import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createDealsRoutes } from '../src/modules/deals/deals.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  };
}

const mockDeals = createMockCollection();
const mockPipelines = createMockCollection();
const mockPipelineStages = createMockCollection();
const mockCompanies = createMockCollection();
const mockContacts = createMockCollection();
const mockUsers = createMockCollection();
const mockActivities = createMockCollection();
const mockTasks = createMockCollection();
const mockNotes = createMockCollection();
const mockAttachments = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    deals: () => mockDeals,
    pipelines: () => mockPipelines,
    pipelineStages: () => mockPipelineStages,
    companies: () => mockCompanies,
    contacts: () => mockContacts,
    users: () => mockUsers,
    activities: () => mockActivities,
    tasks: () => mockTasks,
    notes: () => mockNotes,
    attachments: () => mockAttachments,
    auditLogs: () => mockAuditLogs,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const dealId = new ObjectId().toHexString();
const pipelineId = new ObjectId().toHexString();
const stageId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const contactId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockDealData = {
  _id: new ObjectId(dealId),
  organizationId: new ObjectId(orgAId),
  name: 'Enterprise Contract',
  pipelineId: new ObjectId(pipelineId),
  stageId: new ObjectId(stageId),
  companyId: new ObjectId(companyId),
  contactId: new ObjectId(contactId),
  ownerId: new ObjectId(ownerId),
  amount: 2500000,
  currency: 'INR',
  probability: 40,
  expectedCloseDate: new Date('2026-10-31'),
  source: 'website',
  status: 'open',
  lostReason: undefined,
  customFields: {},
  createdBy: new ObjectId(userId),
  updatedBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'deals.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/deals', createDealsRoutes());
  return app;
}

describe('P19 Deals Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDealData = {
      _id: new ObjectId(dealId),
      organizationId: new ObjectId(orgAId),
      name: 'Enterprise Contract',
      pipelineId: new ObjectId(pipelineId),
      stageId: new ObjectId(stageId),
      companyId: new ObjectId(companyId),
      contactId: new ObjectId(contactId),
      ownerId: new ObjectId(ownerId),
      amount: 2500000,
      currency: 'INR',
      probability: 40,
      expectedCloseDate: new Date('2026-10-31'),
      source: 'website',
      status: 'open',
      lostReason: undefined,
      customFields: {},
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'deals.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockDeals.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === dealId && !query.organizationId) {
        return Promise.resolve({ ...mockDealData, _id: new ObjectId(dealId) });
      }
      if (query._id?.toString() === dealId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockDealData, _id: new ObjectId(dealId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockDeals.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockDealData, _id: new ObjectId(dealId) }]),
        }),
      }),
    } as any);
    mockDeals.insertOne.mockResolvedValue({ insertedId: new ObjectId(dealId) });
    mockDeals.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === dealId) {
        mockDealData = { ...mockDealData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockDeals.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockDeals.countDocuments.mockResolvedValue(0);
    mockPipelines.findOne.mockResolvedValue({ _id: new ObjectId(pipelineId), name: 'Sales Pipeline' });
    mockPipelineStages.findOne.mockResolvedValue({ _id: new ObjectId(stageId), name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
    mockCompanies.findOne.mockResolvedValue({ _id: new ObjectId(companyId), name: 'Acme Corp' });
    mockContacts.findOne.mockResolvedValue({ _id: new ObjectId(contactId), firstName: 'John', lastName: 'Doe' });
    mockUsers.findOne.mockResolvedValue({ _id: new ObjectId(ownerId), firstName: 'Jane', lastName: 'Smith' });
    mockActivities.countDocuments.mockResolvedValue(5);
    mockTasks.countDocuments.mockResolvedValue(3);
    mockNotes.countDocuments.mockResolvedValue(2);
    mockAttachments.countDocuments.mockResolvedValue(1);
  });

  describe('GET /api/v1/deals', () => {
    it('should list deals', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/deals');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/deals');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/deals', () => {
    it('should create a deal', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Enterprise Contract',
          pipelineId,
          stageId,
          companyId,
          contactId,
          ownerId,
          amount: 2500000,
          currency: 'INR',
          probability: 40,
        }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Enterprise Contract');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/deals/:id', () => {
    it('should get a deal by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(dealId);
    });

    it('should return 404 when deal not found', async () => {
      mockDeals.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/deals/${dealId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/deals/:id', () => {
    it('should update a deal', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Deal' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Updated Deal');
    });

    it('should return 404 when deal not found', async () => {
      mockDeals.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Deal' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/deals/${dealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Deal' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/deals/:id', () => {
    it('should soft delete a deal', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(dealId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when deal not found', async () => {
      mockDeals.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/deals/${dealId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/deals/:id/stage', () => {
    it('should change deal stage', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.stageId).toBe(stageId);
    });

    it('should return 404 when stage not found', async () => {
      mockPipelineStages.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}/stage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId: 'nonexistent' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/deals/:id/won', () => {
    it('should mark deal as won', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}/won`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('won');
    });

    it('should return 404 when deal not found', async () => {
      mockDeals.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${new ObjectId().toHexString()}/won`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/deals/:id/lost', () => {
    it('should mark deal as lost', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${dealId}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Budget unavailable' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('lost');
      expect(json.data.lostReason).toBe('Budget unavailable');
    });

    it('should return 404 when deal not found', async () => {
      mockDeals.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/deals/${new ObjectId().toHexString()}/lost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Budget unavailable' }),
      });
      expect(res.status).toBe(404);
    });
  });
});
