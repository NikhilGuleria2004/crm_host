import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { DealDocument } from '../../types/documents';
import type { DealResponse, DealStageInfo, DealDetailResponse } from './deals.types';
import { FilterEngine } from '../filters/filters.engine';
import { DEAL_FILTERS } from '../filters/filters.definitions';

export class DealRepository {
  async findById(id: string, organizationId: string): Promise<DealDocument | null> {
    const doc = await collections.deals().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
      deletedAt: { $exists: false },
    });
    return doc as DealDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    search?: string;
    pipelineId?: string;
    stageId?: string;
    ownerId?: string;
    companyId?: string;
    contactId?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    expectedCloseAfter?: string;
    expectedCloseBefore?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: DealDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(DEAL_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        status: params.status,
        pipelineId: params.pipelineId,
        stageId: params.stageId,
        ownerId: params.ownerId,
        companyId: params.companyId,
        contactId: params.contactId,
        amount: params.minAmount !== undefined || params.maxAmount !== undefined ? { gte: params.minAmount, lte: params.maxAmount } : undefined,
        expectedCloseAfter: params.expectedCloseAfter,
        expectedCloseBefore: params.expectedCloseBefore,
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

    const data = await collections.deals()
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
      data: items as DealDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    name: string;
    pipelineId: string;
    stageId: string;
    companyId?: ObjectId;
    contactId?: ObjectId;
    ownerId: ObjectId;
    amount: number;
    currency: string;
    probability: number;
    expectedCloseDate?: Date;
    source?: string;
    customFields: Record<string, unknown>;
    createdBy: ObjectId;
    updatedBy: ObjectId;
  }): Promise<DealDocument> {
    const now = new Date();
    const result = await collections.deals().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      pipelineId: new ObjectId(input.pipelineId),
      stageId: new ObjectId(input.stageId),
      companyId: input.companyId,
      contactId: input.contactId,
      ownerId: input.ownerId,
      amount: input.amount,
      currency: input.currency,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate,
      source: input.source,
      status: 'open',
      customFields: input.customFields,
      createdBy: input.createdBy,
      updatedBy: input.updatedBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.deals().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create deal');
    return doc as DealDocument;
  }

  async update(id: string, organizationId: string, input: {
    name?: string;
    pipelineId?: ObjectId;
    stageId?: ObjectId;
    companyId?: ObjectId | null;
    contactId?: ObjectId | null;
    ownerId?: ObjectId | null;
    amount?: number;
    currency?: string;
    probability?: number;
    expectedCloseDate?: Date | null;
    source?: string | null;
    customFields?: Record<string, unknown>;
    status?: 'open' | 'won' | 'lost';
    wonAt?: Date;
    lostReason?: string;
    lostAt?: Date;
    updatedBy: ObjectId;
  }): Promise<DealDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.pipelineId !== undefined) update.pipelineId = input.pipelineId;
    if (input.stageId !== undefined) update.stageId = input.stageId;
    if (input.companyId !== undefined) update.companyId = input.companyId;
    if (input.contactId !== undefined) update.contactId = input.contactId;
    if (input.ownerId !== undefined) update.ownerId = input.ownerId;
    if (input.amount !== undefined) update.amount = input.amount;
    if (input.currency !== undefined) update.currency = input.currency;
    if (input.probability !== undefined) update.probability = input.probability;
    if (input.expectedCloseDate !== undefined) update.expectedCloseDate = input.expectedCloseDate;
    if (input.source !== undefined) update.source = input.source;
    if (input.customFields !== undefined) update.customFields = input.customFields;
    if (input.status !== undefined) update.status = input.status;
    if (input.wonAt !== undefined) update.wonAt = input.wonAt;
    if (input.lostReason !== undefined) update.lostReason = input.lostReason;
    if (input.lostAt !== undefined) update.lostAt = input.lostAt;
    update.updatedBy = input.updatedBy;

    await collections.deals().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.deals().findOne({ _id: new ObjectId(id) });
    return doc as DealDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.deals().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async getPipeline(pipelineId: string): Promise<{ id: string; name: string } | null> {
    const doc = await collections.pipelines().findOne({ _id: new ObjectId(pipelineId) });
    if (!doc) return null;
    return { id: doc._id.toHexString(), name: (doc as any).name };
  }

  async getStage(stageId: string): Promise<DealStageInfo | null> {
    try {
      const doc = await collections.pipelineStages().findOne({ _id: new ObjectId(stageId) });
      if (!doc) return null;
      return {
        id: doc._id.toHexString(),
        name: (doc as any).name,
        order: (doc as any).order,
        probability: (doc as any).probability,
        isWon: (doc as any).isWon,
        isLost: (doc as any).isLost,
      };
    } catch {
      return null;
    }
  }

  async getCompany(companyId: string): Promise<{ id: string; name: string } | null> {
    const doc = await collections.companies().findOne({ _id: new ObjectId(companyId) });
    if (!doc) return null;
    return { id: doc._id.toHexString(), name: (doc as any).name };
  }

  async getContact(contactId: string): Promise<{ id: string; name: string } | null> {
    const doc = await collections.contacts().findOne({ _id: new ObjectId(contactId) });
    if (!doc) return null;
    const firstName = (doc as any).firstName || '';
    const lastName = (doc as any).lastName || '';
    return { id: doc._id.toHexString(), name: `${firstName} ${lastName}`.trim() };
  }

  async getUser(userId: string): Promise<{ id: string; name: string } | null> {
    const doc = await collections.users().findOne({ _id: new ObjectId(userId) });
    if (!doc) return null;
    const firstName = (doc as any).firstName || '';
    const lastName = (doc as any).lastName || '';
    return { id: doc._id.toHexString(), name: `${firstName} ${lastName}`.trim() };
  }

  async getSummary(dealId: string): Promise<{ activities: number; tasks: number; notes: number; attachments: number }> {
    const [activities, tasks, notes, attachments] = await Promise.all([
      collections.activities().countDocuments({ dealId: new ObjectId(dealId), deletedAt: { $exists: false } }),
      collections.tasks().countDocuments({ dealId: new ObjectId(dealId), deletedAt: { $exists: false } }),
      collections.notes().countDocuments({ dealId: new ObjectId(dealId), deletedAt: { $exists: false } }),
      collections.attachments().countDocuments({ dealId: new ObjectId(dealId), deletedAt: { $exists: false } }),
    ]);

    return { activities, tasks, notes, attachments };
  }

  toResponse(doc: DealDocument, pipeline?: { id: string; name: string }, stage?: DealStageInfo, company?: { id: string; name: string }, contact?: { id: string; name: string }, owner?: { id: string; name: string }, summary?: { activities: number; tasks: number; notes: number; attachments: number }): DealResponse {
    return {
      id: doc._id.toHexString(),
      name: doc.name,
      pipelineId: doc.pipelineId.toHexString(),
      stageId: doc.stageId.toHexString(),
      pipeline,
      stage,
      company,
      contact,
      owner,
      amount: doc.amount,
      currency: doc.currency,
      probability: doc.probability,
      expectedCloseDate: doc.expectedCloseDate?.toISOString(),
      source: doc.source,
      status: doc.status,
      lostReason: doc.lostReason,
      customFields: doc.customFields,
      summary: summary || { activities: 0, tasks: 0, notes: 0, attachments: 0 },
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  toDetailResponse(doc: DealDocument, pipeline?: { id: string; name: string }, stage?: DealStageInfo, company?: { id: string; name: string }, contact?: { id: string; name: string }, owner?: { id: string; name: string }, summary?: { activities: number; tasks: number; notes: number; attachments: number }): DealDetailResponse | null {
    if (!doc) return null;
    const response = this.toResponse(doc, pipeline, stage, company, contact, owner, summary);
    return {
      ...response,
      createdBy: doc.createdBy.toHexString(),
      updatedBy: doc.updatedBy.toHexString(),
    };
  }
}
