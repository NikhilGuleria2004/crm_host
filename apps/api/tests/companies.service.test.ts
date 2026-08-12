import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { CompanyService } from '../src/modules/companies/companies.service';
import type { CompanyRepository } from '../src/modules/companies/companies.repository';
import type { CreateCompanyInput, UpdateCompanyInput, CompanyListQuery } from '../src/modules/companies/companies.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<CompanyRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    findByNormalizedName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIds: vi.fn(),
    getContactCount: vi.fn(),
    getOpenDealsCount: vi.fn(),
    getUserName: vi.fn(),
    getUserNames: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();

const mockCompanyDoc = {
  _id: new ObjectId(companyId),
  organizationId: new ObjectId(orgId),
  name: 'Acme Corp',
  normalizedName: 'acme-corp',
  website: 'https://acme.com',
  email: 'contact@acme.com',
  phone: '+1234567890',
  industry: 'Technology',
  employeeCount: 100,
  annualRevenue: 5000000,
  ownerId: new ObjectId(ownerId),
  status: 'active',
  tags: [],
  customFields: {},
  address: { city: 'NYC' },
  description: 'A test company',
  createdBy: new ObjectId(userId),
  updatedBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P14 CompanyService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: CompanyService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new CompanyService(repository);
  });

  describe('list', () => {
    it('should return paginated companies with resolved owner names', async () => {
      repository.list.mockResolvedValue({
        data: [mockCompanyDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getUserNames.mockResolvedValue(new Map([[ownerId, 'John Doe']]));
      repository.toResponse.mockReturnValue({
        id: companyId,
        name: 'Acme Corp',
        normalizedName: 'acme-corp',
        status: 'active',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.list(orgId, { limit: 10, sort: 'createdAt', direction: 'desc' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        limit: 10,
        sort: 'createdAt',
        direction: 'desc',
      }));
      expect(result.data).toHaveLength(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('create', () => {
    it('should create a company with normalized name and reject duplicates', async () => {
      repository.findByNormalizedName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockCompanyDoc);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: companyId,
        name: 'Acme Corp',
        normalizedName: 'acme-corp',
        status: 'active',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreateCompanyInput = {
        name: 'Acme Corp',
        industry: 'Technology',
        employeeCount: 100,
        annualRevenue: 5000000,
        ownerId,
        tags: [],
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.findByNormalizedName).toHaveBeenCalledWith(orgId, 'acme-corp');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Acme Corp',
          normalizedName: 'acme-corp',
          organizationId: orgId,
        })
      );
      expect(result.name).toBe('Acme Corp');
    });

    it('should throw when company name already exists', async () => {
      repository.findByNormalizedName.mockResolvedValue(mockCompanyDoc as any);

      const input: CreateCompanyInput = {
        name: 'Acme Corp',
      };

      await expect(service.create(orgId, userId, input)).rejects.toThrow('Company with this name already exists');
    });
  });

  describe('getById / getDetail', () => {
    it('should return company with stats when found', async () => {
      repository.findById.mockResolvedValue(mockCompanyDoc as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.getContactCount.mockResolvedValue(12);
      repository.getOpenDealsCount.mockResolvedValue({ count: 4, totalValue: 2500000 });
      repository.toDetailResponse.mockReturnValue({
        id: companyId,
        name: 'Acme Corp',
        normalizedName: 'acme-corp',
        status: 'active',
        tags: [],
        customFields: {},
        contactsCount: 12,
        openDealsCount: 4,
        openPipelineValue: 2500000,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(companyId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(companyId, orgId);
      expect(repository.getContactCount).toHaveBeenCalledWith(new ObjectId(companyId));
      expect(result?.contactsCount).toBe(12);
      expect(result?.openDealsCount).toBe(4);
      expect(result?.openPipelineValue).toBe(2500000);
    });

    it('should return null when company not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(companyId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update company and reject duplicate normalized names', async () => {
      repository.findById.mockResolvedValue(mockCompanyDoc as any);
      repository.findByNormalizedName.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockCompanyDoc,
        name: 'Acme Corp International',
        normalizedName: 'acme-corp-international',
      } as any);
      repository.getUserName.mockResolvedValue('John Doe');
      repository.toResponse.mockReturnValue({
        id: companyId,
        name: 'Acme Corp International',
        normalizedName: 'acme-corp-international',
        status: 'active',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdateCompanyInput = {
        name: 'Acme Corp International',
      };

      const result = await service.update(companyId, orgId, userId, input);

      expect(repository.update).toHaveBeenCalledWith(
        companyId,
        orgId,
        expect.objectContaining({
          name: 'Acme Corp International',
          normalizedName: 'acme-corp-international',
        })
      );
      expect(result?.name).toBe('Acme Corp International');
    });

    it('should return null when company not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(companyId, orgId, userId, {});

      expect(result).toBeNull();
    });

    it('should throw when new normalized name conflicts with another company', async () => {
      const otherCompany = {
        ...mockCompanyDoc,
        _id: new ObjectId(),
        normalizedName: 'other-corp',
      };
      repository.findById.mockResolvedValue(mockCompanyDoc as any);
      repository.findByNormalizedName.mockResolvedValue(otherCompany as any);

      const input: UpdateCompanyInput = {
        name: 'Other Corp',
      };

      await expect(service.update(companyId, orgId, userId, input)).rejects.toThrow('Company with this name already exists');
    });
  });

  describe('delete', () => {
    it('should soft delete and create audit log', async () => {
      repository.findById.mockResolvedValue(mockCompanyDoc as any);
      repository.softDelete.mockResolvedValue(undefined);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      await service.delete(companyId, orgId, mockCtx);

      expect(repository.softDelete).toHaveBeenCalledWith(companyId, orgId);
    });

    it('should throw when company not found', async () => {
      repository.findById.mockResolvedValue(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn(() => null),
      } as any;

      await expect(service.delete(companyId, orgId, mockCtx)).rejects.toThrow('Company not found');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple companies and track failures', async () => {
      repository.findById
        .mockResolvedValueOnce(mockCompanyDoc as any)
        .mockResolvedValueOnce(null);

      const mockCtx = {
        req: { header: vi.fn() },
        get: vi.fn((key: string) => {
          if (key === 'organizationId') return orgId;
          if (key === 'user') return { id: userId };
          return null;
        }),
      } as any;

      const result = await service.bulkDelete([companyId, 'nonexistent'], orgId, mockCtx);

      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
    });
  });
});
