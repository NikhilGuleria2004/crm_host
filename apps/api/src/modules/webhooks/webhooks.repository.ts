import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { WebhookDocument, WebhookDeliveryDocument } from '../../types/documents';
import type { WebhookResponse, WebhookCreateResponse, WebhookDeliveryResponse } from './webhooks.types';

function toWebhookResponse(doc: WebhookDocument): WebhookResponse {
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    url: doc.url,
    events: doc.events,
    status: doc.status,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy.toHexString(),
  };
}

export class WebhookRepository {
  async create(input: { organizationId: string; url: string; events: string[]; secret: string; status: 'active' | 'inactive'; createdBy: string }): Promise<WebhookDocument> {
    const now = new Date();
    const result = await collections.webhooks().insertOne({
      organizationId: new ObjectId(input.organizationId),
      url: input.url,
      events: input.events,
      secret: input.secret,
      status: input.status,
      createdBy: new ObjectId(input.createdBy),
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.webhooks().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create webhook');
    return doc as WebhookDocument;
  }

  async findById(id: string, organizationId: string): Promise<WebhookDocument | null> {
    const doc = await collections.webhooks().findOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
    return doc as WebhookDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<WebhookDocument[]> {
    const docs = await collections.webhooks().find({ organizationId: new ObjectId(organizationId) }).sort({ createdAt: -1 }).toArray();
    return docs as WebhookDocument[];
  }

  async findByOrganizationPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: WebhookDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = { organizationId: new ObjectId(organizationId) };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      query.createdAt = { $lt: cursorDate };
    }

    const data = await collections.webhooks()
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
      data: items as WebhookDocument[],
      nextCursor,
      hasMore,
    };
  }

  async update(id: string, organizationId: string, updates: { url?: string; events?: string[]; status?: 'active' | 'inactive' }): Promise<WebhookDocument | null> {
    const updateDoc: any = { ...updates, updatedAt: new Date() };
    await collections.webhooks().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updateDoc }
    );
    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await collections.webhooks().deleteOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
  }

  async createDelivery(input: { organizationId: string; webhookId: string; eventId: string; eventType: string; payload: Record<string, unknown>; attempt: number; status: string; responseCode?: number; responseBody?: string; duration?: number; error?: string; nextRetryAt?: Date }): Promise<WebhookDeliveryDocument> {
    const now = new Date();
    const result = await collections.webhookDeliveries().insertOne({
      organizationId: new ObjectId(input.organizationId),
      webhookId: new ObjectId(input.webhookId),
      eventId: input.eventId,
      eventType: input.eventType,
      payload: input.payload,
      attempt: input.attempt,
      status: input.status as any,
      responseCode: input.responseCode,
      responseBody: input.responseBody,
      duration: input.duration,
      error: input.error,
      nextRetryAt: input.nextRetryAt,
      createdAt: now,
    } as any);

    const doc = await collections.webhookDeliveries().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create webhook delivery');
    return doc as WebhookDeliveryDocument;
  }

  async findDeliveries(webhookId: string, organizationId: string, limit = 50): Promise<WebhookDeliveryDocument[]> {
    const docs = await collections.webhookDeliveries()
      .find({ webhookId: new ObjectId(webhookId), organizationId: new ObjectId(organizationId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs as WebhookDeliveryDocument[];
  }

  async findPendingRetries(organizationId: string): Promise<WebhookDeliveryDocument[]> {
    const docs = await collections.webhookDeliveries()
      .find({
        organizationId: new ObjectId(organizationId),
        status: 'pending',
        nextRetryAt: { $lte: new Date() },
      })
      .sort({ createdAt: 1 })
      .toArray();
    return docs as WebhookDeliveryDocument[];
  }

  async updateDeliveryStatus(id: string, organizationId: string, updates: { status?: 'pending' | 'delivered' | 'failed'; responseCode?: number; responseBody?: string; duration?: number; error?: string; nextRetryAt?: Date }): Promise<void> {
    await collections.webhookDeliveries().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updates }
    );
  }

  toResponse(doc: WebhookDocument): WebhookResponse {
    return toWebhookResponse(doc);
  }

  toCreateResponse(doc: WebhookDocument, secret: string): WebhookCreateResponse {
    return {
      ...toWebhookResponse(doc),
      secret,
    };
  }

  toDeliveryResponse(doc: WebhookDeliveryDocument): WebhookDeliveryResponse {
    return {
      id: doc._id.toHexString(),
      webhookId: doc.webhookId.toHexString(),
      eventId: doc.eventId,
      eventType: doc.eventType,
      attempt: doc.attempt,
      status: doc.status,
      responseCode: doc.responseCode,
      duration: doc.duration,
      error: doc.error,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
