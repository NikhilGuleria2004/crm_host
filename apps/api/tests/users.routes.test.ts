import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { authenticate } from '../src/middleware/auth';
import { organizationContext } from '../src/middleware/organization';
import { authorize } from '../src/middleware/authorization';
import { createUsersRoutes } from '../src/modules/users/users.routes';

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

const mockSessions = createMockCollection();
const mockUsers = createMockCollection();
const mockMemberships = createMockCollection();
const mockRolePermissions = createMockCollection();
const mockAuditLogs = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    sessions: () => mockSessions,
    users: () => mockUsers,
    organizationMemberships: () => mockMemberships,
    rolePermissions: () => mockRolePermissions,
    auditLogs: () => mockAuditLogs,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'users.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/users', createUsersRoutes());
  return app;
}

describe('P32 Users Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'users.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockSessions.findOne.mockResolvedValue({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
    });
    mockUsers.findOne.mockResolvedValue({
      _id: new ObjectId(userId),
      email: 'user@example.com',
      status: 'active',
      roleIds: [],
      teamIds: [],
    });
    mockMemberships.findOne.mockResolvedValue({
      _id: new ObjectId(),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      roleId: new ObjectId(),
      teamIds: [],
      status: 'active',
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return users list', async () => {
      mockUsers.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: new ObjectId(userId), email: 'user@example.com', firstName: 'Test', lastName: 'User', status: 'active', roleIds: [], teamIds: [], preferences: {}, createdAt: new Date(), updatedAt: new Date() },
        ]),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/users');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].email).toBe('user@example.com');
    });
  });

  describe('POST /api/v1/users/invite', () => {
    it('should invite a new user', async () => {
      mockUsers.findOne.mockResolvedValue(null);
      mockUsers.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
      mockUsers.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({
        _id: new ObjectId(),
        email: 'new@example.com',
        emailNormalized: 'new@example.com',
        passwordHash: 'hash',
        firstName: 'New',
        lastName: 'User',
        status: 'invited',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', firstName: 'New', lastName: 'User', roleIds: [] }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.status).toBe('invited');
    });
  });

  describe('POST /api/v1/users/:id/deactivate', () => {
    it('should deactivate user and revoke sessions', async () => {
      const targetUserId = new ObjectId().toHexString();
      const orgId = new ObjectId().toHexString();

      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(targetUserId),
        organizationId: new ObjectId(orgId),
        email: 'deactivate@example.com',
        emailNormalized: 'deactivate@example.com',
        passwordHash: 'hash',
        firstName: 'Deactivate',
        lastName: 'Me',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockUsers.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      mockSessions.updateMany.mockResolvedValue({ modifiedCount: 1 } as any);
      mockAuditLogs.insertOne.mockResolvedValue({ insertedId: new ObjectId() } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/users/${targetUserId}/deactivate`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('deactivated');
      expect(mockSessions.updateMany).toHaveBeenCalledWith(
        { userId: new ObjectId(targetUserId), revokedAt: { $exists: false } },
        { $set: { revokedAt: expect.any(Date) } }
      );
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should update user', async () => {
      const targetUserId = new ObjectId().toHexString();

      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(targetUserId),
        email: 'user@example.com',
        emailNormalized: 'user@example.com',
        passwordHash: 'hash',
        firstName: 'Test',
        lastName: 'User',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      mockUsers.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      mockUsers.findOne.mockResolvedValueOnce({
        _id: new ObjectId(targetUserId),
        email: 'user@example.com',
        emailNormalized: 'user@example.com',
        passwordHash: 'hash',
        firstName: 'Updated',
        lastName: 'User',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Updated' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.firstName).toBe('Updated');
    });

    it('should return 404 for cross-tenant access', async () => {
      const targetUserId = new ObjectId().toHexString();
      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(targetUserId),
        email: 'other@example.com',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);
      mockUsers.updateOne.mockResolvedValue({ modifiedCount: 0 } as any);

      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Hacked' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 403 when suspended user attempts to update', async () => {
      const targetUserId = new ObjectId().toHexString();
      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(targetUserId),
        email: 'user@example.com',
        status: 'active',
        roleIds: [],
        teamIds: [],
        preferences: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const app = createAppWithAuth({ user: { id: userId, status: 'suspended', roleIds: [roleId], teamIds: [] } });
      const res = await app.request(`/api/v1/users/${targetUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Hacked' }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/users/invite', () => {
    it('should return 403 when suspended user attempts to invite', async () => {
      const app = createAppWithAuth({ user: { id: userId, status: 'suspended', roleIds: [roleId], teamIds: [] } });
      const res = await app.request('/api/v1/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'new@example.com', firstName: 'New', lastName: 'User', roleIds: [] }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/users/:id/deactivate', () => {
    it('should return 403 when suspended user attempts to deactivate', async () => {
      const targetUserId = new ObjectId().toHexString();
      const app = createAppWithAuth({ user: { id: userId, status: 'suspended', roleIds: [roleId], teamIds: [] } });
      const res = await app.request(`/api/v1/users/${targetUserId}/deactivate`, {
        method: 'POST',
      });
      expect(res.status).toBe(403);
    });
  });
});
