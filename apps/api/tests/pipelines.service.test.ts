import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { PipelineService } from '../src/modules/pipelines/pipelines.service';
import type { PipelineRepository } from '../src/modules/pipelines/pipelines.repository';
import type { CreatePipelineInput, UpdatePipelineInput, PipelineListQuery, CreatePipelineStageInput, UpdatePipelineStageInput } from '../src/modules/pipelines/pipelines.types';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<PipelineRepository> {
  return {
    list: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    unsetDefault: vi.fn(),
    getStages: vi.fn(),
    createStage: vi.fn(),
    updateStage: vi.fn(),
    deleteStage: vi.fn(),
    countDealsByStage: vi.fn(),
    replaceDealStage: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
    toStageResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const pipelineId = new ObjectId().toHexString();
const stageId = new ObjectId().toHexString();

const mockPipelineDoc = {
  _id: new ObjectId(pipelineId),
  organizationId: new ObjectId(orgId),
  name: 'Sales Pipeline',
  description: 'Default sales pipeline',
  isDefault: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockStageDoc = {
  _id: new ObjectId(stageId),
  organizationId: new ObjectId(orgId),
  pipelineId: new ObjectId(pipelineId),
  name: 'New',
  order: 0,
  probability: 10,
  isWon: false,
  isLost: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('P18 PipelineService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: PipelineService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new PipelineService(repository);
  });

  describe('list', () => {
    it('should return paginated pipelines with stages', async () => {
      repository.list.mockResolvedValue({
        data: [mockPipelineDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getStages.mockResolvedValue([mockStageDoc]);
      repository.toResponse.mockReturnValue({
        id: pipelineId,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: [],
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
    it('should create a pipeline and unset other defaults when isDefault is true', async () => {
      repository.create.mockResolvedValue(mockPipelineDoc);
      repository.getStages.mockResolvedValue([mockStageDoc]);
      repository.toResponse.mockReturnValue({
        id: pipelineId,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: CreatePipelineInput = {
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
      };

      const result = await service.create(orgId, userId, input);

      expect(repository.unsetDefault).toHaveBeenCalledWith(orgId);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sales Pipeline',
          isDefault: true,
          organizationId: orgId,
        })
      );
      expect(result.name).toBe('Sales Pipeline');
    });
  });

  describe('getById / getDetail', () => {
    it('should return pipeline with stages when found', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.getStages.mockResolvedValue([mockStageDoc]);
      repository.toResponse.mockReturnValue({
        id: pipelineId,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const result = await service.getById(pipelineId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(pipelineId, orgId);
      expect(repository.getStages).toHaveBeenCalledWith(pipelineId);
      expect(result?.id).toBe(pipelineId);
    });

    it('should return null when pipeline not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(pipelineId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update a pipeline and unset other defaults when setting isDefault', async () => {
      repository.findById.mockResolvedValue({
        ...mockPipelineDoc,
        isDefault: false,
      } as any);
      repository.unsetDefault.mockResolvedValue(undefined);
      repository.update.mockResolvedValue({
        ...mockPipelineDoc,
        isDefault: true,
      } as any);
      repository.getStages.mockResolvedValue([mockStageDoc]);
      repository.toResponse.mockReturnValue({
        id: pipelineId,
        name: 'Sales Pipeline',
        description: 'Default sales pipeline',
        isDefault: true,
        stages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const input: UpdatePipelineInput = {
        isDefault: true,
      };

      const result = await service.update(pipelineId, orgId, userId, input);

      expect(repository.unsetDefault).toHaveBeenCalledWith(orgId);
      expect(repository.update).toHaveBeenCalledWith(pipelineId, orgId, expect.objectContaining({
        isDefault: true,
      }));
      expect(result?.isDefault).toBe(true);
    });

    it('should return null when pipeline not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(pipelineId, orgId, userId, { name: 'New Name' });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete a pipeline and create audit log', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.delete.mockResolvedValue(undefined);

      await service.delete(pipelineId, orgId, {} as any);

      expect(repository.delete).toHaveBeenCalledWith(pipelineId, orgId);
    });

    it('should throw when pipeline not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(pipelineId, orgId, {} as any)).rejects.toThrow('Pipeline not found');
    });
  });

  describe('createStage', () => {
    it('should create a stage', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.createStage.mockResolvedValue(mockStageDoc);
      repository.toStageResponse.mockReturnValue({
        id: stageId,
        name: 'New',
        order: 0,
        probability: 10,
        isWon: false,
        isLost: false,
      });

      const input: CreatePipelineStageInput = {
        name: 'New',
        order: 0,
        probability: 10,
      };

      const result = await service.createStage(pipelineId, orgId, input);

      expect(repository.createStage).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'New',
          pipelineId: new ObjectId(pipelineId),
        })
      );
      expect(result.name).toBe('New');
    });

    it('should throw when pipeline not found', async () => {
      repository.findById.mockResolvedValue(null);

      const input: CreatePipelineStageInput = {
        name: 'New',
        order: 0,
        probability: 10,
      };

      await expect(service.createStage(pipelineId, orgId, input)).rejects.toThrow('Pipeline not found');
    });
  });

  describe('updateStage', () => {
    it('should update a stage', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.updateStage.mockResolvedValue({
        ...mockStageDoc,
        name: 'Qualified',
      } as any);
      repository.toStageResponse.mockReturnValue({
        id: stageId,
        name: 'Qualified',
        order: 1,
        probability: 40,
        isWon: false,
        isLost: false,
      });

      const input: UpdatePipelineStageInput = {
        name: 'Qualified',
        probability: 40,
      };

      const result = await service.updateStage(pipelineId, stageId, orgId, input);

      expect(repository.updateStage).toHaveBeenCalledWith(pipelineId, stageId, orgId, input);
      expect(result?.name).toBe('Qualified');
    });
  });

  describe('deleteStage', () => {
    it('should delete a stage without deals', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.countDealsByStage.mockResolvedValue(0);
      repository.deleteStage.mockResolvedValue(undefined);

      await service.deleteStage(pipelineId, stageId, orgId);

      expect(repository.deleteStage).toHaveBeenCalledWith(pipelineId, stageId, orgId);
    });

    it('should throw when stage has deals and no replacement provided', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.countDealsByStage.mockResolvedValue(5);

      await expect(service.deleteStage(pipelineId, stageId, orgId)).rejects.toThrow(
        'Cannot delete stage with associated deals without providing a replacement stage'
      );
    });

    it('should replace deals and delete stage when replacement provided', async () => {
      repository.findById.mockResolvedValue(mockPipelineDoc as any);
      repository.countDealsByStage.mockResolvedValue(5);
      repository.replaceDealStage.mockResolvedValue(3);
      repository.deleteStage.mockResolvedValue(undefined);

      await service.deleteStage(pipelineId, stageId, orgId, 'replacementStageId');

      expect(repository.replaceDealStage).toHaveBeenCalledWith(stageId, 'replacementStageId');
      expect(repository.deleteStage).toHaveBeenCalledWith(pipelineId, stageId, orgId);
    });
  });
});
