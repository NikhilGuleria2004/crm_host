import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createSessionsRoutes } from '../src/modules/sessions/sessions.routes';

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
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    sessions: () => mockSessions,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const sessionId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [new ObjectId().toHexString()], teamIds: [], sessionId });
    c.set('permissions', overrides.permissions || [{ permission: 'sessions.read', scope: 'ORGANIZATION' }, { permission: 'sessions.revoke', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/sessions', createSessionsRoutes());
  return app;
}

describe('P34 Sessions Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'sessions.read', scope: 'ORGANIZATION' }, { permission: 'sessions.revoke', scope: 'ORGANIZATION' }]),
    } as any);
    mockSessions.findOne.mockResolvedValue({
      _id: new ObjectId(sessionId),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });
    mockSessions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(sessionId),
          userId: new ObjectId(userId),
          organizationId: new ObjectId(orgAId),
          tokenHash: 'hash',
          expiresAt: new Date(Date.now() + 3600000),
          revokedAt: null,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
      ]),
    } as any);
  });

  describe('GET /api/v1/sessions/:id', () => {
    it('should return session by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/sessions/${sessionId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(sessionId);
    });

    it('should return 404 for nonexistent session', async () => {
      mockSessions.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/sessions/${sessionId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/v1/sessions/user/:userId', () => {
    it('should return sessions for a user', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/sessions/user/${userId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
    });
  });

  describe('POST /api/v1/sessions/:id/revoke', () => {
    it('should revoke a session', async () => {
      mockSessions.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/sessions/${sessionId}/revoke`, {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('revoked');
    });
  });

  describe('POST /api/v1/sessions/revoke-all-others', () => {
    it('should revoke all sessions except current', async () => {
      const currentSessionId = new ObjectId().toHexString();
      mockSessions.updateMany.mockResolvedValue({ modifiedCount: 1 } as any);
      const app = createAppWithAuth({ user: { id: userId, status: 'active', roleIds: [new ObjectId().toHexString()], teamIds: [], sessionId: currentSessionId } });
      const res = await app.request('/api/v1/sessions/revoke-all-others', {
        method: 'POST',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.success).toBe(true);
    });
  });
});

describe('P34 Sessions Routes - Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as any);
    mockSessions.findOne.mockResolvedValue({
      _id: new ObjectId(sessionId),
      userId: new ObjectId(userId),
      organizationId: new ObjectId(orgAId),
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 3600000),
      revokedAt: null,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      createdAt: new Date(),
      lastUsedAt: new Date(),
    });
  });

  it('should return 403 without sessions.read permission', async () => {
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as any);
    const app = createAppWithAuth({ permissions: [], user: { id: userId, status: 'active', roleIds: [new ObjectId().toHexString()], teamIds: [], sessionId } });
    const res = await app.request(`/api/v1/sessions/${sessionId}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 without sessions.revoke permission', async () => {
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    } as any);
    const app = createAppWithAuth({ permissions: [], user: { id: userId, status: 'active', roleIds: [new ObjectId().toHexString()], teamIds: [], sessionId } });
    const res = await app.request(`/api/v1/sessions/${sessionId}/revoke`, {
      method: 'POST',
    });
    expect(res.status).toBe(403);
  });
});
