import { ObjectId } from 'mongodb';
import { PipelineRepository, UpdatePipelinePayload } from './pipelines.repository';
import type { CreatePipelineInput, UpdatePipelineInput, PipelineResponse, PipelineListResponse, PipelineListQuery, CreatePipelineStageInput, UpdatePipelineStageInput, PipelineStageResponse } from './pipelines.types';
import { auditLog } from '../../middleware/audit';

export class PipelineService {
  constructor(private repository: PipelineRepository) {}

  async list(organizationId: string, params: PipelineListQuery): Promise<PipelineListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      sort,
      direction,
    });

    const data = await Promise.all(
      result.data.map(async (doc) => {
        const stages = await this.repository.getStages(doc._id.toHexString());
        return this.repository.toResponse(doc, stages);
      })
    );

    const filteredData = data.filter((pipeline): pipeline is PipelineResponse => pipeline !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreatePipelineInput): Promise<PipelineResponse> {
    if (input.isDefault) {
      await this.repository.unsetDefault(organizationId);
    }

    const pipeline = await this.repository.create({
      organizationId,
      name: input.name,
      description: input.description || undefined,
      isDefault: input.isDefault || false,
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
    });

    const stages = await this.repository.getStages(pipeline._id.toHexString());
    return this.repository.toResponse(pipeline, stages)!;
  }

  async getById(id: string, organizationId: string): Promise<PipelineResponse | null> {
    const pipeline = await this.repository.findById(id, organizationId);
    if (!pipeline) return null;

    const stages = await this.repository.getStages(id);
    return this.repository.toResponse(pipeline, stages);
  }

  async getDetail(id: string, organizationId: string): Promise<PipelineResponse | null> {
    const pipeline = await this.repository.findById(id, organizationId);
    if (!pipeline) return null;

    const stages = await this.repository.getStages(id);
    return this.repository.toDetailResponse(pipeline, stages);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdatePipelineInput): Promise<PipelineResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    if (input.isDefault && !existing.isDefault) {
      await this.repository.unsetDefault(organizationId);
    }

    const updatePayload: UpdatePipelinePayload = {
      updatedBy: new ObjectId(userId),
    };
    if (input.name !== undefined) updatePayload.name = input.name;
    if (input.description !== undefined) updatePayload.description = input.description || undefined;
    if (input.isDefault !== undefined) updatePayload.isDefault = input.isDefault;

    const pipeline = await this.repository.update(id, organizationId, updatePayload);

    if (!pipeline) return null;

    const stages = await this.repository.getStages(id);
    return this.repository.toResponse(pipeline, stages);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    await this.repository.delete(id, organizationId);

    await auditLog(c, {
      action: 'pipeline.deleted',
      entityType: 'pipeline',
      entityId: id,
      before: {
        name: existing.name,
        isDefault: existing.isDefault,
      },
    });
  }

  async createStage(pipelineId: string, organizationId: string, input: CreatePipelineStageInput): Promise<PipelineStageResponse> {
    const existing = await this.repository.findById(pipelineId, organizationId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    const stage = await this.repository.createStage({
      organizationId,
      pipelineId: new ObjectId(pipelineId),
      name: input.name,
      order: input.order,
      probability: input.probability,
      isWon: input.isWon || false,
      isLost: input.isLost || false,
    });

    return this.repository.toStageResponse(stage);
  }

  async updateStage(pipelineId: string, stageId: string, organizationId: string, input: UpdatePipelineStageInput): Promise<PipelineStageResponse | null> {
    const existing = await this.repository.findById(pipelineId, organizationId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    const stage = await this.repository.updateStage(pipelineId, stageId, organizationId, input);
    if (!stage) return null;

    return this.repository.toStageResponse(stage);
  }

  async deleteStage(pipelineId: string, stageId: string, organizationId: string, replacementStageId?: string): Promise<void> {
    const existing = await this.repository.findById(pipelineId, organizationId);
    if (!existing) {
      throw new Error('Pipeline not found');
    }

    const dealCount = await this.repository.countDealsByStage(stageId);
    if (dealCount > 0 && !replacementStageId) {
      throw new Error('Cannot delete stage with associated deals without providing a replacement stage');
    }

    if (dealCount > 0 && replacementStageId) {
      await this.repository.replaceDealStage(stageId, replacementStageId);
    }

    await this.repository.deleteStage(pipelineId, stageId, organizationId);
  }
}
