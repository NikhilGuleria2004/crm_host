import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createPipelinesRoutes } from '../src/modules/pipelines/pipelines.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  };
}

const mockPipelines = createMockCollection();
const mockPipelineStages = createMockCollection();
const mockUsers = createMockCollection();
const mockDeals = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    pipelines: () => mockPipelines,
    pipelineStages: () => mockPipelineStages,
    users: () => mockUsers,
    deals: () => mockDeals,
    auditLogs: () => mockAuditLogs,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const pipelineId = new ObjectId().toHexString();
const stageId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockPipelineData = {
  _id: new ObjectId(pipelineId),
  organizationId: new ObjectId(orgAId),
  name: 'Sales Pipeline',
  description: 'Default sales pipeline',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let mockStageData = {
  _id: new ObjectId(stageId),
  organizationId: new ObjectId(orgAId),
  pipelineId: new ObjectId(pipelineId),
  name: 'New',
  order: 0,
  probability: 10,
  isWon: false,
  isLost: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'pipelines.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/pipelines', createPipelinesRoutes());
  return app;
}

describe('P18 Pipelines Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPipelineData = {
      _id: new ObjectId(pipelineId),
      organizationId: new ObjectId(orgAId),
      name: 'Sales Pipeline',
      description: 'Default sales pipeline',
      isDefault: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStageData = {
      _id: new ObjectId(stageId),
      organizationId: new ObjectId(orgAId),
      pipelineId: new ObjectId(pipelineId),
      name: 'New',
      order: 0,
      probability: 10,
      isWon: false,
      isLost: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'pipelines.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockPipelines.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === pipelineId && !query.organizationId) {
        return Promise.resolve({ ...mockPipelineData, _id: new ObjectId(pipelineId) });
      }
      if (query._id?.toString() === pipelineId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockPipelineData, _id: new ObjectId(pipelineId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockPipelines.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockPipelineData, _id: new ObjectId(pipelineId) }]),
        }),
      }),
    } as any);
    mockPipelines.insertOne.mockResolvedValue({ insertedId: new ObjectId(pipelineId) });
    mockPipelines.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === pipelineId) {
        mockPipelineData = { ...mockPipelineData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockPipelines.updateMany.mockResolvedValue({ modifiedCount: 1 });
    mockPipelines.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockPipelineStages.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ ...mockStageData }]),
      }),
    } as any);
    mockPipelineStages.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === stageId) {
        return Promise.resolve({ ...mockStageData, _id: new ObjectId(stageId) });
      }
      return Promise.resolve(null);
    });
    mockPipelineStages.insertOne.mockImplementation((doc: any) => {
      mockStageData = { ...mockStageData, ...doc };
      return Promise.resolve({ insertedId: new ObjectId(stageId) });
    });
    mockPipelineStages.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === stageId) {
        mockStageData = { ...mockStageData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockPipelineStages.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockDeals.countDocuments.mockResolvedValue(0);
    mockDeals.updateMany.mockResolvedValue({ modifiedCount: 0 });
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
  });

  describe('GET /api/v1/pipelines', () => {
    it('should list pipelines', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/pipelines');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/pipelines');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/pipelines', () => {
    it('should create a pipeline', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sales Pipeline', isDefault: true }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Sales Pipeline');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/pipelines/:id', () => {
    it('should get a pipeline by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(pipelineId);
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/pipelines/:id', () => {
    it('should update a pipeline', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Pipeline' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('New Pipeline');
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Pipeline' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Pipeline' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/pipelines/:id', () => {
    it('should delete a pipeline', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(pipelineId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/pipelines/${pipelineId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/pipelines/:id/stages', () => {
    it('should create a stage', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Qualified', order: 1, probability: 40 }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Qualified');
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}/stages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Qualified', order: 1, probability: 40 }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/pipelines/:pipelineId/stages/:stageId', () => {
    it('should update a stage', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Qualified', probability: 40 }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Qualified');
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}/stages/${stageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Qualified' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/pipelines/:pipelineId/stages/:stageId', () => {
    it('should delete a stage without deals', async () => {
      mockDeals.countDocuments.mockResolvedValue(0);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(stageId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 409 when stage has deals and no replacement', async () => {
      mockDeals.countDocuments.mockResolvedValue(5);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(409);
    });

    it('should delete stage with replacement when deals exist', async () => {
      mockDeals.countDocuments.mockResolvedValue(5);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${pipelineId}/stages/${stageId}?replacementStageId=${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
    });

    it('should return 404 when pipeline not found', async () => {
      mockPipelines.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/pipelines/${new ObjectId().toHexString()}/stages/${stageId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });
});
