import { ObjectId } from 'mongodb';
import { ContactRepository } from './contacts.repository';
import type { CreateContactInput, UpdateContactInput, ContactResponse, ContactListResponse, ContactListQuery } from './contacts.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class ContactService {
  constructor(private repository: ContactRepository) {}

  async list(organizationId: string, params: ContactListQuery): Promise<ContactListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      search: params.search,
      status: params.status,
      ownerId: params.ownerId,
      companyId: params.companyId,
      source: params.source,
      tagId: params.tagId,
      sort,
      direction,
    });

    const companyIds = result.data.map((doc) => doc.companyId).filter((id): id is ObjectId => id !== undefined && id !== null);
    const ownerIds = result.data.map((doc) => doc.ownerId).filter((id): id is ObjectId => id !== undefined && id !== null);

    const [companyNames, ownerNames] = await Promise.all([
      companyIds.length > 0 ? this.repository.getCompanyNames(companyIds) : Promise.resolve(new Map()),
      ownerIds.length > 0 ? this.repository.getUserNames(ownerIds) : Promise.resolve(new Map()),
    ]);

    const data = result.data.map((doc) => {
      const companyName = doc.companyId ? companyNames.get(doc.companyId.toHexString()) : undefined;
      const ownerName = doc.ownerId ? ownerNames.get(doc.ownerId.toHexString()) : undefined;
      return this.repository.toResponse(doc, companyName, ownerName);
    });

    const filteredData = data.filter((contact): contact is ContactResponse => contact !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateContactInput): Promise<ContactResponse> {
    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    if (emailNormalized) {
      const existing = await this.repository.findByEmailNormalized(organizationId, emailNormalized);
      if (existing) {
        throw new Error('Contact with this email already exists');
      }
    }

    const contact = await this.repository.create({
      organizationId,
      firstName: input.firstName,
      lastName: input.lastName || undefined,
      email: input.email || undefined,
      emailNormalized,
      phone: input.phone || undefined,
      companyId: toObjectId(input.companyId),
      jobTitle: input.jobTitle || undefined,
      ownerId: toObjectId(input.ownerId),
      status: 'active',
      source: input.source || undefined,
      tags: (input.tags || []).map((id) => new ObjectId(id)),
      customFields: input.customFields || {},
      address: input.address || undefined,
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const [companyName, ownerName] = await Promise.all([
      contact.companyId ? this.repository.getCompanyName(contact.companyId) : Promise.resolve(undefined),
      contact.ownerId ? this.repository.getUserName(contact.ownerId) : Promise.resolve(undefined),
    ]);

    return this.repository.toResponse(contact, companyName, ownerName)!;
  }

  async getById(id: string, organizationId: string): Promise<ContactResponse | null> {
    const contact = await this.repository.findById(id, organizationId);
    if (!contact) return null;

    const [companyName, ownerName] = await Promise.all([
      contact.companyId ? this.repository.getCompanyName(contact.companyId) : Promise.resolve(undefined),
      contact.ownerId ? this.repository.getUserName(contact.ownerId) : Promise.resolve(undefined),
    ]);

    return this.repository.toResponse(contact, companyName, ownerName);
  }

  async getDetail(id: string, organizationId: string): Promise<ContactResponse | null> {
    const contact = await this.repository.findById(id, organizationId);
    if (!contact) return null;

    const [companyName, ownerName] = await Promise.all([
      contact.companyId ? this.repository.getCompanyName(contact.companyId) : Promise.resolve(undefined),
      contact.ownerId ? this.repository.getUserName(contact.ownerId) : Promise.resolve(undefined),
    ]);

    return this.repository.toDetailResponse(contact, companyName, ownerName);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateContactInput): Promise<ContactResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const emailNormalized = input.email ? input.email.toLowerCase().trim() : undefined;

    if (emailNormalized && emailNormalized !== existing.emailNormalized) {
      const duplicate = await this.repository.findByEmailNormalized(organizationId, emailNormalized);
      if (duplicate && duplicate._id.toHexString() !== id) {
        throw new Error('Contact with this email already exists');
      }
    }

    const contact = await this.repository.update(id, organizationId, {
      ...input,
      companyId: toObjectId(input.companyId),
      ownerId: toObjectId(input.ownerId),
      address: input.address || undefined,
      tags: input.tags ? input.tags.map((id) => new ObjectId(id)) : undefined,
      updatedBy: new ObjectId(userId),
    });

    if (!contact) return null;

    const [companyName, ownerName] = await Promise.all([
      contact.companyId ? this.repository.getCompanyName(contact.companyId) : Promise.resolve(undefined),
      contact.ownerId ? this.repository.getUserName(contact.ownerId) : Promise.resolve(undefined),
    ]);

    return this.repository.toResponse(contact, companyName, ownerName);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Contact not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'contact.deleted',
      entityType: 'contact',
      entityId: id,
      before: {
        firstName: existing.firstName,
        lastName: existing.lastName,
        email: existing.email,
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
          action: 'contact.deleted',
          entityType: 'contact',
          entityId: id,
          before: {
            firstName: existing.firstName,
            lastName: existing.lastName,
            email: existing.email,
          },
        });

        deleted++;
      } catch {
        failed++;
      }
    }

    return { deleted, failed };
  }
}
