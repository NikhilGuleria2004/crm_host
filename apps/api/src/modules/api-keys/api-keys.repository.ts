import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { ApiKeyDocument } from '../../types/documents';
import type { ApiKeyResponse, ApiKeyCreateResponse } from './api-keys.types';

function toResponse(doc: ApiKeyDocument): ApiKeyResponse {
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    name: doc.name,
    scopes: doc.scopes,
    lastUsedAt: doc.lastUsedAt?.toISOString(),
    createdBy: doc.createdBy.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    revokedAt: doc.revokedAt?.toISOString(),
  };
}

export class ApiKeyRepository {
  async create(input: { organizationId: string; name: string; keyHash: string; scopes: string[]; createdBy: string }): Promise<ApiKeyDocument> {
    const now = new Date();
    const result = await collections.apiKeys().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      keyHash: input.keyHash,
      scopes: input.scopes,
      createdBy: new ObjectId(input.createdBy),
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.apiKeys().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create API key');
    return doc as ApiKeyDocument;
  }

  async findByKeyHash(keyHash: string, organizationId?: string): Promise<ApiKeyDocument | null> {
    const query: Record<string, unknown> = { keyHash, revokedAt: { $exists: false } };
    if (organizationId) {
      query.organizationId = new ObjectId(organizationId);
    }
    const doc = await collections.apiKeys().findOne(query);
    return doc as ApiKeyDocument | null;
  }

  async findById(id: string, organizationId: string): Promise<ApiKeyDocument | null> {
    const doc = await collections.apiKeys().findOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
    return doc as ApiKeyDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<ApiKeyDocument[]> {
    const docs = await collections.apiKeys().find({ organizationId: new ObjectId(organizationId) }).sort({ createdAt: -1 }).toArray();
    return docs as ApiKeyDocument[];
  }

  async findByOrganizationPaginated(organizationId: string, params: { limit: number; cursor?: string }): Promise<{ data: ApiKeyDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = { organizationId: new ObjectId(organizationId) };

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      query.createdAt = { $lt: cursorDate };
    }

    const data = await collections.apiKeys()
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
      data: items as ApiKeyDocument[],
      nextCursor,
      hasMore,
    };
  }

  async revoke(id: string, organizationId: string): Promise<void> {
    await collections.apiKeys().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { revokedAt: new Date(), updatedAt: new Date() } }
    );
  }

  async updateLastUsed(id: string, organizationId: string): Promise<void> {
    await collections.apiKeys().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { lastUsedAt: new Date() } }
    );
  }

  toResponse(doc: ApiKeyDocument): ApiKeyResponse {
    return toResponse(doc);
  }

  toCreateResponse(doc: ApiKeyDocument, key: string): ApiKeyCreateResponse {
    return {
      ...toResponse(doc),
      key,
    };
  }
}
