import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createNotesRoutes } from '../src/modules/notes/notes.routes';

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

const mockNotes = createMockCollection();
const mockUsers = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    notes: () => mockNotes,
    users: () => mockUsers,
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
const noteId = new ObjectId().toHexString();
const authorId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockNote = {
  _id: new ObjectId(noteId),
  organizationId: new ObjectId(orgAId),
  title: 'Customer requirements',
  body: 'Customer requires SSO and audit logs.',
  authorId: new ObjectId(authorId),
  contactId: new ObjectId(),
  companyId: undefined,
  leadId: undefined,
  dealId: undefined,
  createdBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'notes.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/notes', createNotesRoutes());
  return app;
}

describe('P16 Notes Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNote = {
      _id: new ObjectId(noteId),
      organizationId: new ObjectId(orgAId),
      title: 'Customer requirements',
      body: 'Customer requires SSO and audit logs.',
      authorId: new ObjectId(authorId),
      contactId: new ObjectId(),
      companyId: undefined,
      leadId: undefined,
      dealId: undefined,
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'notes.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockUsers.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(authorId), firstName: 'John', lastName: 'Doe' }]),
    } as any);
    mockNotes.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === noteId && !query.organizationId) {
        return Promise.resolve({ ...mockNote, _id: new ObjectId(noteId) });
      }
      if (query._id?.toString() === noteId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockNote, _id: new ObjectId(noteId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockNotes.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockNote, _id: new ObjectId(noteId) }]),
        }),
      }),
    } as any);
    mockNotes.insertOne.mockResolvedValue({ insertedId: new ObjectId(noteId) });
    mockNotes.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === noteId) {
        mockNote = { ...mockNote, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
  });

  describe('GET /api/v1/notes', () => {
    it('should list notes', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/notes');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/notes');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/notes', () => {
    it('should create a note', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Customer requirements', body: 'Customer requires SSO and audit logs.' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.title).toBe('Customer requirements');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/notes/:id', () => {
    it('should get a note by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${noteId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(noteId);
    });

    it('should return 404 when note not found', async () => {
      mockNotes.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/notes/${noteId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/notes/:id', () => {
    it('should update a note', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated requirements' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.title).toBe('Updated requirements');
    });

    it('should return 404 when note not found', async () => {
      mockNotes.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated requirements' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/notes/${noteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated requirements' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/notes/:id', () => {
    it('should soft delete a note', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${noteId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(noteId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when note not found', async () => {
      mockNotes.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/notes/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/notes/${noteId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/notes/bulk/delete', () => {
    it('should bulk delete notes', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/notes/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [noteId] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(1);
    });

    it('should track failures for missing notes', async () => {
      mockNotes.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/notes/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['nonexistent'] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.failed).toBe(1);
    });
  });
});
