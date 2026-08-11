import { z } from 'zod';
import { LeadService } from './leads.service';
import { createLeadSchema, updateLeadSchema, leadListQuerySchema, convertLeadSchema } from './leads.schema';
import type { CreateLeadInput, UpdateLeadInput, LeadListQuery, ConvertLeadInput } from './leads.types';

const toCreateInput = (body: unknown): CreateLeadInput => {
  return createLeadSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateLeadInput => {
  return updateLeadSchema.parse(body);
};

const toListQuery = (c: any): LeadListQuery => {
  const query: LeadListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const ownerId = c.req.query('ownerId');
  const source = c.req.query('source');
  const score = c.req.query('score');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (search) query.search = search;
  if (status) query.status = status;
  if (ownerId) query.ownerId = ownerId;
  if (source) query.source = source;
  if (score) query.score = parseInt(score, 10);
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return leadListQuerySchema.parse(query);
};

export function createLeadsController(service: LeadService) {
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
        const lead = await service.create(organizationId, user.id, input);
        return c.json({ data: lead }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Lead with this email already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const lead = await service.getDetail(id, organizationId);
      if (!lead) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } }, 404);
      }
      return c.json({ data: lead });
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
        const lead = await service.update(id, organizationId, user.id, input);
        if (!lead) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } }, 404);
        }
        return c.json({ data: lead });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Lead with this email already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
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
        if (error instanceof Error && error.message === 'Lead not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } }, 404);
        }
        throw error;
      }
    },

    async bulkDelete(c: any) {
      const organizationId = c.get('organizationId');
      const body = await c.req.json();
      const { ids } = z.object({ ids: z.array(z.string()) }).parse(body);

      const result = await service.bulkDelete(ids, organizationId, c);
      return c.json({ data: result });
    },

    async convert(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = convertLeadSchema.parse(await c.req.json()) as ConvertLeadInput;
        const result = await service.convert(id, organizationId, user.id, input, c);
        return c.json({ data: result });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && (error.message === 'Lead not found' || error.message === 'Lead has already been converted')) {
          return c.json(
            { error: { code: 'RESOURCE_NOT_FOUND', message: error.message } },
            404
          );
        }
        throw error;
      }
    },
  };
}
