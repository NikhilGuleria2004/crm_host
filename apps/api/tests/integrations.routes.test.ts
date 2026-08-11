import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createIntegrationsRoutes } from '../src/modules/integrations/integrations.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };
}

const mockIntegrations = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    integrations: () => mockIntegrations,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const integrationId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [], teamIds: [] });
    c.set('permissions', overrides.permissions || [
      { permission: 'integrations.read', scope: 'ORGANIZATION' },
      { permission: 'integrations.connect', scope: 'ORGANIZATION' },
      { permission: 'integrations.update', scope: 'ORGANIZATION' },
      { permission: 'integrations.disconnect', scope: 'ORGANIZATION' },
    ]);
    await next();
  });
  app.route('/api/v1/integrations', createIntegrationsRoutes());
  return app;
}

describe('P38 Integrations Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { permission: 'integrations.read', scope: 'ORGANIZATION' },
        { permission: 'integrations.connect', scope: 'ORGANIZATION' },
        { permission: 'integrations.update', scope: 'ORGANIZATION' },
        { permission: 'integrations.disconnect', scope: 'ORGANIZATION' },
      ]),
    } as any);
  });

  describe('GET /api/v1/integrations', () => {
    it('should return integrations list', async () => {
      mockIntegrations.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: new ObjectId(integrationId),
                organizationId: new ObjectId(orgAId),
                provider: 'google',
                status: 'connected',
                credentials: {},
                settings: {},
                createdBy: new ObjectId(userId),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/integrations');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].provider).toBe('google');
    });

    it('should return 403 without integrations.read permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request('/api/v1/integrations');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/integrations/connect', () => {
    it('should connect an integration', async () => {
      mockIntegrations.findOne.mockResolvedValueOnce(null);
      mockIntegrations.insertOne.mockResolvedValue({ insertedId: new ObjectId(integrationId) } as any);
      mockIntegrations.findOne.mockResolvedValueOnce({
        _id: new ObjectId(integrationId),
        organizationId: new ObjectId(orgAId),
        provider: 'google',
        status: 'connected',
        credentials: {},
        settings: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', credentials: { apiKey: 'key' } }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.provider).toBe('google');
      expect(json.data.status).toBe('connected');
    });

    it('should return 403 without integrations.connect permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request('/api/v1/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'google', credentials: { apiKey: 'key' } }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/integrations/:id', () => {
    it('should update an integration', async () => {
      mockIntegrations.findOne.mockResolvedValueOnce({
        _id: new ObjectId(integrationId),
        organizationId: new ObjectId(orgAId),
        provider: 'google',
        status: 'connected',
        credentials: {},
        settings: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockIntegrations.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      mockIntegrations.findOne.mockResolvedValueOnce({
        _id: new ObjectId(integrationId),
        organizationId: new ObjectId(orgAId),
        provider: 'google',
        status: 'disconnected',
        credentials: {},
        settings: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disconnected' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('disconnected');
    });

    it('should return 403 without integrations.update permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request(`/api/v1/integrations/${integrationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'disconnected' }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/integrations/:id', () => {
    it('should delete an integration', async () => {
      mockIntegrations.findOne.mockResolvedValueOnce({
        _id: new ObjectId(integrationId),
        organizationId: new ObjectId(orgAId),
        provider: 'google',
        status: 'connected',
        credentials: {},
        settings: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockIntegrations.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/integrations/${integrationId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('deleted');
    });

    it('should return 403 without integrations.disconnect permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request(`/api/v1/integrations/${integrationId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/integrations/:id/sync', () => {
    it('should sync an integration', async () => {
      mockIntegrations.findOne.mockResolvedValueOnce({
        _id: new ObjectId(integrationId),
        organizationId: new ObjectId(orgAId),
        provider: 'google',
        status: 'connected',
        credentials: {},
        settings: {},
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockIntegrations.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/integrations/${integrationId}/sync`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('synced');
    });
  });
});
