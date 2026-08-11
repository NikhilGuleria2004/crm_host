import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { ImportJobDocument } from '../../types/documents';
import type { ImportJobResponse, ImportListParams } from './imports.types';

export class ImportRepository {
  async findById(id: string, organizationId: string): Promise<ImportJobDocument | null> {
    const doc = await collections.importJobs().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as ImportJobDocument | null;
  }

  async findByFileKey(fileKey: string, organizationId: string): Promise<ImportJobDocument | null> {
    const doc = await collections.importJobs().findOne({
      fileKey,
      organizationId: new ObjectId(organizationId),
    });
    return doc as ImportJobDocument | null;
  }

  async list(organizationId: string, params: ImportListParams): Promise<{ data: ImportJobDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
    };

    if (params.entity) query.entity = params.entity;
    if (params.status) query.status = params.status;

    const limit = params.limit || 20;

    if (params.cursor) {
      query.createdAt = { $lt: new Date(params.cursor) };
    }

    const data = await collections.importJobs()
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
      data: items as ImportJobDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    entity: string;
    fileKey: string;
    totalRows: number;
    createdBy: string;
  }): Promise<ImportJobDocument> {
    const now = new Date();
    const result = await collections.importJobs().insertOne({
      organizationId: new ObjectId(input.organizationId),
      entity: input.entity,
      fileKey: input.fileKey,
      status: 'pending',
      totalRows: input.totalRows,
      processedRows: 0,
      createdCount: 0,
      updatedCount: 0,
      failedCount: 0,
      createdBy: new ObjectId(input.createdBy),
      createdAt: now,
    } as any);

    const doc = await collections.importJobs().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create import job');
    return doc as ImportJobDocument;
  }

  async updateStatus(id: string, organizationId: string, updates: {
    status?: string;
    processedRows?: number;
    createdCount?: number;
    updatedCount?: number;
    failedCount?: number;
    errorFileKey?: string;
    completedAt?: Date;
  }): Promise<void> {
    const update: Record<string, unknown> = {};
    if (updates.status) update.status = updates.status;
    if (updates.processedRows !== undefined) update.processedRows = updates.processedRows;
    if (updates.createdCount !== undefined) update.createdCount = updates.createdCount;
    if (updates.updatedCount !== undefined) update.updatedCount = updates.updatedCount;
    if (updates.failedCount !== undefined) update.failedCount = updates.failedCount;
    if (updates.errorFileKey) update.errorFileKey = updates.errorFileKey;
    if (updates.completedAt) update.completedAt = updates.completedAt;

    await collections.importJobs().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );
  }

  toResponse(doc: ImportJobDocument): ImportJobResponse {
    return {
      id: doc._id.toHexString(),
      entity: doc.entity,
      status: doc.status,
      totalRows: doc.totalRows,
      processedRows: doc.processedRows,
      createdCount: doc.createdCount,
      updatedCount: doc.updatedCount,
      failedCount: doc.failedCount,
      errorFileKey: doc.errorFileKey,
      createdAt: doc.createdAt.toISOString(),
      completedAt: doc.completedAt?.toISOString(),
    };
  }
}
