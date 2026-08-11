import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { CustomFieldDefinitionDocument } from '../../types/documents';
import type { CustomFieldDefinitionResponse, CustomFieldListParams } from './custom-fields.types';

export class CustomFieldRepository {
  async findById(id: string, organizationId: string): Promise<CustomFieldDefinitionDocument | null> {
    const doc = await collections.customFieldDefinitions().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as CustomFieldDefinitionDocument | null;
  }

  async list(organizationId: string, params: CustomFieldListParams): Promise<{ data: CustomFieldDefinitionDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
    };

    if (params.entity) query.entity = params.entity;

    const limit = params.limit || 20;

    if (params.cursor) {
      query.createdAt = { $lt: new Date(params.cursor) };
    }

    const data = await collections.customFieldDefinitions()
      .find(query)
      .sort({ order: 1, createdAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as CustomFieldDefinitionDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    entity: string;
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    order: number;
  }): Promise<CustomFieldDefinitionDocument> {
    const now = new Date();
    const result = await collections.customFieldDefinitions().insertOne({
      organizationId: new ObjectId(input.organizationId),
      entity: input.entity,
      key: input.key,
      label: input.label,
      type: input.type,
      required: input.required,
      options: input.options,
      order: input.order,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.customFieldDefinitions().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create custom field');
    return doc as CustomFieldDefinitionDocument;
  }

  async update(id: string, organizationId: string, updates: {
    label?: string;
    type?: string;
    required?: boolean;
    options?: string[];
    order?: number;
  }): Promise<CustomFieldDefinitionDocument | null> {
    const updateDoc: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.label !== undefined) updateDoc.label = updates.label;
    if (updates.type !== undefined) updateDoc.type = updates.type;
    if (updates.required !== undefined) updateDoc.required = updates.required;
    if (updates.options !== undefined) updateDoc.options = updates.options;
    if (updates.order !== undefined) updateDoc.order = updates.order;

    await collections.customFieldDefinitions().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updateDoc }
    );

    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<boolean> {
    const result = await collections.customFieldDefinitions().deleteOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return result.deletedCount > 0;
  }

  async findByEntity(organizationId: string, entity: string): Promise<CustomFieldDefinitionDocument[]> {
    const data = await collections.customFieldDefinitions()
      .find({
        organizationId: new ObjectId(organizationId),
        entity: entity as 'contact' | 'company' | 'lead' | 'deal',
      })
      .sort({ order: 1 })
      .toArray();

    return data as CustomFieldDefinitionDocument[];
  }

  toResponse(doc: CustomFieldDefinitionDocument): CustomFieldDefinitionResponse {
    return {
      id: doc._id.toHexString(),
      organizationId: doc.organizationId.toHexString(),
      entity: doc.entity,
      key: doc.key,
      label: doc.label,
      type: doc.type,
      required: doc.required,
      options: doc.options,
      order: doc.order,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
