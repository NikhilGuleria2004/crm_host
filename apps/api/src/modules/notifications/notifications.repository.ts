import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { NotificationDocument } from '../../types/documents';
import type { NotificationResponse } from './notifications.types';

export class NotificationRepository {
  async findById(id: string, organizationId: string): Promise<NotificationDocument | null> {
    const doc = await collections.notifications().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as NotificationDocument | null;
  }

  async list(organizationId: string, userId: string, params: {
    limit: number;
    cursor?: string;
    unread?: boolean;
  }): Promise<{ data: NotificationDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
    };

    if (params.unread) {
      query.readAt = { $exists: false };
    }

    if (params.cursor) {
      query.createdAt = { $lt: new Date(params.cursor) };
    }

    const data = await collections.notifications()
      .find(query)
      .sort({ createdAt: -1 })
      .limit(params.limit + 1)
      .toArray();

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as NotificationDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    userId: string;
    type: string;
    title: string;
    message: string;
    entityType?: string;
    entityId?: string;
  }): Promise<NotificationDocument> {
    const now = new Date();
    const result = await collections.notifications().insertOne({
      organizationId: new ObjectId(input.organizationId),
      userId: new ObjectId(input.userId),
      type: input.type,
      title: input.title,
      message: input.message,
      entityType: input.entityType,
      entityId: input.entityId ? new ObjectId(input.entityId) : undefined,
      readAt: undefined,
      createdAt: now,
    } as any);

    const doc = await collections.notifications().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create notification');
    return doc as NotificationDocument;
  }

  async markAsRead(id: string, organizationId: string): Promise<void> {
    await collections.notifications().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId), readAt: { $exists: false } },
      { $set: { readAt: new Date() } }
    );
  }

  async markAllAsRead(organizationId: string, userId: string): Promise<void> {
    await collections.notifications().updateMany(
      { organizationId: new ObjectId(organizationId), userId: new ObjectId(userId), readAt: { $exists: false } },
      { $set: { readAt: new Date() } }
    );
  }

  async getUnreadCount(organizationId: string, userId: string): Promise<number> {
    const result = await collections.notifications().countDocuments({
      organizationId: new ObjectId(organizationId),
      userId: new ObjectId(userId),
      readAt: { $exists: false },
    });
    return result;
  }

  toResponse(doc: NotificationDocument): NotificationResponse {
    return {
      id: doc._id.toHexString(),
      type: doc.type,
      title: doc.title,
      message: doc.message,
      entityType: doc.entityType,
      entityId: doc.entityId?.toHexString(),
      readAt: doc.readAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
