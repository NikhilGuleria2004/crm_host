import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createTagsRoutes } from '../src/modules/tags/tags.routes';

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

const mockTags = createMockCollection();
const mockContacts = createMockCollection();
const mockCompanies = createMockCollection();
const mockLeads = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    tags: () => mockTags,
    contacts: () => mockContacts,
    companies: () => mockCompanies,
    leads: () => mockLeads,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const tagId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'tags.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/tags', createTagsRoutes());
  return app;
}

describe('P29 Tags Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'tags.*', scope: 'ORGANIZATION' }]),
    } as any);

    const mockTag = {
      _id: new ObjectId(tagId),
      organizationId: new ObjectId(orgAId),
      name: 'Enterprise',
      normalizedName: 'enterprise',
      createdAt: new Date('2026-01-01'),
    };

    mockTags.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === tagId) {
        return Promise.resolve({ ...mockTag, _id: new ObjectId(tagId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });

    mockTags.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockTag, _id: new ObjectId(tagId) }]),
        }),
      }),
    } as any);

    mockTags.insertOne.mockReturnValue({
      insertedId: new ObjectId(tagId),
    } as any);

    mockTags.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === tagId && update.$set) {
        Object.assign(mockTag, update.$set);
      }
      return Promise.resolve({ modifiedCount: 1 } as any);
    });
    mockTags.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

    mockContacts.updateMany.mockResolvedValue({ modifiedCount: 0 } as any);
    mockCompanies.updateMany.mockResolvedValue({ modifiedCount: 0 } as any);
    mockLeads.updateMany.mockResolvedValue({ modifiedCount: 0 } as any);
  });

  describe('POST /tags', () => {
    it('should create tag', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Enterprise',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.name).toBe('Enterprise');
      expect(data.data.normalizedName).toBe('enterprise');
    });

    it('should normalize tag name to lowercase', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '  Enterprise  ',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.normalizedName).toBe('enterprise');
    });
  });

  describe('GET /tags', () => {
    it('should list tags', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tags');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].name).toBe('Enterprise');
    });
  });

  describe('GET /tags/:id', () => {
    it('should return tag by id', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tags/${tagId}`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(tagId);
      expect(data.data.name).toBe('Enterprise');
    });

    it('should return 404 for non-existent tag', async () => {
      mockTags.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tags/000000000000000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /tags/:id', () => {
    it('should update tag', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tags/${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Updated Tag',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.name).toBe('Updated Tag');
    });
  });

  describe('DELETE /tags/:id', () => {
    it('should delete tag and remove from records', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tags/${tagId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(tagId);
      expect(data.data.status).toBe('deleted');
      expect(mockContacts.updateMany).toHaveBeenCalledWith(
        { organizationId: new ObjectId(orgAId), tags: new ObjectId(tagId) },
        { $pull: { tags: new ObjectId(tagId) } }
      );
      expect(mockCompanies.updateMany).toHaveBeenCalledWith(
        { organizationId: new ObjectId(orgAId), tags: new ObjectId(tagId) },
        { $pull: { tags: new ObjectId(tagId) } }
      );
      expect(mockLeads.updateMany).toHaveBeenCalledWith(
        { organizationId: new ObjectId(orgAId), tags: new ObjectId(tagId) },
        { $pull: { tags: new ObjectId(tagId) } }
      );
    });
  });
});
