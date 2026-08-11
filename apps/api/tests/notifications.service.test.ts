import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { NotificationService } from '../src/modules/notifications/notifications.service';
import type { NotificationRepository } from '../src/modules/notifications/notifications.repository';

function createMockRepository(): vi.Mocked<NotificationRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    getUnreadCount: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const notificationId = new ObjectId().toHexString();

const mockNotificationDoc = {
  _id: new ObjectId(notificationId),
  organizationId: new ObjectId(orgId),
  userId: new ObjectId(userId),
  type: 'task_assigned',
  title: 'New task assigned',
  message: 'You have been assigned a new task.',
  entityType: 'task',
  entityId: new ObjectId(),
  readAt: undefined,
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
};

describe('P23 NotificationService', () => {
  let service: NotificationService;
  let repository: vi.Mocked<NotificationRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new NotificationService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || notificationId,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      entityType: doc.entityType,
      entityId: doc.entityId?.toHexString?.(),
      readAt: doc.readAt?.toISOString?.(),
      createdAt: doc.createdAt?.toISOString?.(),
    }));
    repository.findById.mockResolvedValue(mockNotificationDoc);
  });

  describe('list', () => {
    it('should return paginated notifications', async () => {
      repository.list.mockResolvedValue({
        data: [mockNotificationDoc],
        nextCursor: null,
        hasMore: false,
      });

      const result = await service.list(orgId, userId, { limit: 20 });

      expect(repository.list).toHaveBeenCalledWith(orgId, userId, {
        limit: 20,
      });
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('New task assigned');
      expect(result.meta.limit).toBe(20);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should filter unread notifications', async () => {
      repository.list.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.list(orgId, userId, { limit: 20, unread: true });

      expect(repository.list).toHaveBeenCalledWith(orgId, userId, {
        limit: 20,
        unread: true,
      });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      repository.getUnreadCount.mockResolvedValue(5);

      const count = await service.getUnreadCount(orgId, userId);

      expect(repository.getUnreadCount).toHaveBeenCalledWith(orgId, userId);
      expect(count).toBe(5);
    });
  });

  describe('create', () => {
    it('should create a notification', async () => {
      repository.create.mockResolvedValue(mockNotificationDoc);

      const result = await service.create(orgId, userId, {
        type: 'task_assigned',
        title: 'New task assigned',
        message: 'You have been assigned a new task.',
        entityType: 'task',
        entityId: new ObjectId().toHexString(),
      });

      expect(repository.create).toHaveBeenCalledWith({
        organizationId: orgId,
        userId,
        type: 'task_assigned',
        title: 'New task assigned',
        message: 'You have been assigned a new task.',
        entityType: 'task',
        entityId: expect.any(String),
      });
      expect(result.title).toBe('New task assigned');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      await service.markAsRead(notificationId, orgId);
      expect(repository.markAsRead).toHaveBeenCalledWith(notificationId, orgId);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      await service.markAllAsRead(orgId, userId);
      expect(repository.markAllAsRead).toHaveBeenCalledWith(orgId, userId);
    });
  });
});
