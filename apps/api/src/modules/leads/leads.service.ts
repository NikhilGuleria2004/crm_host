import { ObjectId } from 'mongodb';
import { LeadRepository } from './leads.repository';
import type { CreateLeadInput, UpdateLeadInput, LeadResponse, LeadListResponse, LeadListQuery, ConvertLeadInput, ConvertLeadResponse } from './leads.types';
import { collections } from '../../db/collections';
import { auditLog } from '../../middleware/audit';
import { createQueue } from '../../queue/factory';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class LeadService {
  constructor(private repository: LeadRepository) {}

  async list(organizationId: string, params: LeadListQuery): Promise<LeadListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      search: params.search,
      status: params.status,
      ownerId: params.ownerId,
      source: params.source,
      score: params.score,
      sort,
      direction,
    });

    const ownerIds = result.data.map((doc) => doc.ownerId).filter((id): id is ObjectId => id !== undefined && id !== null);
    const ownerNames = ownerIds.length > 0 ? await this.repository.getUserNames(ownerIds) : new Map();

    const data = result.data.map((doc) => {
      const ownerName = doc.ownerId ? ownerNames.get(doc.ownerId.toHexString()) : undefined;
      return this.repository.toResponse(doc, ownerName);
    });

    const filteredData = data.filter((lead): lead is LeadResponse => lead !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateLeadInput): Promise<LeadResponse> {
    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    if (emailNormalized) {
      const existing = await this.repository.findByEmailNormalized(organizationId, emailNormalized);
      if (existing) {
        throw new Error('Lead with this email already exists');
      }
    }

    const lead = await this.repository.create({
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName || undefined,
      email: input.email || undefined,
      emailNormalized,
      phone: input.phone || undefined,
      companyName: input.companyName || undefined,
      source: input.source || undefined,
      status: input.status || 'new',
      ownerId: toObjectId(input.ownerId),
      score: input.score || undefined,
      tags: (input.tags || []).map((id) => new ObjectId(id)),
      customFields: input.customFields || {},
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const ownerName = lead.ownerId ? await this.repository.getUserName(lead.ownerId) : undefined;
    return this.repository.toResponse(lead, ownerName)!;
  }

  async getById(id: string, organizationId: string): Promise<LeadResponse | null> {
    const lead = await this.repository.findById(id, organizationId);
    if (!lead) return null;

    const ownerName = lead.ownerId ? await this.repository.getUserName(lead.ownerId) : undefined;
    return this.repository.toResponse(lead, ownerName);
  }

  async getDetail(id: string, organizationId: string): Promise<LeadResponse | null> {
    const lead = await this.repository.findById(id, organizationId);
    if (!lead) return null;

    const ownerName = lead.ownerId ? await this.repository.getUserName(lead.ownerId) : undefined;
    return this.repository.toDetailResponse(lead, ownerName);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateLeadInput): Promise<LeadResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    if (emailNormalized && emailNormalized !== existing.emailNormalized) {
      const duplicate = await this.repository.findByEmailNormalized(organizationId, emailNormalized);
      if (duplicate && duplicate._id.toHexString() !== id) {
        throw new Error('Lead with this email already exists');
      }
    }

    const lead = await this.repository.update(id, organizationId, {
      ...input,
      ownerId: toObjectId(input.ownerId),
      tags: input.tags ? input.tags.map((id) => new ObjectId(id)) : undefined,
      updatedBy: new ObjectId(userId),
    });

    if (!lead) return null;

    const ownerName = lead.ownerId ? await this.repository.getUserName(lead.ownerId) : undefined;
    return this.repository.toResponse(lead, ownerName);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Lead not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'lead.deleted',
      entityType: 'lead',
      entityId: id,
      before: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
        status: existing.status,
      },
    });
  }

  async bulkDelete(ids: string[], organizationId: string, c: any): Promise<{ deleted: number; failed: number }> {
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        const existing = await this.repository.findById(id, organizationId);
        if (!existing) {
          failed++;
          continue;
        }

        await this.repository.softDelete(id, organizationId);

        await auditLog(c, {
          action: 'lead.deleted',
          entityType: 'lead',
          entityId: id,
          before: {
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email,
            status: existing.status,
          },
        });

        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }

  async convert(id: string, organizationId: string, userId: string, input: ConvertLeadInput, c: any): Promise<ConvertLeadResponse> {
    const lead = await this.repository.findById(id, organizationId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    if (lead.status === 'converted') {
      throw new Error('Lead has already been converted');
    }

    const convertedAt = new Date();
    const response: ConvertLeadResponse = {
      lead: {
        id: lead._id.toHexString(),
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        source: lead.source,
        status: 'converted',
        owner: lead.ownerId ? { id: lead.ownerId.toHexString(), name: '' } : undefined,
        score: lead.score,
        tags: lead.tags.map((tagId) => tagId.toHexString()),
        customFields: lead.customFields,
        convertedAt: convertedAt.toISOString(),
        createdAt: lead.createdAt.toISOString(),
        updatedAt: convertedAt.toISOString(),
      },
      contact: undefined,
      company: undefined,
      deal: undefined,
    };

    if (input.createContact) {
      const contactResult = await collections.contacts().insertOne({
        organizationId: new ObjectId(organizationId),
        firstName: lead.firstName,
        lastName: lead.lastName,
        email: lead.email,
        phone: lead.phone,
        status: 'active',
        createdBy: new ObjectId(userId),
        updatedBy: new ObjectId(userId),
        createdAt: convertedAt,
        updatedAt: convertedAt,
      } as any);
      const contactDoc = await collections.contacts().findOne({ _id: contactResult.insertedId });
      response.contact = {
        id: contactDoc!._id.toHexString(),
        firstName: (contactDoc as any).firstName,
        lastName: (contactDoc as any).lastName,
        email: (contactDoc as any).email,
      };
      response.lead.convertedContactId = contactDoc!._id.toHexString();
    }

    if (input.createCompany && lead.companyName) {
      const companyResult = await collections.companies().insertOne({
        organizationId: new ObjectId(organizationId),
        name: lead.companyName,
        status: 'active',
        createdBy: new ObjectId(userId),
        updatedBy: new ObjectId(userId),
        createdAt: convertedAt,
        updatedAt: convertedAt,
      } as any);
      const companyDoc = await collections.companies().findOne({ _id: companyResult.insertedId });
      response.company = {
        id: companyDoc!._id.toHexString(),
        name: (companyDoc as any).name,
      };
      response.lead.convertedCompanyId = companyDoc!._id.toHexString();
    }

    if (input.createDeal && input.deal) {
      const dealResult = await collections.deals().insertOne({
        organizationId: new ObjectId(organizationId),
        name: input.deal.name,
        pipelineId: new ObjectId(input.deal.pipelineId),
        stageId: new ObjectId(input.deal.stageId),
        status: 'open',
        amount: input.deal.amount,
        currency: input.deal.currency,
        createdBy: new ObjectId(userId),
        updatedBy: new ObjectId(userId),
        createdAt: convertedAt,
        updatedAt: convertedAt,
      } as any);
      const dealDoc = await collections.deals().findOne({ _id: dealResult.insertedId });
      response.deal = {
        id: dealDoc!._id.toHexString(),
        name: (dealDoc as any).name,
      };
      response.lead.convertedDealId = dealDoc!._id.toHexString();
    }

    await this.repository.update(id, organizationId, {
      status: 'converted',
      convertedAt,
      convertedContactId: response.lead.convertedContactId ? new ObjectId(response.lead.convertedContactId) : undefined,
      convertedCompanyId: response.lead.convertedCompanyId ? new ObjectId(response.lead.convertedCompanyId) : undefined,
      convertedDealId: response.lead.convertedDealId ? new ObjectId(response.lead.convertedDealId) : undefined,
      updatedBy: new ObjectId(userId),
    });

    await collections.activities().insertOne({
      organizationId: new ObjectId(organizationId),
      type: 'note',
      subject: 'Lead converted',
      description: `Lead ${lead.firstName} ${lead.lastName} was converted to ${response.contact ? 'contact' : ''}${response.company && response.contact ? ', ' : ''}${response.company ? 'company' : ''}${response.deal ? ', and deal' : ''}.`,
      occurredAt: convertedAt,
      leadId: lead._id,
      contactId: response.contact ? new ObjectId(response.contact.id) : undefined,
      companyId: response.company ? new ObjectId(response.company.id) : undefined,
      dealId: response.deal ? new ObjectId(response.deal.id) : undefined,
      createdBy: new ObjectId(userId),
      createdAt: convertedAt,
      updatedAt: convertedAt,
    } as any);

    await createQueue().enqueue({
      version: 1,
      type: 'outbox',
      payload: {
        jobId: `lead.converted:${lead._id.toHexString()}`,
        organizationId: organizationId,
        type: 'lead.converted',
        entityType: 'lead',
        entityId: lead._id.toHexString(),
        requestId: c.get('requestId'),
        payload: {
          leadId: lead._id.toHexString(),
          contactId: response.lead.convertedContactId,
          companyId: response.lead.convertedCompanyId,
          dealId: response.lead.convertedDealId,
          convertedAt: convertedAt.toISOString(),
        },
      },
    });

    await auditLog(c, {
      action: 'lead.converted',
      entityType: 'lead',
      entityId: lead._id.toHexString(),
      after: {
        status: 'converted',
        convertedAt: convertedAt.toISOString(),
        contactId: response.lead.convertedContactId,
        companyId: response.lead.convertedCompanyId,
        dealId: response.lead.convertedDealId,
      },
    });

    return response;
  }
}
