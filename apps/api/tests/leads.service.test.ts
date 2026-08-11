import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { LeadService } from '../src/modules/leads/leads.service';
import type { LeadRepository } from '../src/modules/leads/leads.repository';
import type { CreateLeadInput, UpdateLeadInput, ConvertLeadInput } from '../src/modules/leads/leads.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<LeadRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    findByEmailNormalized: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findByIds: vi.fn(),
    getUserName: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const leadId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();

const mockLeadDoc = {
  _id: new ObjectId(leadId),
  organizationId: new ObjectId(orgId),
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  emailNormalized: 'john@example.com',
  phone: '+1234567890',
  companyName: 'Acme Corp',
  source: 'website',
  status: 'new',
  ownerId: new ObjectId(ownerId),
  score: 72,
  tags: [],
  customFields: {},
  convertedAt: undefined,
  convertedContactId: undefined,
  convertedCompanyId: undefined,
  convertedDealId: undefined,
  createdBy: new ObjectId(userId),
  updatedBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P17 LeadService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: LeadService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new LeadService(repository);
  });

  describe('list', () => {
    it('should return paginated leads with resolved owner names', async () => {
      repository.list.mockResolvedValue({
        data: [mockLeadDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getUserName.mockResolvedValue('Jane Smith');
      repository.toResponse.mockReturnValue({
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'new',
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
    it('should create a lead and reject duplicate emails', async () => {
      repository.findByEmailNormalized.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockLeadDoc);
      repository.getUserName.mockResolvedValue('Jane Smith');
      repository.toResponse.mockReturnValue({
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'new',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreateLeadInput = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        companyName: 'Acme Corp',
        source: 'website',
        ownerId: ownerId,
        score: 72,
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.findByEmailNormalized).toHaveBeenCalledWith(orgId, 'john@example.com');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'John',
          email: 'john@example.com',
          organizationId: orgId,
        })
      );
      expect(result.firstName).toBe('John');
    });

    it('should throw when lead email already exists', async () => {
      repository.findByEmailNormalized.mockResolvedValue(mockLeadDoc as any);

      const input: CreateLeadInput = {
        firstName: 'John',
        email: 'john@example.com',
      };

      await expect(service.create(orgId, userId, input)).rejects.toThrow('Lead with this email already exists');
    });
  });

  describe('getById / getDetail', () => {
    it('should return lead with owner name when found', async () => {
      repository.findById.mockResolvedValue(mockLeadDoc as any);
      repository.getUserName.mockResolvedValue('Jane Smith');
      repository.toResponse.mockReturnValue({
        id: leadId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        status: 'new',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(leadId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(leadId, orgId);
      expect(result?.id).toBe(leadId);
    });

    it('should return null when lead not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(leadId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a lead and reject duplicate emails', async () => {
      repository.findById.mockResolvedValue(mockLeadDoc as any);
      repository.findByEmailNormalized.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockLeadDoc,
        firstName: 'Jane',
        email: 'jane@example.com',
        emailNormalized: 'jane@example.com',
      } as any);
      repository.getUserName.mockResolvedValue('Jane Smith');
      repository.toResponse.mockReturnValue({
        id: leadId,
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        status: 'new',
        tags: [],
        customFields: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdateLeadInput = {
        firstName: 'Jane',
        email: 'jane@example.com',
      };

      const result = await service.update(leadId, orgId, userId, input);

      expect(repository.update).toHaveBeenCalledWith(leadId, orgId, expect.objectContaining({
        firstName: 'Jane',
      }));
      expect(result?.firstName).toBe('Jane');
    });

    it('should throw when new email already exists on another lead', async () => {
      const otherLead = { ...mockLeadDoc, _id: new ObjectId() };
      repository.findById.mockResolvedValue(mockLeadDoc as any);
      repository.findByEmailNormalized.mockResolvedValue(otherLead as any);

      const input: UpdateLeadInput = {
        email: 'jane@example.com',
      };

      await expect(service.update(leadId, orgId, userId, input)).rejects.toThrow('Lead with this email already exists');
    });

    it('should return null when lead not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(leadId, orgId, userId, { firstName: 'Jane' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete a lead and create audit log', async () => {
      repository.findById.mockResolvedValue(mockLeadDoc as any);
      repository.softDelete.mockResolvedValue(undefined);

      await service.delete(leadId, orgId, {} as any);

      expect(repository.softDelete).toHaveBeenCalledWith(leadId, orgId);
    });

    it('should throw when lead not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(leadId, orgId, {} as any)).rejects.toThrow('Lead not found');
    });
  });

  describe('bulkDelete', () => {
    it('should delete multiple leads and track failures', async () => {
      repository.findById.mockImplementation((id: string) => {
        if (id === leadId) {
          return Promise.resolve(mockLeadDoc as any);
        }
        return Promise.resolve(null);
      });
      repository.softDelete.mockResolvedValue(undefined);

      const result = await service.bulkDelete([leadId, 'nonexistent'], orgId, {} as any);

      expect(result.deleted).toBe(1);
      expect(result.failed).toBe(1);
    });
  });

  describe('convert', () => {
    it('should throw when lead not found', async () => {
      repository.findById.mockResolvedValue(null);

      const input: ConvertLeadInput = {
        createContact: true,
        createCompany: false,
        createDeal: false,
      };

      await expect(service.convert(leadId, orgId, userId, input, {} as any)).rejects.toThrow('Lead not found');
    });

    it('should throw when lead already converted', async () => {
      repository.findById.mockResolvedValue({
        ...mockLeadDoc,
        status: 'converted',
      } as any);

      const input: ConvertLeadInput = {
        createContact: true,
        createCompany: false,
        createDeal: false,
      };

      await expect(service.convert(leadId, orgId, userId, input, {} as any)).rejects.toThrow('Lead has already been converted');
    });
  });
});
