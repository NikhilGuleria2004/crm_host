import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { LeadDocument } from '../../types/documents';
import type { LeadResponse, LeadDetailResponse } from './leads.types';
import { FilterEngine } from '../filters/filters.engine';
import { LEAD_FILTERS } from '../filters/filters.definitions';

function toResponse(doc: LeadDocument, ownerName?: string): LeadResponse {
  return {
    id: doc._id.toHexString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    companyName: doc.companyName,
    source: doc.source,
    status: doc.status,
    owner: doc.ownerId
      ? { id: doc.ownerId.toHexString(), name: ownerName || '' }
      : undefined,
    score: doc.score,
    tags: doc.tags.map((id) => id.toHexString()),
    customFields: doc.customFields,
    convertedAt: doc.convertedAt?.toISOString(),
    convertedContactId: doc.convertedContactId?.toHexString(),
    convertedCompanyId: doc.convertedCompanyId?.toHexString(),
    convertedDealId: doc.convertedDealId?.toHexString(),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface CreateLeadPayload {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  status?: string;
  ownerId?: ObjectId;
  score?: number;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

interface UpdateLeadPayload {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status?: string;
  ownerId?: ObjectId | null;
  score?: number | null;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  convertedAt?: Date;
  convertedContactId?: ObjectId;
  convertedCompanyId?: ObjectId;
  convertedDealId?: ObjectId;
  updatedBy: ObjectId;
}

export class LeadRepository {
  async findById(id: string, organizationId: string): Promise<LeadDocument | null> {
    const doc = await collections.leads().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    });
    return doc as LeadDocument | null;
  }

  async findByEmailNormalized(organizationId: string, emailNormalized: string): Promise<LeadDocument | null> {
    const doc = await collections.leads().findOne({
      organizationId: new ObjectId(organizationId),
      emailNormalized,
      deletedAt: { $exists: false },
    });
    return doc as LeadDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    search?: string;
    status?: string;
    ownerId?: string;
    source?: string;
    score?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: LeadDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(LEAD_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        status: params.status,
        ownerId: params.ownerId,
        source: params.source,
        score: params.score,
      }).filters || [],
      organizationId
    );

    query.deletedAt = { $exists: false };

    const searchQuery = engine.buildSearchQuery(params.search || '');
    if (searchQuery) {
      query.$or = (searchQuery as any).$or;
    }

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const data = await collections.leads()
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
      data: items as LeadDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreateLeadPayload): Promise<LeadDocument> {
    const now = new Date();
    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    const result = await collections.leads().insertOne({
      organizationId: new ObjectId(input.organizationId),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      emailNormalized,
      phone: input.phone,
      companyName: input.companyName,
      source: input.source,
      status: input.status || 'new',
      ownerId: input.ownerId,
      score: input.score,
      tags: input.tags || [],
      customFields: input.customFields || {},
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.leads().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create lead');
    return doc as LeadDocument;
  }

  async update(id: string, organizationId: string, input: UpdateLeadPayload): Promise<LeadDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.email !== undefined) {
      update.email = input.email;
      update.emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;
    }
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.companyName !== undefined) update.companyName = input.companyName;
    if (input.source !== undefined) update.source = input.source;
    if (input.status !== undefined) update.status = input.status;
    if (input.ownerId !== undefined) update.ownerId = input.ownerId;
    if (input.score !== undefined) update.score = input.score;
    if (input.tags !== undefined) update.tags = input.tags;
    if (input.customFields !== undefined) update.customFields = input.customFields;

    await collections.leads().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.leads().findOne({ _id: new ObjectId(id) });
    return doc as LeadDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.leads().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async findByIds(ids: string[], organizationId: string): Promise<LeadDocument[]> {
    const objectIds = ids.map((id) => new ObjectId(id));
    const docs = await collections.leads()
      .find({
        _id: { $in: objectIds },
        organizationId: new ObjectId(organizationId),
        deletedAt: { $exists: false },
      })
      .toArray();
    return docs as LeadDocument[];
  }

  async getUserName(userId: ObjectId): Promise<string | undefined> {
    const doc = await collections.users().findOne({ _id: userId });
    return doc ? `${(doc as any).firstName} ${(doc as any).lastName}` : undefined;
  }

  toResponse(doc: LeadDocument | null, ownerName?: string): LeadResponse | null {
    if (!doc) return null;
    return toResponse(doc, ownerName);
  }

  toDetailResponse(doc: LeadDocument | null, ownerName?: string): LeadDetailResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, ownerName);
    if (!response) return null;
    return {
      ...response,
      createdBy: doc.createdBy.toHexString(),
      updatedBy: doc.updatedBy.toHexString(),
    };
  }
}
