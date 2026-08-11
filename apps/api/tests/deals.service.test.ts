import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { DealService } from '../src/modules/deals/deals.service';
import type { DealRepository } from '../src/modules/deals/deals.repository';
import type { CreateDealInput, UpdateDealInput, DealListQuery, ChangeStageInput, MarkWonInput, MarkLostInput } from '../src/modules/deals/deals.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<DealRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    getPipeline: vi.fn(),
    getStage: vi.fn(),
    getCompany: vi.fn(),
    getContact: vi.fn(),
    getUser: vi.fn(),
    getSummary: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const dealId = new ObjectId().toHexString();
const pipelineId = new ObjectId().toHexString();
const stageId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const contactId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();

const mockDealDoc = {
  _id: new ObjectId(dealId),
  organizationId: new ObjectId(orgId),
  name: 'Enterprise Contract',
  pipelineId: new ObjectId(pipelineId),
  stageId: new ObjectId(stageId),
  companyId: new ObjectId(companyId),
  contactId: new ObjectId(contactId),
  ownerId: new ObjectId(ownerId),
  amount: 2500000,
  currency: 'INR',
  probability: 40,
  expectedCloseDate: new Date('2026-10-31'),
  source: 'website',
  status: 'open' as const,
  lostReason: undefined,
  customFields: {},
  createdBy: new ObjectId(userId),
  updatedBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P19 DealService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: DealService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new DealService(repository);
  });

  describe('list', () => {
    it('should return paginated deals with resolved relations', async () => {
      repository.list.mockResolvedValue({
        data: [mockDealDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'open',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
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
    it('should create a deal', async () => {
      repository.create.mockResolvedValue(mockDealDoc);
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 0, tasks: 0, notes: 0, attachments: 0 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'open',
        summary: { activities: 0, tasks: 0, notes: 0, attachments: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreateDealInput = {
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        companyId,
        contactId,
        ownerId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        expectedCloseDate: '2026-10-31',
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Enterprise Contract',
          organizationId: orgId,
        })
      );
      expect(result.name).toBe('Enterprise Contract');
    });
  });

  describe('getById / getDetail', () => {
    it('should return deal with relations when found', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'open',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(dealId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(dealId, orgId);
      expect(result?.id).toBe(dealId);
    });

    it('should return null when deal not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(dealId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a deal', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.update.mockResolvedValue({
        ...mockDealDoc,
        name: 'Updated Deal',
      } as any);
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Updated Deal',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'open',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdateDealInput = {
        name: 'Updated Deal',
      };

      const result = await service.update(dealId, orgId, userId, input);

      expect(repository.update).toHaveBeenCalledWith(dealId, orgId, expect.objectContaining({
        name: 'Updated Deal',
      }));
      expect(result?.name).toBe('Updated Deal');
    });

    it('should return null when deal not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(dealId, orgId, userId, { name: 'Updated Deal' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should soft delete a deal and create audit log', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.softDelete.mockResolvedValue(undefined);

      await service.delete(dealId, orgId, {} as any);

      expect(repository.softDelete).toHaveBeenCalledWith(dealId, orgId);
    });

    it('should throw when deal not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(dealId, orgId, {} as any)).rejects.toThrow('Deal not found');
    });
  });

  describe('changeStage', () => {
    it('should change deal stage and calculate status', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.getStage.mockResolvedValue({ id: stageId, name: 'Qualified', order: 1, probability: 40, isWon: false, isLost: false });
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.update.mockResolvedValue({
        ...mockDealDoc,
        stageId: new ObjectId(stageId),
        probability: 40,
        status: 'open',
      } as any);
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'open',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: ChangeStageInput = { stageId };
      const result = await service.changeStage(dealId, orgId, userId, input, {} as any);

      expect(repository.update).toHaveBeenCalledWith(dealId, orgId, expect.objectContaining({
        stageId: new ObjectId(stageId),
        probability: 40,
        status: 'open',
      }));
      expect(result.status).toBe('open');
    });

    it('should set status to won when stage is won', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.getStage.mockResolvedValue({ id: stageId, name: 'Closed Won', order: 5, probability: 100, isWon: true, isLost: false });
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.update.mockResolvedValue({
        ...mockDealDoc,
        status: 'won',
      } as any);
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 100,
        status: 'won',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: ChangeStageInput = { stageId };
      const result = await service.changeStage(dealId, orgId, userId, input, {} as any);

      expect(result.status).toBe('won');
    });

    it('should throw when stage not found', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.getStage.mockResolvedValue(null);

      const input: ChangeStageInput = { stageId: 'nonexistent' };
      await expect(service.changeStage(dealId, orgId, userId, input, {} as any)).rejects.toThrow('Stage not found');
    });
  });

  describe('markWon', () => {
    it('should mark deal as won', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.update.mockResolvedValue({
        ...mockDealDoc,
        status: 'won',
        wonAt: new Date(),
      } as any);
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'won',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: MarkWonInput = {};
      const result = await service.markWon(dealId, orgId, userId, input, {} as any);

      expect(result.status).toBe('won');
    });
  });

  describe('markLost', () => {
    it('should mark deal as lost with reason', async () => {
      repository.findById.mockResolvedValue(mockDealDoc as any);
      repository.update.mockResolvedValue({
        ...mockDealDoc,
        status: 'lost',
        lostReason: 'Budget unavailable',
        lostAt: new Date(),
      } as any);
      repository.getPipeline.mockResolvedValue({ id: pipelineId, name: 'Sales Pipeline' });
      repository.getStage.mockResolvedValue({ id: stageId, name: 'New', order: 0, probability: 10, isWon: false, isLost: false });
      repository.getCompany.mockResolvedValue({ id: companyId, name: 'Acme Corp' });
      repository.getContact.mockResolvedValue({ id: contactId, name: 'John Doe' });
      repository.getUser.mockResolvedValue({ id: ownerId, name: 'Jane Smith' });
      repository.getSummary.mockResolvedValue({ activities: 5, tasks: 3, notes: 2, attachments: 1 });
      repository.toResponse.mockReturnValue({
        id: dealId,
        name: 'Enterprise Contract',
        pipelineId,
        stageId,
        amount: 2500000,
        currency: 'INR',
        probability: 40,
        status: 'lost',
        lostReason: 'Budget unavailable',
        summary: { activities: 5, tasks: 3, notes: 2, attachments: 1 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: MarkLostInput = { reason: 'Budget unavailable' };
      const result = await service.markLost(dealId, orgId, userId, input, {} as any);

      expect(result.status).toBe('lost');
      expect(result.lostReason).toBe('Budget unavailable');
    });
  });
});
