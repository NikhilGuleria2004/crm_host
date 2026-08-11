import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { ExportJobDocument } from '../../types/documents';
import type { ExportJobResponse, ExportListParams } from './exports.types';

export class ExportRepository {
  async findById(id: string, organizationId: string): Promise<ExportJobDocument | null> {
    const doc = await collections.exportJobs().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as ExportJobDocument | null;
  }

  async list(organizationId: string, params: ExportListParams): Promise<{ data: ExportJobDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
    };

    if (params.entity) query.entity = params.entity;
    if (params.status) query.status = params.status;

    const limit = params.limit || 20;

    if (params.cursor) {
      query.createdAt = { $lt: new Date(params.cursor) };
    }

    const data = await collections.exportJobs()
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .toArray();

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as ExportJobDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    entity: string;
    filters: Record<string, unknown>;
    fields: string[];
    createdBy: string;
  }): Promise<ExportJobDocument> {
    const now = new Date();
    const result = await collections.exportJobs().insertOne({
      organizationId: new ObjectId(input.organizationId),
      entity: input.entity,
      filters: input.filters,
      fields: input.fields,
      status: 'pending',
      createdBy: new ObjectId(input.createdBy),
      createdAt: now,
    } as any);

    const doc = await collections.exportJobs().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create export job');
    return doc as ExportJobDocument;
  }

  async updateStatus(id: string, organizationId: string, updates: {
    status?: string;
    fileKey?: string;
    totalRows?: number;
    completedAt?: Date;
  }): Promise<ExportJobDocument | null> {
    const updateDoc: Record<string, unknown> = {};
    if (updates.status) updateDoc.status = updates.status;
    if (updates.fileKey) updateDoc.fileKey = updates.fileKey;
    if (updates.totalRows !== undefined) updateDoc.totalRows = updates.totalRows;
    if (updates.completedAt) updateDoc.completedAt = updates.completedAt;

    await collections.exportJobs().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: updateDoc }
    );

    return this.findById(id, organizationId);
  }

  toResponse(doc: ExportJobDocument): ExportJobResponse {
    return {
      id: doc._id.toHexString(),
      entity: doc.entity,
      status: doc.status,
      totalRows: doc.totalRows,
      fileKey: doc.fileKey,
      downloadUrl: doc.fileKey ? `/api/v1/exports/${doc._id.toHexString()}/download` : undefined,
      createdBy: doc.createdBy.toHexString(),
      createdAt: doc.createdAt.toISOString(),
      completedAt: doc.completedAt?.toISOString(),
    };
  }
}
