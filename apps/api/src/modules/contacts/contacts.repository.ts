import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { ContactDocument } from '../../types/documents';
import type { ContactResponse, ContactDetailResponse } from './contacts.types';
import { FilterEngine } from '../filters/filters.engine';
import { CONTACT_FILTERS } from '../filters/filters.definitions';

function toResponse(doc: ContactDocument, companyName?: string, ownerName?: string): ContactResponse {
  return {
    id: doc._id.toHexString(),
    firstName: doc.firstName,
    lastName: doc.lastName,
    email: doc.email,
    phone: doc.phone,
    jobTitle: doc.jobTitle,
    status: doc.status,
    source: doc.source,
    tags: doc.tags.map((id) => id.toHexString()),
    customFields: doc.customFields,
    address: doc.address || undefined,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    company: doc.companyId
      ? { id: doc.companyId.toHexString(), name: companyName || '' }
      : undefined,
    owner: doc.ownerId
      ? { id: doc.ownerId.toHexString(), name: ownerName || '' }
      : undefined,
  };
}

interface CreateContactPayload {
  organizationId: string;
  firstName: string;
  lastName?: string;
  email?: string;
  emailNormalized?: string;
  phone?: string;
  companyId?: ObjectId;
  jobTitle?: string;
  ownerId?: ObjectId;
  status?: string;
  source?: string;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  address?: Record<string, unknown>;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

interface UpdateContactPayload {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: ObjectId | null;
  jobTitle?: string | null;
  ownerId?: ObjectId | null;
  status?: string;
  source?: string | null;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  address?: Record<string, unknown> | null;
  updatedBy: ObjectId;
}

export class ContactRepository {
  async findById(id: string, organizationId: string): Promise<ContactDocument | null> {
    const doc = await collections.contacts().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    });
    return doc as ContactDocument | null;
  }

  async findByEmailNormalized(organizationId: string, emailNormalized: string): Promise<ContactDocument | null> {
    const doc = await collections.contacts().findOne({
      organizationId: new ObjectId(organizationId),
      emailNormalized,
      deletedAt: { $exists: false },
    });
    return doc as ContactDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    search?: string;
    status?: string;
    ownerId?: string;
    companyId?: string;
    source?: string;
    tagId?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: ContactDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(CONTACT_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        status: params.status,
        ownerId: params.ownerId,
        companyId: params.companyId,
        source: params.source,
        tagId: params.tagId,
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

    const data = await collections.contacts()
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
      data: items as ContactDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreateContactPayload): Promise<ContactDocument> {
    const now = new Date();
    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    const result = await collections.contacts().insertOne({
      organizationId: new ObjectId(input.organizationId),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      emailNormalized,
      phone: input.phone,
      companyId: input.companyId,
      jobTitle: input.jobTitle,
      ownerId: input.ownerId,
      status: input.status || 'active',
      source: input.source,
      tags: input.tags || [],
      customFields: input.customFields || {},
      address: input.address,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.contacts().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create contact');
    return doc as ContactDocument;
  }

  async update(id: string, organizationId: string, input: UpdateContactPayload): Promise<ContactDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.firstName !== undefined) update.firstName = input.firstName;
    if (input.lastName !== undefined) update.lastName = input.lastName;
    if (input.email !== undefined) {
      update.email = input.email;
      update.emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;
    }
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.companyId !== undefined) update.companyId = input.companyId;
    if (input.jobTitle !== undefined) update.jobTitle = input.jobTitle;
    if (input.ownerId !== undefined) update.ownerId = input.ownerId;
    if (input.status !== undefined) update.status = input.status;
    if (input.source !== undefined) update.source = input.source;
    if (input.tags !== undefined) update.tags = input.tags;
    if (input.customFields !== undefined) update.customFields = input.customFields;
    if (input.address !== undefined) update.address = input.address;

    await collections.contacts().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.contacts().findOne({ _id: new ObjectId(id) });
    return doc as ContactDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.contacts().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async findByIds(ids: string[], organizationId: string): Promise<ContactDocument[]> {
    const objectIds = ids.map((id) => new ObjectId(id));
    const docs = await collections.contacts()
      .find({
        _id: { $in: objectIds },
        organizationId: new ObjectId(organizationId),
        deletedAt: { $exists: false },
      })
      .toArray();
    return docs as ContactDocument[];
  }

  async getCompanyName(companyId: ObjectId): Promise<string | undefined> {
    const doc = await collections.companies().findOne({ _id: companyId });
    return doc ? (doc as any).name : undefined;
  }

  async getUserName(userId: ObjectId): Promise<string | undefined> {
    const doc = await collections.users().findOne({ _id: userId });
    return doc ? `${(doc as any).firstName} ${(doc as any).lastName}` : undefined;
  }

  toResponse(doc: ContactDocument | null, companyName?: string, ownerName?: string): ContactResponse | null {
    if (!doc) return null;
    return toResponse(doc, companyName, ownerName);
  }

  toDetailResponse(doc: ContactDocument | null, companyName?: string, ownerName?: string): ContactDetailResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, companyName, ownerName);
    if (!response) return null;
    return {
      ...response,
      createdBy: doc.createdBy.toHexString(),
      updatedBy: doc.updatedBy.toHexString(),
    };
  }
}
