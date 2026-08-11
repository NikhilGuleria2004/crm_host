import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { IntegrationDocument } from '../../types/documents';
import type { IntegrationResponse } from './integrations.types';

function toResponse(doc: IntegrationDocument): IntegrationResponse {
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    provider: doc.provider,
    status: doc.status,
    lastSyncAt: doc.lastSyncAt?.toISOString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    createdBy: doc.createdBy.toHexString(),
  };
}

export class IntegrationRepository {
  async create(input: { organizationId: string; provider: string; credentials: Record<string, unknown>; settings?: Record<string, unknown>; status: 'connected' | 'disconnected'; createdBy: string }): Promise<IntegrationDocument> {
    const now = new Date();
    const result = await collections.integrations().insertOne({
      organizationId: new ObjectId(input.organizationId),
      provider: input.provider,
      status: input.status,
      credentials: input.credentials,
      settings: input.settings || {},
      createdBy: new ObjectId(input.createdBy),
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.integrations().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create integration');
    return doc as IntegrationDocument;
  }

  async findById(id: string, organizationId: string): Promise<IntegrationDocument | null> {
    const doc = await collections.integrations().findOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
    return doc as IntegrationDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<IntegrationDocument[]> {
    const docs = await collections.integrations().find({ organizationId: new ObjectId(organizationId) }).sort({ createdAt: -1 }).toArray();
    return docs as IntegrationDocument[];
  }

  async findByOrganizationPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: IntegrationDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = { organizationId: new ObjectId(organizationId) };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      query.createdAt = { $lt: cursorDate };
    }

    const data = await collections.integrations()
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
      data: items as IntegrationDocument[],
      nextCursor,
      hasMore,
    };
  }

  async findByProvider(organizationId: string, provider: string): Promise<IntegrationDocument | null> {
    const doc = await collections.integrations().findOne({ organizationId: new ObjectId(organizationId), provider });
    return doc as IntegrationDocument | null;
  }

  async update(id: string, organizationId: string, updates: { credentials?: Record<string, unknown>; settings?: Record<string, unknown>; status?: 'connected' | 'disconnected'; lastSyncAt?: Date }): Promise<IntegrationDocument | null> {
    const updateDoc: any = { ...updates, updatedAt: new Date() };
    await collections.integrations().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updateDoc }
    );
    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await collections.integrations().deleteOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
  }

  toResponse(doc: IntegrationDocument): IntegrationResponse {
    return toResponse(doc);
  }
}
