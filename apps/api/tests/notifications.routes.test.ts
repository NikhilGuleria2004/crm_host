import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createNotificationsRoutes } from '../src/modules/notifications/notifications.routes';

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

const mockNotifications = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    notifications: () => mockNotifications,
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
const notificationId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockNotificationData = {
  _id: new ObjectId(notificationId),
  organizationId: new ObjectId(orgAId),
  userId: new ObjectId(userId),
  type: 'task_assigned',
  title: 'New task assigned',
  message: 'You have been assigned a new task.',
  entityType: 'task',
  entityId: new ObjectId(),
  readAt: undefined,
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'notifications.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/notifications', createNotificationsRoutes());
  return app;
}

describe('P23 Notifications Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNotificationData = {
      _id: new ObjectId(notificationId),
      organizationId: new ObjectId(orgAId),
      userId: new ObjectId(userId),
      type: 'task_assigned',
      title: 'New task assigned',
      message: 'You have been assigned a new task.',
      entityType: 'task',
      entityId: new ObjectId(),
      readAt: undefined,
      createdAt: new Date('2026-08-09T10:00:00.000Z'),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'notifications.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockNotifications.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === notificationId) {
        return Promise.resolve({ ...mockNotificationData, _id: new ObjectId(notificationId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockNotifications.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockNotificationData, _id: new ObjectId(notificationId) }]),
        }),
      }),
    } as any);
    mockNotifications.insertOne.mockResolvedValue({ insertedId: new ObjectId(notificationId) });
    mockNotifications.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === notificationId) {
        mockNotificationData = { ...mockNotificationData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockNotifications.updateMany.mockResolvedValue({ modifiedCount: 1 });
    mockNotifications.countDocuments.mockResolvedValue(0);
  });

  describe('GET /api/v1/notifications', () => {
    it('should list notifications', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/notifications');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('New task assigned');
      expect(data.meta).toBeDefined();
    });

    it('should filter unread notifications', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/notifications?unread=true');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
    });
  });

  describe('GET /api/v1/notifications/unread-count', () => {
    it('should return unread count', async () => {
      mockNotifications.countDocuments.mockResolvedValue(3);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/notifications/unread-count');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.count).toBe(3);
    });
  });

  describe('POST /api/v1/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/notifications/${notificationId}/read`, {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(notificationId);
      expect(data.data.readAt).toBeDefined();
    });

    it('should return 404 for non-existent notification', async () => {
      mockNotifications.findOne.mockResolvedValueOnce(null);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/notifications/000000000000000000000000/read', {
        method: 'POST',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/notifications/read-all', () => {
    it('should mark all notifications as read', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/notifications/read-all', {
        method: 'POST',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.readAt).toBeDefined();
    });
  });
});
