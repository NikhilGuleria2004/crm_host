import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createApiKeysRoutes } from '../src/modules/api-keys/api-keys.routes';

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

const mockApiKeys = createMockCollection();
const mockUsers = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    apiKeys: () => mockApiKeys,
    users: () => mockUsers,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const apiKeyId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'api_keys.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/api-keys', createApiKeysRoutes());
  return app;
}

describe('P36 API Keys Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'api_keys.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockUsers.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: 'user@example.com',
      status: 'active',
      roleIds: [],
      teamIds: [],
    });
  });

  describe('GET /api/v1/api-keys', () => {
    it('should return API keys list', async () => {
      mockApiKeys.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: new ObjectId(apiKeyId),
                organizationId: new ObjectId(orgAId),
                name: 'Production',
                keyHash: 'hash',
                scopes: ['contacts.read'],
                createdBy: new ObjectId(userId),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/api-keys');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].name).toBe('Production');
    });

    it('should return 403 without api_keys.read permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [], user: { id: userId, status: 'active', roleIds: [], teamIds: [] } });
      const res = await app.request('/api/v1/api-keys');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/api-keys', () => {
    it('should create an API key', async () => {
      mockApiKeys.insertOne.mockResolvedValue({ insertedId: new ObjectId(apiKeyId) } as any);
      mockApiKeys.findOne.mockResolvedValueOnce({
        _id: new ObjectId(apiKeyId),
        organizationId: new ObjectId(orgAId),
        name: 'Production',
        keyHash: 'hash',
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Production', scopes: ['contacts.read'] }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Production');
      expect(json.data.key).toBeDefined();
      expect(json.data.key).toContain('crm_live_');
    });

    it('should return 403 without api_keys.create permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [], user: { id: userId, status: 'active', roleIds: [], teamIds: [] } });
      const res = await app.request('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Production', scopes: ['contacts.read'] }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/api-keys/:id/revoke', () => {
    it('should revoke an API key', async () => {
      mockApiKeys.findOne.mockResolvedValueOnce({
        _id: new ObjectId(apiKeyId),
        organizationId: new ObjectId(orgAId),
        name: 'Production',
        keyHash: 'hash',
        scopes: ['contacts.read'],
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockApiKeys.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/api-keys/${apiKeyId}/revoke`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('revoked');
    });

    it('should return 403 without api_keys.revoke permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [], user: { id: userId, status: 'active', roleIds: [], teamIds: [] } });
      const res = await app.request(`/api/v1/api-keys/${apiKeyId}/revoke`, {
        method: 'POST',
      });
      expect(res.status).toBe(403);
    });
  });
});
