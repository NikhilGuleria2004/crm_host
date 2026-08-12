import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { ActivityDocument } from '../../types/documents';
import type { ActivityResponse, ActivityDetailResponse } from './activities.types';
import { FilterEngine } from '../filters/filters.engine';
import { ACTIVITY_FILTERS } from '../filters/filters.definitions';

function toResponse(doc: ActivityDocument, ownerName?: string): ActivityResponse {
  return {
    id: doc._id.toHexString(),
    type: doc.type,
    subject: doc.subject,
    description: doc.description,
    occurredAt: doc.occurredAt.toISOString(),
    durationMinutes: doc.durationMinutes,
    owner: doc.ownerId
      ? { id: doc.ownerId.toHexString(), name: ownerName || '' }
      : undefined,
    contactId: doc.contactId?.toHexString(),
    companyId: doc.companyId?.toHexString(),
    leadId: doc.leadId?.toHexString(),
    dealId: doc.dealId?.toHexString(),
    metadata: doc.metadata,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface CreateActivityPayload {
  organizationId: string;
  type: string;
  subject: string;
  description?: string;
  occurredAt: Date;
  durationMinutes?: number;
  ownerId: ObjectId;
  contactId?: ObjectId;
  companyId?: ObjectId;
  leadId?: ObjectId;
  dealId?: ObjectId;
  metadata?: Record<string, unknown>;
  createdBy: ObjectId;
}

interface UpdateActivityPayload {
  type?: string;
  subject?: string;
  description?: string | null;
  occurredAt?: Date;
  durationMinutes?: number | null;
  contactId?: ObjectId | null;
  companyId?: ObjectId | null;
  leadId?: ObjectId | null;
  dealId?: ObjectId | null;
  metadata?: Record<string, unknown>;
  updatedBy: ObjectId;
}

export class ActivityRepository {
  async findById(id: string, organizationId: string): Promise<ActivityDocument | null> {
    const doc = await collections.activities().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as ActivityDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    type?: string;
    ownerId?: string;
    contactId?: string;
    companyId?: string;
    leadId?: string;
    dealId?: string;
    from?: string;
    to?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: ActivityDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(ACTIVITY_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        type: params.type,
        ownerId: params.ownerId,
        contactId: params.contactId,
        companyId: params.companyId,
        leadId: params.leadId,
        dealId: params.dealId,
        occurredAt: params.from || params.to ? { gte: params.from, lte: params.to } : undefined,
      }).filters || [],
      organizationId
    );

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const data = await collections.activities()
      .find(query)
      .sort(engine.buildSort(params.sort, params.direction || 'desc') as any)
      .limit(params.limit + 1)
      .toArray();

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as ActivityDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreateActivityPayload): Promise<ActivityDocument> {
    const now = new Date();

    const result = await collections.activities().insertOne({
      organizationId: new ObjectId(input.organizationId),
      type: input.type,
      subject: input.subject,
      description: input.description,
      occurredAt: new Date(input.occurredAt),
      durationMinutes: input.durationMinutes,
      ownerId: input.ownerId,
      contactId: input.contactId,
      companyId: input.companyId,
      leadId: input.leadId,
      dealId: input.dealId,
      metadata: input.metadata,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.activities().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create activity');
    return doc as ActivityDocument;
  }

  async update(id: string, organizationId: string, input: UpdateActivityPayload): Promise<ActivityDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.type !== undefined) update.type = input.type;
    if (input.subject !== undefined) update.subject = input.subject;
    if (input.description !== undefined) update.description = input.description;
    if (input.occurredAt !== undefined) update.occurredAt = new Date(input.occurredAt);
    if (input.durationMinutes !== undefined) update.durationMinutes = input.durationMinutes;
    if (input.contactId !== undefined) update.contactId = input.contactId;
    if (input.companyId !== undefined) update.companyId = input.companyId;
    if (input.leadId !== undefined) update.leadId = input.leadId;
    if (input.dealId !== undefined) update.dealId = input.dealId;
    if (input.metadata !== undefined) update.metadata = input.metadata;

    await collections.activities().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.activities().findOne({ _id: new ObjectId(id) });
    return doc as ActivityDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.activities().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async getUserName(userId: ObjectId): Promise<string | undefined> {
    const doc = await collections.users().findOne({ _id: userId });
    return doc ? `${(doc as any).firstName} ${(doc as any).lastName || ''}`.trim() : undefined;
  }

  async getUserNames(userIds: ObjectId[]): Promise<Map<string, string>> {
    const docs = await collections.users()
      .find({ _id: { $in: userIds } })
      .toArray();
    const map = new Map<string, string>();
    for (const doc of docs) {
      map.set(doc._id.toHexString(), `${(doc as any).firstName} ${(doc as any).lastName || ''}`.trim());
    }
    return map;
  }

  toResponse(doc: ActivityDocument | null, ownerName?: string): ActivityResponse | null {
    if (!doc) return null;
    return toResponse(doc, ownerName);
  }

  toDetailResponse(doc: ActivityDocument | null, ownerName?: string): ActivityDetailResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, ownerName);
    if (!response) return null;
    return {
      ...response,
      createdBy: doc.createdBy.toHexString(),
    };
  }
}
