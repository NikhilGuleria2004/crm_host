import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { PipelineDocument, PipelineStageDocument } from '../../types/documents';
import type { PipelineResponse, PipelineStageResponse } from './pipelines.types';
import { FilterEngine } from '../filters/filters.engine';
import { PIPELINE_FILTERS } from '../filters/filters.definitions';

export function toStageResponse(doc: PipelineStageDocument): PipelineStageResponse {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    order: doc.order,
    probability: doc.probability,
    isWon: doc.isWon,
    isLost: doc.isLost,
  };
}

function toResponse(doc: PipelineDocument, stages: PipelineStageDocument[]): PipelineResponse {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    description: doc.description,
    isDefault: doc.isDefault,
    stages: stages.map(toStageResponse),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface CreatePipelinePayload {
  organizationId: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}

export interface UpdatePipelinePayload {
  name?: string;
  description?: string;
  isDefault?: boolean;
  updatedBy: ObjectId;
}

interface CreateStagePayload {
  organizationId: string;
  pipelineId: ObjectId;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

interface UpdateStagePayload {
  name?: string;
  order?: number;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}

export class PipelineRepository {
  async findById(id: string, organizationId: string): Promise<PipelineDocument | null> {
    const doc = await collections.pipelines().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as PipelineDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: PipelineDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(PIPELINE_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({}).filters || [],
      organizationId
    );

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const data = await collections.pipelines()
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
      data: items as PipelineDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: CreatePipelinePayload): Promise<PipelineDocument> {
    const now = new Date();
    const result = await collections.pipelines().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      description: input.description,
      isDefault: input.isDefault,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.pipelines().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create pipeline');
    return doc as PipelineDocument;
  }

  async update(id: string, organizationId: string, input: UpdatePipelinePayload): Promise<PipelineDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.isDefault !== undefined) update.isDefault = input.isDefault;

    await collections.pipelines().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.pipelines().findOne({ _id: new ObjectId(id) });
    return doc as PipelineDocument | null;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await collections.pipelines().deleteOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
  }

  async unsetDefault(organizationId: string): Promise<void> {
    await collections.pipelines().updateMany(
      { organizationId: new ObjectId(organizationId), isDefault: true },
      { $set: { isDefault: false } }
    );
  }

  async getStages(pipelineId: string): Promise<PipelineStageDocument[]> {
    const docs = await collections.pipelineStages()
      .find({ pipelineId: new ObjectId(pipelineId) })
      .sort({ order: 1 })
      .toArray();
    return docs as PipelineStageDocument[];
  }

  async createStage(input: CreateStagePayload): Promise<PipelineStageDocument> {
    const now = new Date();
    const result = await collections.pipelineStages().insertOne({
      organizationId: new ObjectId(input.organizationId),
      pipelineId: input.pipelineId,
      name: input.name,
      order: input.order,
      probability: input.probability,
      isWon: input.isWon,
      isLost: input.isLost,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.pipelineStages().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create pipeline stage');
    return doc as PipelineStageDocument;
  }

  async updateStage(pipelineId: string, stageId: string, organizationId: string, input: UpdateStagePayload): Promise<PipelineStageDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.order !== undefined) update.order = input.order;
    if (input.probability !== undefined) update.probability = input.probability;
    if (input.isWon !== undefined) update.isWon = input.isWon;
    if (input.isLost !== undefined) update.isLost = input.isLost;

    await collections.pipelineStages().updateOne(
      { _id: new ObjectId(stageId), pipelineId: new ObjectId(pipelineId), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.pipelineStages().findOne({ _id: new ObjectId(stageId) });
    return doc as PipelineStageDocument | null;
  }

  async deleteStage(pipelineId: string, stageId: string, organizationId: string): Promise<void> {
    await collections.pipelineStages().deleteOne({
      _id: new ObjectId(stageId),
      pipelineId: new ObjectId(pipelineId),
      organizationId: new ObjectId(organizationId),
    });
  }

  async countDealsByStage(stageId: string): Promise<number> {
    return collections.deals().countDocuments({ stageId: new ObjectId(stageId) });
  }

  async replaceDealStage(oldStageId: string, newStageId: string): Promise<number> {
    const result = await collections.deals().updateMany(
      { stageId: new ObjectId(oldStageId) },
      { $set: { stageId: new ObjectId(newStageId) } }
    );
    return result.modifiedCount;
  }

  toResponse(doc: PipelineDocument, stages: PipelineStageDocument[]): PipelineResponse {
    return toResponse(doc, stages);
  }

  toDetailResponse(doc: PipelineDocument | null, stages: PipelineStageDocument[]): PipelineResponse | null {
    if (!doc) return null;
    const response = toResponse(doc, stages);
    return response;
  }

  toStageResponse(doc: PipelineStageDocument): PipelineStageResponse {
    return toStageResponse(doc);
  }
}
