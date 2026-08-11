import { CustomFieldService } from './custom-fields.service';
import { customFieldListQuerySchema, createCustomFieldSchema, updateCustomFieldSchema } from './custom-fields.schema';
import type { CustomFieldListQuery } from './custom-fields.types';

const toListQuery = (c: any): CustomFieldListQuery => {
  const query: CustomFieldListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const entity = c.req.query('entity');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (entity) query.entity = entity;

  return customFieldListQuerySchema.parse(query);
};

export function createCustomFieldsController(service: CustomFieldService) {
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
      const field = await service.getById(id, organizationId);
      if (!field) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Custom field not found' } }, 404);
      }
      return c.json({ data: field });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const input = createCustomFieldSchema.parse(body);

        const order = input.order ?? Date.now();
        const field = await service.create(organizationId, {
          entity: input.entity,
          key: input.key,
          label: input.label,
          type: input.type,
          required: input.required,
          options: input.options,
          order,
        });

        return c.json({ data: field }, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create custom field' } }, 500);
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
        const input = updateCustomFieldSchema.parse(body);

        const field = await service.update(id, organizationId, input);
        if (!field) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Custom field not found' } }, 404);
        }

        return c.json({ data: field });
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update custom field' } }, 500);
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
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Custom field not found' } }, 404);
      }

      return c.json({ data: { id, status: 'deleted' } });
    },
  };
}
