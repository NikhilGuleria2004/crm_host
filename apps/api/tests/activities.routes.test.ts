import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createActivitiesRoutes } from '../src/modules/activities/activities.routes';

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

const mockActivities = createMockCollection();
const mockUsers = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    activities: () => mockActivities,
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
const activityId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockActivityDataData = {
  _id: new ObjectId(activityId),
  organizationId: new ObjectId(orgAId),
  type: 'call',
  subject: 'Discovery call',
  description: 'Discussed requirements.',
  occurredAt: new Date('2026-08-07T10:00:00.000Z'),
  durationMinutes: 30,
  ownerId: new ObjectId(ownerId),
  contactId: new ObjectId(),
  companyId: undefined,
  leadId: undefined,
  dealId: undefined,
  metadata: {},
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
    c.set('permissions', overrides.permissions || [{ permission: 'activities.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/activities', createActivitiesRoutes());
  return app;
}

describe('P15 Activities Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockActivityDataData = {
      _id: new ObjectId(activityId),
      organizationId: new ObjectId(orgAId),
      type: 'call',
      subject: 'Discovery call',
      description: 'Discussed requirements.',
      occurredAt: new Date('2026-08-07T10:00:00.000Z'),
      durationMinutes: 30,
      ownerId: new ObjectId(ownerId),
      contactId: new ObjectId(),
      companyId: undefined,
      leadId: undefined,
      dealId: undefined,
      metadata: {},
      createdBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'activities.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockActivities.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === activityId && !query.organizationId) {
        return Promise.resolve({ ...mockActivityDataData, _id: new ObjectId(activityId) });
      }
      if (query._id?.toString() === activityId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockActivityDataData, _id: new ObjectId(activityId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockActivities.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockActivityDataData, _id: new ObjectId(activityId) }]),
        }),
      }),
    } as any);
    mockActivities.insertOne.mockResolvedValue({ insertedId: new ObjectId(activityId) });
    mockActivities.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === activityId) {
        mockActivityDataData = { ...mockActivityDataData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
  });

  describe('GET /api/v1/activities', () => {
    it('should list activities', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/activities');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/activities');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/activities', () => {
    it('should create an activity', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'call', subject: 'Discovery call', occurredAt: '2026-08-07T10:00:00.000Z' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.subject).toBe('Discovery call');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });
  });

  describe('GET /api/v1/activities/:id', () => {
    it('should get an activity by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${activityId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(activityId);
    });

    it('should return 404 when activity not found', async () => {
      mockActivities.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/activities/${activityId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/activities/:id', () => {
    it('should update an activity', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Updated call' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.subject).toBe('Updated call');
    });

    it('should return 404 when activity not found', async () => {
      mockActivities.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Updated call' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/activities/${activityId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: 'Updated call' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/activities/:id', () => {
    it('should soft delete an activity', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${activityId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(activityId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when activity not found', async () => {
      mockActivities.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/activities/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/activities/${activityId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/activities/bulk/delete', () => {
    it('should bulk delete activities', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/activities/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [activityId] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(1);
    });

    it('should track failures for missing activities', async () => {
      mockActivities.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/activities/bulk/delete', {
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
