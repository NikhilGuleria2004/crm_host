import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createImportsRoutes } from '../src/modules/imports/imports.routes';

vi.mock('../src/storage/mongo-file-storage', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

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

const mockImportJobs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    importJobs: () => mockImportJobs,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const importId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'imports.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/imports', createImportsRoutes());
  return app;
}

describe('P26 Imports Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'imports.*', scope: 'ORGANIZATION' }]),
    } as any);

    const mockJob = {
      _id: new ObjectId(importId),
      organizationId: new ObjectId(orgAId),
      entity: 'contacts',
      fileKey: 'imports/test.csv',
      status: 'pending',
      totalRows: 100,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      failedCount: 0,
      createdBy: new ObjectId(userId),
      createdAt: new Date('2026-01-01'),
    };

    mockImportJobs.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === importId) {
        return Promise.resolve({ ...mockJob, _id: new ObjectId(importId), organizationId: new ObjectId(orgAId) });
      }
      if (query.fileKey) {
        return Promise.resolve(null);
      }
      return Promise.resolve(null);
    });

    mockImportJobs.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockJob, _id: new ObjectId(importId) }]),
        }),
      }),
    } as any);

    mockImportJobs.insertOne.mockResolvedValue({ insertedId: new ObjectId(importId) });
    mockImportJobs.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === importId && update.$set?.status) {
        mockJob.status = update.$set.status;
        mockJob.processedRows = update.$set.processedRows;
        mockJob.createdCount = update.$set.createdCount;
        mockJob.updatedCount = update.$set.updatedCount;
        mockJob.failedCount = update.$set.failedCount;
        mockJob.completedAt = update.$set.completedAt;
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
  });

  describe('GET /api/v1/imports', () => {
    it('should list import jobs', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/imports');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].entity).toBe('contacts');
    });

    it('should require authentication', async () => {
      const app = new Hono();
      app.route('/api/v1/imports', createImportsRoutes());
      const response = await app.request('/api/v1/imports');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/imports/:id', () => {
    it('should get an import job by id', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/imports/${importId}`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.entity).toBe('contacts');
    });

    it('should return 404 for non-existent job', async () => {
      mockImportJobs.findOne.mockResolvedValueOnce(null);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/imports/000000000000000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/imports', () => {
    it('should create import job from file upload', async () => {
      const app = createAppWithAuth();
      const formData = new FormData();
      formData.append('entity', 'contacts');
      const csvContent = 'First Name,Last Name,Email\nJohn,Doe,john@example.com';
      formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'contacts.csv');

      const response = await app.request('/api/v1/imports', {
        method: 'POST',
        body: formData,
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.entity).toBe('contacts');
    });
  });

  describe('POST /api/v1/imports/:id/preview', () => {
    it('should preview import data', async () => {
      const mockFileStorage = await import('../src/storage/mongo-file-storage');
      mockFileStorage.fileStorage.get.mockResolvedValue({
        content: Buffer.from('First Name,Last Name,Email\nJohn,Doe,john@example.com'),
        contentType: 'text/csv',
      });

      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/imports/${importId}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping: { firstName: 'First Name', email: 'Email' } }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.headers).toBeDefined();
      expect(data.data.rows).toBeDefined();
    });
  });

  describe('POST /api/v1/imports/:id/start', () => {
    it('should start import processing', async () => {
      const mockFileStorage = await import('../src/storage/mongo-file-storage');
      mockFileStorage.fileStorage.get.mockResolvedValue({
        content: Buffer.from('First Name,Last Name,Email\nJohn,Doe,john@example.com'),
        contentType: 'text/csv',
      });

      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/imports/${importId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mapping: { firstName: 'First Name', email: 'Email' } }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe('processing');
    });
  });
});
