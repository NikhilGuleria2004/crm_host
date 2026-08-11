import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createExportsRoutes } from '../src/modules/exports/exports.routes';

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

const mockExportJobs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    exportJobs: () => mockExportJobs,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const exportId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'exports.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/exports', createExportsRoutes());
  return app;
}

describe('P27 Exports Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'exports.*', scope: 'ORGANIZATION' }]),
    } as any);

    const mockJob = {
      _id: new ObjectId(exportId),
      organizationId: new ObjectId(orgAId),
      entity: 'contacts',
      filters: {},
      fields: ['firstName', 'email'],
      status: 'completed',
      fileKey: 'exports/test.csv',
      totalRows: 5,
      createdBy: new ObjectId(userId),
      createdAt: new Date('2026-01-01'),
      completedAt: new Date('2026-01-01'),
    };

    mockExportJobs.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === exportId) {
        return Promise.resolve({ ...mockJob, _id: new ObjectId(exportId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });

    mockExportJobs.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockJob, _id: new ObjectId(exportId) }]),
        }),
      }),
    } as any);

    mockExportJobs.insertOne.mockReturnValue({
      insertedId: new ObjectId(exportId),
    } as any);

    mockExportJobs.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
  });

  describe('POST /exports', () => {
    it('should create export job', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'contacts',
          fields: ['firstName', 'email'],
          filters: {},
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.entity).toBe('contacts');
    });

    it('should reject request without entity export permission', async () => {
      const app = createAppWithAuth({
        permissions: [{ permission: 'contacts.read', scope: 'ORGANIZATION' }],
      });
      const response = await app.request('/api/v1/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'contacts',
          fields: ['firstName', 'email'],
          filters: {},
        }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error.code).toBe('FORBIDDEN');
    });

    it('should reject invalid entity', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/exports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'invalid',
          fields: ['firstName'],
          filters: {},
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /exports', () => {
    it('should list export jobs', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/exports');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].entity).toBe('contacts');
    });
  });

  describe('GET /exports/:id', () => {
    it('should return export job by id', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/exports/${exportId}`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(exportId);
      expect(data.data.status).toBe('completed');
    });

    it('should return 404 for non-existent job', async () => {
      mockExportJobs.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/exports/000000000000000000000000');

      expect(response.status).toBe(404);
    });
  });
});
