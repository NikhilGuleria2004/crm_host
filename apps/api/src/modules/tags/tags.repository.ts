import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { TagDocument } from '../../types/documents';
import type { TagResponse, TagListParams } from './tags.types';

export class TagRepository {
  async findById(id: string, organizationId: string): Promise<TagDocument | null> {
    const doc = await collections.tags().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as TagDocument | null;
  }

  async list(organizationId: string, params: TagListParams): Promise<{ data: TagDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
    };

    const limit = params.limit || 20;

    if (params.cursor) {
      query.createdAt = { $lt: new Date(params.cursor) };
    }

    const data = await collections.tags()
      .find(query)
      .sort({ normalizedName: 1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as TagDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    name: string;
    normalizedName: string;
  }): Promise<TagDocument> {
    const now = new Date();
    const result = await collections.tags().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      normalizedName: input.normalizedName,
      createdAt: now,
    } as any);

    const doc = await collections.tags().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create tag');
    return doc as TagDocument;
  }

  async update(id: string, organizationId: string, updates: {
    name?: string;
    normalizedName?: string;
  }): Promise<TagDocument | null> {
    const updateDoc: Record<string, unknown> = {};
    if (updates.name !== undefined) updateDoc.name = updates.name;
    if (updates.normalizedName !== undefined) updateDoc.normalizedName = updates.normalizedName;

    await collections.tags().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updateDoc }
    );

    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await collections.tags().deleteOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return result.deletedCount > 0;
  }

  async removeTagFromRecords(organizationId: string, tagId: string): Promise<void> {
    const objectId = new ObjectId(tagId);

    await collections.contacts().updateMany(
      { organizationId: new ObjectId(organizationId), tags: objectId },
      { $pull: { tags: objectId } }
    );

    await collections.companies().updateMany(
      { organizationId: new ObjectId(organizationId), tags: objectId },
      { $pull: { tags: objectId } }
    );

    await collections.leads().updateMany(
      { organizationId: new ObjectId(organizationId), tags: objectId },
      { $pull: { tags: objectId } }
    );
  }

  toResponse(doc: TagDocument): TagResponse {
    return {
      id: doc._id.toHexString(),
      organizationId: doc.organizationId.toHexString(),
      name: doc.name,
      normalizedName: doc.normalizedName,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
