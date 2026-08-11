import { TagService } from './tags.service';
import { createTagSchema, updateTagSchema, tagListQuerySchema } from './tags.schema';
import type { TagListQuery } from './tags.types';

const toListQuery = (c: any): TagListQuery => {
  const query: TagListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;

  return tagListQuerySchema.parse(query);
};

export function createTagsController(service: TagService) {
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

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const tag = await service.getById(id, organizationId);
      if (!tag) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Tag not found' } }, 404);
      }
      return c.json({ data: tag });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const input = createTagSchema.parse(body);

        const tag = await service.create(organizationId, input.name);
        return c.json({ data: tag }, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create tag' } }, 500);
      }
    },

    async update(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const id = c.req.param('id');

        if (!organizationId) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const input = updateTagSchema.parse(body);

        const tag = await service.update(id, organizationId, input);
        if (!tag) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Tag not found' } }, 404);
        }

        return c.json({ data: tag });
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update tag' } }, 500);
      }
    },

    async delete(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');

      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const deleted = await service.delete(id, organizationId);
      if (!deleted) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Tag not found' } }, 404);
      }

      return c.json({ data: { id, status: 'deleted' } });
    },
  };
}
