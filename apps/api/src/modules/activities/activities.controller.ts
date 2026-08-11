import { z } from 'zod';
import { ActivityService } from './activities.service';
import { createActivitySchema, updateActivitySchema, activityListQuerySchema } from './activities.schema';
import type { CreateActivityInput, UpdateActivityInput, ActivityListQuery } from './activities.types';

const toCreateInput = (body: unknown): CreateActivityInput => {
  return createActivitySchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateActivityInput => {
  return updateActivitySchema.parse(body);
};

const toListQuery = (c: any): ActivityListQuery => {
  const query: ActivityListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const type = c.req.query('type');
  const ownerId = c.req.query('ownerId');
  const contactId = c.req.query('contactId');
  const companyId = c.req.query('companyId');
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');
  const from = c.req.query('from');
  const to = c.req.query('to');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (type) query.type = type;
  if (ownerId) query.ownerId = ownerId;
  if (contactId) query.contactId = contactId;
  if (companyId) query.companyId = companyId;
  if (leadId) query.leadId = leadId;
  if (dealId) query.dealId = dealId;
  if (from) query.from = from;
  if (to) query.to = to;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return activityListQuerySchema.parse(query);
};

export function createActivitiesController(service: ActivityService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 403);
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
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 403);
        }

        const input = toCreateInput(await c.req.json());
        const activity = await service.create(organizationId, user.id, input);
        return c.json({ data: activity }, 201);
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
      const activity = await service.getById(id, organizationId);
      if (!activity) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Activity not found' } }, 404);
      }
      return c.json({ data: activity });
    },

    async update(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 403);
        }

        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const activity = await service.update(id, organizationId, user.id, input);
        if (!activity) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Activity not found' } }, 404);
        }
        return c.json({ data: activity });
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
        if (error instanceof Error && error.message === 'Activity not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Activity not found' } }, 404);
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
  };
}
