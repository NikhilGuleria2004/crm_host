import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { CompanyDocument } from '../../types/documents';
import type { CompanyResponse, CompanyDetailResponse } from './companies.types';

function toResponse(doc: CompanyDocument, ownerName?: string): CompanyResponse {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    normalizedName: doc.normalizedName,
    website: doc.website,
    email: doc.email,
    phone: doc.phone,
    industry: doc.industry,
    employeeCount: doc.employeeCount,
    annualRevenue: doc.annualRevenue,
    status: doc.status,
    tags: doc.tags.map((id) => id.toHexString()),
    customFields: doc.customFields,
    address: doc.address || undefined,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    owner: doc.ownerId
      ? { id: doc.ownerId.toHexString(), name: ownerName || '' }
      : undefined,
  };
}

interface CreateCompanyPayload {
  organizationId: string;
  name: string;
  normalizedName: string;
  website?: string;
  email?: string;
  phone?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  ownerId?: ObjectId;
  status?: string;
  description?: string;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  address?: Record<string, unknown>;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

interface UpdateCompanyPayload {
  name?: string;
  normalizedName?: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  ownerId?: ObjectId | null;
  status?: string;
  description?: string | null;
  tags?: ObjectId[];
  customFields?: Record<string, unknown>;
  address?: Record<string, unknown> | null;
  updatedBy: ObjectId;
}

export class CompanyRepository {
  async findById(id: string, organizationId: string): Promise<CompanyDocument | null> {
    const doc = await collections.companies().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    });
    return doc as CompanyDocument | null;
  }

  async findByNormalizedName(organizationId: string, normalizedName: string): Promise<CompanyDocument | null> {
    const doc = await collections.companies().findOne({
      organizationId: new ObjectId(organizationId),
      normalizedName,
      deletedAt: { $exists: false },
    });
    return doc as CompanyDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    search?: string;
    industry?: string;
    ownerId?: string;
    status?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: CompanyDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const query: Record<string, unknown> = {
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    };

    if (params.status) {
      query.status = params.status;
    }

    if (params.ownerId) {
      query.ownerId = new ObjectId(params.ownerId);
    }

    if (params.industry) {
      query.industry = params.industry;
    }

    if (params.search) {
      const searchRegex = new RegExp(params.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: searchRegex },
        { normalizedName: searchRegex },
      ];
    }

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
    const sortDirection = params.direction === 'asc' ? 1 : -1;

    const data = await collections.companies()
      .find(query)
      .sort({ [sortField]: sortDirection })
      .limit(params.limit + 1)
      .toArray();

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as CompanyDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreateCompanyPayload): Promise<CompanyDocument> {
    const now = new Date();
    const normalizedName = input.normalizedName || input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const result = await collections.companies().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      normalizedName,
      website: input.website,
      email: input.email,
      phone: input.phone,
      industry: input.industry,
      employeeCount: input.employeeCount,
      annualRevenue: input.annualRevenue,
      ownerId: input.ownerId,
      status: input.status || 'active',
      description: input.description,
      tags: input.tags || [],
      customFields: input.customFields || {},
      address: input.address,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.companies().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create company');
    return doc as CompanyDocument;
  }

  async update(id: string, organizationId: string, input: UpdateCompanyPayload): Promise<CompanyDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.normalizedName !== undefined) update.normalizedName = input.normalizedName;
    if (input.website !== undefined) update.website = input.website;
    if (input.email !== undefined) update.email = input.email;
    if (input.phone !== undefined) update.phone = input.phone;
    if (input.industry !== undefined) update.industry = input.industry;
    if (input.employeeCount !== undefined) update.employeeCount = input.employeeCount;
    if (input.annualRevenue !== undefined) update.annualRevenue = input.annualRevenue;
    if (input.ownerId !== undefined) update.ownerId = input.ownerId;
    if (input.status !== undefined) update.status = input.status;
    if (input.description !== undefined) update.description = input.description;
    if (input.tags !== undefined) update.tags = input.tags;
    if (input.customFields !== undefined) update.customFields = input.customFields;
    if (input.address !== undefined) update.address = input.address;

    await collections.companies().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.companies().findOne({ _id: new ObjectId(id) });
    return doc as CompanyDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.companies().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async findByIds(ids: string[], organizationId: string): Promise<CompanyDocument[]> {
    const objectIds = ids.map((id) => new ObjectId(id));
    const docs = await collections.companies()
      .find({
        _id: { $in: objectIds },
        organizationId: new ObjectId(organizationId),
        deletedAt: { $exists: false },
      })
      .toArray();
    return docs as CompanyDocument[];
  }

  async getContactCount(companyId: ObjectId): Promise<number> {
    const count = await collections.contacts().countDocuments({
      companyId,
      deletedAt: { $exists: false },
    });
    return count;
  }

  async getOpenDealsCount(companyId: ObjectId): Promise<{ count: number; totalValue: number }> {
    const pipeline = [
      {
        $match: {
          companyId,
          status: 'open',
          deletedAt: { $exists: false },
        },
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalValue: { $sum: '$amount' },
        },
      },
    ];

    const result = await collections.deals().aggregate(pipeline).toArray();
    if (result.length === 0) {
      return { count: 0, totalValue: 0 };
    }
    return {
      count: result[0].count || 0,
      totalValue: result[0].totalValue || 0,
    };
  }

  async getUserName(userId: ObjectId): Promise<string | undefined> {
    const doc = await collections.users().findOne({ _id: userId });
    return doc ? `${(doc as any).firstName} ${(doc as any).lastName}` : undefined;
  }

  toResponse(doc: CompanyDocument | null, ownerName?: string): CompanyResponse | null {
    if (!doc) return null;
    return toResponse(doc, ownerName);
  }

  toDetailResponse(doc: CompanyDocument | null, ownerName?: string, contactsCount?: number, openDeals?: { count: number; totalValue: number }): CompanyDetailResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, ownerName);
    if (!response) return null;
    return {
      ...response,
      contactsCount: contactsCount || 0,
      openDealsCount: openDeals?.count || 0,
      openPipelineValue: openDeals?.totalValue || 0,
      createdBy: doc.createdBy.toHexString(),
      updatedBy: doc.updatedBy.toHexString(),
    };
  }
}
