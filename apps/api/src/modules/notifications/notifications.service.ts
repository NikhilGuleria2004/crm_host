import { NotificationRepository } from './notifications.repository';
import type { NotificationListQuery, NotificationResponse, NotificationListResponse } from './notifications.types';

export class NotificationService {
  constructor(private repository: NotificationRepository) {}

  async list(organizationId: string, userId: string, params: NotificationListQuery): Promise<NotificationListResponse> {
    const limit = params.limit || 20;

    const result = await this.repository.list(organizationId, userId, {
      limit,
      cursor: params.cursor,
      unread: params.unread,
    });

    const data = result.data.map((doc) => this.repository.toResponse(doc));

    return {
      data,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    return this.repository.getUnreadCount(organizationId, userId);
  }

  async create(organizationId: string, userId: string, input: {
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<NotificationResponse> {
    const doc = await this.repository.create({
      organizationId,
      userId,
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    return this.repository.toResponse(doc);
  }

  async markAsRead(id: string, organizationId: string): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Notification not found');
    }
    await this.repository.markAsRead(id, organizationId);
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<void> {
    await this.repository.markAllAsRead(organizationId, userId);
  }
}
