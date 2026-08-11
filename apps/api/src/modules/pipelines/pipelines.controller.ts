import { z } from 'zod';
import { PipelineService } from './pipelines.service';
import { createPipelineSchema, updatePipelineSchema, pipelineListQuerySchema, createPipelineStageSchema, updatePipelineStageSchema } from './pipelines.schema';
import type { CreatePipelineInput, UpdatePipelineInput, PipelineListQuery, CreatePipelineStageInput, UpdatePipelineStageInput } from './pipelines.types';

const toCreateInput = (body: unknown): CreatePipelineInput => {
  return createPipelineSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdatePipelineInput => {
  return updatePipelineSchema.parse(body);
};

const toListQuery = (c: any): PipelineListQuery => {
  const query: PipelineListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return pipelineListQuerySchema.parse(query);
};

const toCreateStageInput = (body: unknown): CreatePipelineStageInput => {
  return createPipelineStageSchema.parse(body);
};

const toUpdateStageInput = (body: unknown): UpdatePipelineStageInput => {
  return updatePipelineStageSchema.parse(body);
};

export function createPipelinesController(service: PipelineService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toListQuery(c);
      const result = await service.list(organizationId, query);
      return c.json({ data: result.data, meta: result.meta });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const input = toCreateInput(await c.req.json());
        const pipeline = await service.create(organizationId, user.id, input);
        return c.json({ data: pipeline }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const pipeline = await service.getDetail(id, organizationId);
      if (!pipeline) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
      }
      return c.json({ data: pipeline });
    },

    async update(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const pipeline = await service.update(id, organizationId, user.id, input);
        if (!pipeline) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
        }
        return c.json({ data: pipeline });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async delete(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const id = c.req.param('id');
        await service.delete(id, organizationId, c);
        return c.json({ data: { id, status: 'deleted' } });
      } catch (error) {
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
        }
        throw error;
      }
    },

    async createStage(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const pipelineId = c.req.param('id');
        const input = toCreateStageInput(await c.req.json());
        const stage = await service.createStage(pipelineId, organizationId, input);
        return c.json({ data: stage }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
        }
        throw error;
      }
    },

    async updateStage(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const pipelineId = c.req.param('pipelineId');
        const stageId = c.req.param('stageId');
        const input = toUpdateStageInput(await c.req.json());
        const stage = await service.updateStage(pipelineId, stageId, organizationId, input);
        if (!stage) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Stage not found' } }, 404);
        }
        return c.json({ data: stage });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
        }
        throw error;
      }
    },

    async deleteStage(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const pipelineId = c.req.param('pipelineId');
        const stageId = c.req.param('stageId');
        const replacementStageId = c.req.query('replacementStageId');
        await service.deleteStage(pipelineId, stageId, organizationId, replacementStageId || undefined);
        return c.json({ data: { id: stageId, status: 'deleted' } });
      } catch (error) {
        if (error instanceof Error && error.message === 'Pipeline not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Pipeline not found' } }, 404);
        }
        if (error instanceof Error && error.message === 'Cannot delete stage with associated deals without providing a replacement stage') {
          return c.json(
            { error: { code: 'CONFLICT', message: error.message } },
            409
          );
        }
        throw error;
      }
    },
  };
}
