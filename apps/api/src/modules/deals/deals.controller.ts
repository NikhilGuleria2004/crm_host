import { z } from 'zod';
import { DealService } from './deals.service';
import { createDealSchema, updateDealSchema, dealListQuerySchema, changeStageSchema, markWonSchema, markLostSchema } from './deals.schema';
import type { CreateDealInput, UpdateDealInput, DealListQuery, ChangeStageInput, MarkWonInput, MarkLostInput } from './deals.types';

const toCreateInput = (body: unknown): CreateDealInput => {
  return createDealSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateDealInput => {
  return updateDealSchema.parse(body);
};

const toListQuery = (c: any): DealListQuery => {
  const query: DealListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const pipelineId = c.req.query('pipelineId');
  const stageId = c.req.query('stageId');
  const ownerId = c.req.query('ownerId');
  const companyId = c.req.query('companyId');
  const contactId = c.req.query('contactId');
  const status = c.req.query('status');
  const minAmount = c.req.query('minAmount');
  const maxAmount = c.req.query('maxAmount');
  const expectedCloseAfter = c.req.query('expectedCloseAfter');
  const expectedCloseBefore = c.req.query('expectedCloseBefore');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (search) query.search = search;
  if (pipelineId) query.pipelineId = pipelineId;
  if (stageId) query.stageId = stageId;
  if (ownerId) query.ownerId = ownerId;
  if (companyId) query.companyId = companyId;
  if (contactId) query.contactId = contactId;
  if (status) query.status = status;
  if (minAmount) query.minAmount = parseFloat(minAmount);
  if (maxAmount) query.maxAmount = parseFloat(maxAmount);
  if (expectedCloseAfter) query.expectedCloseAfter = expectedCloseAfter;
  if (expectedCloseBefore) query.expectedCloseBefore = expectedCloseBefore;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return dealListQuerySchema.parse(query);
};

export function createDealsController(service: DealService) {
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
        const deal = await service.create(organizationId, user.id, input);
        return c.json({ data: deal }, 201);
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
      const deal = await service.getDetail(id, organizationId);
      if (!deal) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Deal not found' } }, 404);
      }
      return c.json({ data: deal });
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
        const deal = await service.update(id, organizationId, user.id, input);
        if (!deal) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Deal not found' } }, 404);
        }
        return c.json({ data: deal });
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
        if (error instanceof Error && error.message === 'Deal not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Deal not found' } }, 404);
        }
        throw error;
      }
    },

    async changeStage(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = changeStageSchema.parse(await c.req.json()) as ChangeStageInput;
        const deal = await service.changeStage(id, organizationId, user.id, input, c);
        return c.json({ data: deal });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && (error.message === 'Deal not found' || error.message === 'Stage not found' || error.message === 'Pipeline not found')) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: error.message } }, 404);
        }
        throw error;
      }
    },

    async markWon(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = markWonSchema.parse(await c.req.json()) as MarkWonInput;
        const deal = await service.markWon(id, organizationId, user.id, input, c);
        return c.json({ data: deal });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Deal not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Deal not found' } }, 404);
        }
        throw error;
      }
    },

    async markLost(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = markLostSchema.parse(await c.req.json()) as MarkLostInput;
        const deal = await service.markLost(id, organizationId, user.id, input, c);
        return c.json({ data: deal });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Deal not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Deal not found' } }, 404);
        }
        throw error;
      }
    },
  };
}
