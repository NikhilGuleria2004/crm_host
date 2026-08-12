import { ObjectId } from 'mongodb';
import { DealRepository } from './deals.repository';
import type { CreateDealInput, UpdateDealInput, DealResponse, DealListResponse, DealListQuery, ChangeStageInput, MarkWonInput, MarkLostInput, DealDetailResponse } from './deals.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class DealService {
  constructor(private repository: DealRepository) {}

  async list(organizationId: string, params: DealListQuery): Promise<DealListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      search: params.search,
      pipelineId: params.pipelineId,
      stageId: params.stageId,
      ownerId: params.ownerId,
      companyId: params.companyId,
      contactId: params.contactId,
      status: params.status,
      minAmount: params.minAmount,
      maxAmount: params.maxAmount,
      expectedCloseAfter: params.expectedCloseAfter,
      expectedCloseBefore: params.expectedCloseBefore,
      sort,
      direction,
    });

    const pipelineIds = result.data.map((doc) => doc.pipelineId.toHexString()).filter((id, index, self) => self.indexOf(id) === index);
    const stageIds = result.data.map((doc) => doc.stageId.toHexString()).filter((id, index, self) => self.indexOf(id) === index);
    const companyIds = result.data.map((doc) => doc.companyId?.toHexString()).filter((id): id is string => id !== undefined);
    const contactIds = result.data.map((doc) => doc.contactId?.toHexString()).filter((id): id is string => id !== undefined);
    const ownerIds = result.data.map((doc) => doc.ownerId.toHexString()).filter((id, index, self) => self.indexOf(id) === index);
    const dealIds = result.data.map((doc) => doc._id.toHexString());

    const [pipelines, stages, companies, contacts, owners, summaries] = await Promise.all([
      pipelineIds.length > 0 ? this.repository.getPipelines(pipelineIds) : Promise.resolve(new Map()),
      stageIds.length > 0 ? this.repository.getStages(stageIds) : Promise.resolve(new Map()),
      companyIds.length > 0 ? this.repository.getCompanies(companyIds) : Promise.resolve(new Map()),
      contactIds.length > 0 ? this.repository.getContacts(contactIds) : Promise.resolve(new Map()),
      ownerIds.length > 0 ? this.repository.getUsers(ownerIds) : Promise.resolve(new Map()),
      dealIds.length > 0 ? this.repository.getSummaries(dealIds) : Promise.resolve(new Map()),
    ]);

    const data = result.data.map((doc) => {
      const pipeline = pipelines.get(doc.pipelineId.toHexString());
      const stage = stages.get(doc.stageId.toHexString());
      const company = doc.companyId ? companies.get(doc.companyId.toHexString()) : undefined;
      const contact = doc.contactId ? contacts.get(doc.contactId.toHexString()) : undefined;
      const owner = owners.get(doc.ownerId.toHexString());
      const summary = summaries.get(doc._id.toHexString());
      return this.repository.toResponse(doc, pipeline ?? undefined, stage ?? undefined, company ?? undefined, contact ?? undefined, owner ?? undefined, summary);
    });

    const filteredData = data.filter((deal): deal is DealResponse => deal !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateDealInput): Promise<DealResponse> {
    const deal = await this.repository.create({
      organizationId,
      name: input.name,
      pipelineId: input.pipelineId,
      stageId: input.stageId,
      companyId: toObjectId(input.companyId),
      contactId: toObjectId(input.contactId),
      ownerId: toObjectId(input.ownerId) || new ObjectId(userId),
      amount: input.amount,
      currency: input.currency,
      probability: input.probability,
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
      source: input.source || undefined,
      customFields: input.customFields || {},
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(deal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary)!;
  }

  async getById(id: string, organizationId: string): Promise<DealResponse | null> {
    const deal = await this.repository.findById(id, organizationId);
    if (!deal) return null;

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(deal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary);
  }

  async getDetail(id: string, organizationId: string): Promise<DealDetailResponse | null> {
    const deal = await this.repository.findById(id, organizationId);
    if (!deal) return null;

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toDetailResponse(deal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateDealInput): Promise<DealResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const deal = await this.repository.update(id, organizationId, {
      ...input,
      pipelineId: input.pipelineId ? new ObjectId(input.pipelineId) : undefined,
      stageId: input.stageId ? new ObjectId(input.stageId) : undefined,
      companyId: toObjectId(input.companyId),
      contactId: toObjectId(input.contactId),
      ownerId: toObjectId(input.ownerId),
      expectedCloseDate: input.expectedCloseDate ? new Date(input.expectedCloseDate) : undefined,
      updatedBy: new ObjectId(userId),
    });

    if (!deal) return null;

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(deal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Deal not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'deal.deleted',
      entityType: 'deal',
      entityId: id,
      before: {
        name: existing.name,
        status: existing.status,
        amount: existing.amount,
      },
    });
  }

  async changeStage(id: string, organizationId: string, userId: string, input: ChangeStageInput, c: any): Promise<DealResponse> {
    const deal = await this.repository.findById(id, organizationId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const stage = await this.repository.getStage(input.stageId);
    if (!stage) {
      throw new Error('Stage not found');
    }

    const pipeline = await this.repository.getPipeline(deal.pipelineId.toHexString());
    if (!pipeline) {
      throw new Error('Pipeline not found');
    }

    let status = deal.status;
    if (stage.isWon) status = 'won';
    else if (stage.isLost) status = 'lost';
    else status = 'open';

    const updatedDeal = await this.repository.update(id, organizationId, {
      stageId: new ObjectId(input.stageId),
      probability: stage.probability,
      status,
      updatedBy: new ObjectId(userId),
    });

    if (!updatedDeal) {
      throw new Error('Failed to update deal stage');
    }

    await auditLog(c, {
      action: 'deal.stage_changed',
      entityType: 'deal',
      entityId: id,
      after: {
        stageId: input.stageId,
        stageName: stage.name,
        probability: stage.probability,
        status,
      },
    });

    const [company, contact, owner, summary] = await Promise.all([
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(updatedDeal, pipeline || undefined, stage, company || undefined, contact || undefined, owner || undefined, summary)!;
  }

  async markWon(id: string, organizationId: string, userId: string, input: MarkWonInput, c: any): Promise<DealResponse> {
    const deal = await this.repository.findById(id, organizationId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const now = input.wonAt ? new Date(input.wonAt) : new Date();

    const updatedDeal = await this.repository.update(id, organizationId, {
      status: 'won',
      wonAt: now,
      updatedBy: new ObjectId(userId),
    });

    if (!updatedDeal) {
      throw new Error('Failed to mark deal as won');
    }

    await auditLog(c, {
      action: 'deal.won',
      entityType: 'deal',
      entityId: id,
      after: {
        wonAt: now.toISOString(),
      },
    });

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(updatedDeal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary)!;
  }

  async markLost(id: string, organizationId: string, userId: string, input: MarkLostInput, c: any): Promise<DealResponse> {
    const deal = await this.repository.findById(id, organizationId);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const now = new Date();

    const updatedDeal = await this.repository.update(id, organizationId, {
      status: 'lost',
      lostReason: input.reason,
      lostAt: now,
      updatedBy: new ObjectId(userId),
    });

    if (!updatedDeal) {
      throw new Error('Failed to mark deal as lost');
    }

    await auditLog(c, {
      action: 'deal.lost',
      entityType: 'deal',
      entityId: id,
      after: {
        lostReason: input.reason,
        lostAt: now.toISOString(),
      },
    });

    const [pipeline, stage, company, contact, owner, summary] = await Promise.all([
      this.repository.getPipeline(deal.pipelineId.toHexString()),
      this.repository.getStage(deal.stageId.toHexString()),
      deal.companyId ? this.repository.getCompany(deal.companyId.toHexString()) : Promise.resolve(undefined),
      deal.contactId ? this.repository.getContact(deal.contactId.toHexString()) : Promise.resolve(undefined),
      this.repository.getUser(deal.ownerId.toHexString()),
      this.repository.getSummary(deal._id.toHexString()),
    ]);

    return this.repository.toResponse(updatedDeal, pipeline || undefined, stage || undefined, company || undefined, contact || undefined, owner || undefined, summary)!;
  }
}
