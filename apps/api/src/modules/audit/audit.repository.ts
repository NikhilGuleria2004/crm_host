import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { AuditLogDocument } from '../../types/documents';
import type { AuditLogResponse, CreateAuditLogInput } from './audit.types';

function toResponse(doc: AuditLogDocument): AuditLogResponse {
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    actorId: doc.actorId?.toHexString(),
    action: doc.action,
    entityType: doc.entityType,
    entityId: doc.entityId?.toHexString(),
    before: doc.before,
    after: doc.after,
    metadata: doc.metadata,
    ipAddress: doc.ipAddress,
    userAgent: doc.userAgent,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class AuditRepository {
  async create(input: CreateAuditLogInput & { organizationId: string; actorId?: string; ipAddress?: string; userAgent?: string }): Promise<AuditLogDocument> {
    const now = new Date();
    const doc: AuditLogDocument = {
      _id: new ObjectId(),
      organizationId: new ObjectId(input.organizationId),
      actorId: input.actorId ? new ObjectId(input.actorId) : undefined,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ? new ObjectId(input.entityId) : undefined,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      createdAt: now,
    };

    await collections.auditLogs().insertOne(doc);
    return doc;
  }

  async findByOrganization(organizationId: string, limit = 50, cursor?: string): Promise<{ logs: AuditLogDocument[]; nextCursor?: string }> {
    const query: any = { organizationId: new ObjectId(organizationId) };
    if (cursor) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const logs = await collections.auditLogs().find(query).sort({ createdAt: -1 }).limit(limit + 1).toArray();
    const hasMore = logs.length > limit;
    const result = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? result[result.length - 1]._id.toHexString() : undefined;

    return {
      logs: result as AuditLogDocument[],
      nextCursor,
    };
  }

  async findByOrganizationWithFilters(organizationId: string, filters: { limit?: number; cursor?: string; actorId?: string; action?: string; entityType?: string; entityId?: string; ipAddress?: string; search?: string }): Promise<{ logs: AuditLogDocument[]; nextCursor?: string }> {
    const query: any = { organizationId: new ObjectId(organizationId) };

    if (filters.actorId) {
      query.actorId = new ObjectId(filters.actorId);
    }
    if (filters.action) {
      query.action = filters.action;
    }
    if (filters.entityType) {
      query.entityType = filters.entityType;
    }
    if (filters.entityId) {
      query.entityId = new ObjectId(filters.entityId);
    }
    if (filters.ipAddress) {
      query.ipAddress = filters.ipAddress;
    }
    if (filters.search) {
      const escaped = filters.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { action: { $regex: escaped, $options: 'i' } },
        { entityType: { $regex: escaped, $options: 'i' } },
        { entityId: { $regex: escaped, $options: 'i' } },
        { ipAddress: { $regex: escaped, $options: 'i' } },
        { userAgent: { $regex: escaped, $options: 'i' } },
      ];
    }

    const limit = filters.limit || 50;
    const cursor = filters.cursor;
    if (cursor) {
      query._id = { $lt: new ObjectId(cursor) };
    }

    const logs = await collections.auditLogs().find(query).sort({ createdAt: -1 }).limit(limit + 1).toArray();
    const hasMore = logs.length > limit;
    const result = hasMore ? logs.slice(0, limit) : logs;
    const nextCursor = hasMore ? result[result.length - 1]._id.toHexString() : undefined;

    return {
      logs: result as AuditLogDocument[],
      nextCursor,
    };
  }

  async findById(id: string): Promise<AuditLogDocument | null> {
    const doc = await collections.auditLogs().findOne({ _id: new ObjectId(id) });
    return doc as AuditLogDocument | null;
  }

  toResponse(doc: AuditLogDocument | null): AuditLogResponse | null {
    if (!doc) return null;
    return toResponse(doc);
  }
}
