import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createExportsRoutes } from '../src/modules/exports/exports.routes';
import { createImportsRoutes } from '../src/modules/imports/imports.routes';
import { ExportService } from '../src/modules/exports/exports.service';
import { ExportRepository } from '../src/modules/exports/exports.repository';
import { ImportService } from '../src/modules/imports/imports.service';
import { ImportRepository } from '../src/modules/imports/imports.repository';

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

const mockExportJobs = createMockCollection();
const mockImportJobs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    exportJobs: () => mockExportJobs,
    importJobs: () => mockImportJobs,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

vi.mock('../src/storage/factory', () => ({
  fileStorage: {
    put: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const exportId = new ObjectId().toHexString();
const importId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

describe('P23 Export/Import Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'exports.*', scope: 'ORGANIZATION' }]),
    } as any);
  });
  describe('Exports', () => {
    describe('authentication', () => {
      it('should return 401 for unauthenticated list', async () => {
        const app = new Hono();
        app.route('/api/v1/exports', createExportsRoutes());
        const res = await app.request('/api/v1/exports');
        expect(res.status).toBe(401);
      });

      it('should return 401 for unauthenticated getById', async () => {
        const app = new Hono();
        app.route('/api/v1/exports', createExportsRoutes());
        const res = await app.request(`/api/v1/exports/${exportId}`);
        expect(res.status).toBe(401);
      });

      it('should return 401 for unauthenticated download', async () => {
        const app = new Hono();
        app.route('/api/v1/exports', createExportsRoutes());
        const res = await app.request(`/api/v1/exports/${exportId}/download`);
        expect(res.status).toBe(401);
      });

      it('should return 401 for unauthenticated create', async () => {
        const app = new Hono();
        app.route('/api/v1/exports', createExportsRoutes());
        const res = await app.request('/api/v1/exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'contacts', fields: ['firstName'] }),
        });
        expect(res.status).toBe(401);
      });
    });

    describe('authorization', () => {
      it('should return 403 for list without exports.read permission', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'contacts.read', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/exports', createExportsRoutes());

        const res = await app.request('/api/v1/exports');
        expect(res.status).toBe(403);
      });

      it('should return 403 for download without exports.read permission', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'contacts.read', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/exports', createExportsRoutes());

        const res = await app.request(`/api/v1/exports/${exportId}/download`);
        expect(res.status).toBe(403);
      });

      it('should return 403 for create without entity export permission', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'contacts.read', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/exports', createExportsRoutes());

        const res = await app.request('/api/v1/exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entity: 'contacts', fields: ['firstName'] }),
        });
        expect(res.status).toBe(403);
      });
    });

    describe('cross-tenant isolation', () => {
      it('should return 404 for cross-tenant download', async () => {
        mockExportJobs.findOne.mockResolvedValue(null);

        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgBId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'exports.*', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/exports', createExportsRoutes());

        const res = await app.request(`/api/v1/exports/${exportId}/download`);
        expect(res.status).toBe(404);
      });

      it('should verify file ownership before download', async () => {
        const foreignJobId = new ObjectId().toHexString();
        mockExportJobs.findOne.mockImplementation((query: any) => {
          if (query._id?.toString() === exportId && query.organizationId?.toString() === orgAId) {
            return Promise.resolve({
              _id: new ObjectId(exportId),
              organizationId: new ObjectId(orgAId),
              entity: 'contacts',
              fileKey: `exports/${foreignJobId}.csv`,
              status: 'completed',
            });
          }
          if (query._id?.toString() === foreignJobId && query.organizationId?.toString() === orgAId) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        });

        const repository = new ExportRepository();
        const service = new ExportService(repository);

        const foreignFileKey = `exports/${foreignJobId}.csv`;
        const result = await service.getFile(foreignFileKey, orgAId);
        expect(result).toBeNull();
      });
    });
  });

  describe('Imports', () => {
    describe('file validation', () => {
      it('should reject non-CSV files', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'imports.*', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/imports', createImportsRoutes());

        const formData = new FormData();
        formData.append('entity', 'contacts');
        formData.append('file', new Blob(['test'], { type: 'application/json' }), 'data.json');

        const res = await app.request('/api/v1/imports', {
          method: 'POST',
          body: formData,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error.message).toContain('CSV');
      });

      it('should reject oversized files', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'imports.*', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/imports', createImportsRoutes());

        const largeContent = 'a'.repeat(11 * 1024 * 1024);
        const formData = new FormData();
        formData.append('entity', 'contacts');
        formData.append('file', new Blob([largeContent], { type: 'text/csv' }), 'large.csv');

        const res = await app.request('/api/v1/imports', {
          method: 'POST',
          body: formData,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error.message).toContain('exceeds');
      });

      it('should reject empty files', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'imports.*', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/imports', createImportsRoutes());

        const formData = new FormData();
        formData.append('entity', 'contacts');
        formData.append('file', new Blob([''], { type: 'text/csv' }), 'empty.csv');

        const res = await app.request('/api/v1/imports', {
          method: 'POST',
          body: formData,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error.message).toContain('empty');
      });

      it('should reject files with only headers and no data rows', async () => {
        const app = new Hono();
        app.use('*', async (c, next) => {
          c.set('organizationId', orgAId);
          c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
          c.set('permissions', [{ permission: 'imports.*', scope: 'ORGANIZATION' }]);
          await next();
        });
        app.route('/api/v1/imports', createImportsRoutes());

        const formData = new FormData();
        formData.append('entity', 'contacts');
        formData.append('file', new Blob(['Name,Email'], { type: 'text/csv' }), 'headers-only.csv');

        const res = await app.request('/api/v1/imports', {
          method: 'POST',
          body: formData,
        });

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error.message).toContain('data row');
      });
    });

    describe('authentication', () => {
      it('should return 401 for unauthenticated upload', async () => {
        const app = new Hono();
        app.route('/api/v1/imports', createImportsRoutes());

        const formData = new FormData();
        formData.append('entity', 'contacts');
        formData.append('file', new Blob(['Name,Email'], { type: 'text/csv' }), 'test.csv');

        const res = await app.request('/api/v1/imports', {
          method: 'POST',
          body: formData,
        });

        expect(res.status).toBe(401);
      });
    });
  });
});
