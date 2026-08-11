import { ObjectId } from 'mongodb';
import { CompanyRepository } from './companies.repository';
import type { CreateCompanyInput, UpdateCompanyInput, CompanyResponse, CompanyListResponse, CompanyListQuery } from './companies.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class CompanyService {
  constructor(private repository: CompanyRepository) {}

  async list(organizationId: string, params: CompanyListQuery): Promise<CompanyListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      search: params.search,
      industry: params.industry,
      ownerId: params.ownerId,
      status: params.status,
      sort,
      direction,
    });

    const data = await Promise.all(
      result.data.map(async (doc) => {
        const ownerName = doc.ownerId ? await this.repository.getUserName(doc.ownerId) : undefined;
        return this.repository.toResponse(doc, ownerName);
      })
    );

    const filteredData = data.filter((company): company is CompanyResponse => company !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateCompanyInput): Promise<CompanyResponse> {
    const normalizedName = input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

    const existing = await this.repository.findByNormalizedName(organizationId, normalizedName);
    if (existing) {
      throw new Error('Company with this name already exists');
    }

    const company = await this.repository.create({
      organizationId,
      name: input.name,
      normalizedName,
      website: input.website || undefined,
      email: input.email || undefined,
      phone: input.phone || undefined,
      industry: input.industry || undefined,
      employeeCount: input.employeeCount || undefined,
      annualRevenue: input.annualRevenue || undefined,
      ownerId: toObjectId(input.ownerId),
      status: input.status || 'active',
      description: input.description || undefined,
      tags: (input.tags || []).map((id) => new ObjectId(id)),
      customFields: input.customFields || {},
      address: input.address || undefined,
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const ownerName = company.ownerId ? await this.repository.getUserName(company.ownerId) : undefined;
    return this.repository.toResponse(company, ownerName)!;
  }

  async getById(id: string, organizationId: string): Promise<CompanyResponse | null> {
    const company = await this.repository.findById(id, organizationId);
    if (!company) return null;

    const [ownerName, contactsCount, openDeals] = await Promise.all([
      company.ownerId ? this.repository.getUserName(company.ownerId) : Promise.resolve(undefined),
      this.repository.getContactCount(company._id),
      this.repository.getOpenDealsCount(company._id),
    ]);

    return this.repository.toDetailResponse(company, ownerName, contactsCount, openDeals);
  }

  async getDetail(id: string, organizationId: string): Promise<CompanyResponse | null> {
    const company = await this.repository.findById(id, organizationId);
    if (!company) return null;

    const [ownerName, contactsCount, openDeals] = await Promise.all([
      company.ownerId ? this.repository.getUserName(company.ownerId) : Promise.resolve(undefined),
      this.repository.getContactCount(company._id),
      this.repository.getOpenDealsCount(company._id),
    ]);

    return this.repository.toDetailResponse(company, ownerName, contactsCount, openDeals);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateCompanyInput): Promise<CompanyResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const normalizedName = input.name ? input.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : undefined;

    if (normalizedName && normalizedName !== existing.normalizedName) {
      const duplicate = await this.repository.findByNormalizedName(organizationId, normalizedName);
      if (duplicate && duplicate._id.toHexString() !== id) {
        throw new Error('Company with this name already exists');
      }
    }

    const company = await this.repository.update(id, organizationId, {
      ...input,
      normalizedName: normalizedName || existing.normalizedName,
      ownerId: toObjectId(input.ownerId),
      tags: input.tags ? input.tags.map((id) => new ObjectId(id)) : undefined,
      address: input.address || undefined,
      updatedBy: new ObjectId(userId),
    });

    if (!company) return null;

    const ownerName = company.ownerId ? await this.repository.getUserName(company.ownerId) : undefined;
    return this.repository.toResponse(company, ownerName);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Company not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'company.deleted',
      entityType: 'company',
      entityId: id,
      before: {
        name: existing.name,
        industry: existing.industry,
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
          action: 'company.deleted',
          entityType: 'company',
          entityId: id,
          before: {
            name: existing.name,
            industry: existing.industry,
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
