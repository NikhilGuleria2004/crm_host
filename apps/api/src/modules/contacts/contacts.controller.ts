import { z } from 'zod';
import { ContactService } from './contacts.service';
import { createContactSchema, updateContactSchema, contactListQuerySchema } from './contacts.schema';
import type { CreateContactInput, UpdateContactInput, ContactListQuery } from './contacts.types';

const toCreateInput = (body: unknown): CreateContactInput => {
  return createContactSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateContactInput => {
  return updateContactSchema.parse(body);
};

const toListQuery = (c: any): ContactListQuery => {
  const query: ContactListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const ownerId = c.req.query('ownerId');
  const companyId = c.req.query('companyId');
  const source = c.req.query('source');
  const tagId = c.req.query('tagId');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (search) query.search = search;
  if (status) query.status = status;
  if (ownerId) query.ownerId = ownerId;
  if (companyId) query.companyId = companyId;
  if (source) query.source = source;
  if (tagId) query.tagId = tagId;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return contactListQuerySchema.parse(query);
};

export function createContactsController(service: ContactService) {
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
        const contact = await service.create(organizationId, user.id, input);
        return c.json({ data: contact }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Contact with this email already exists') {
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
      const contact = await service.getDetail(id, organizationId);
      if (!contact) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Contact not found' } }, 404);
      }
      return c.json({ data: contact });
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
        const contact = await service.update(id, organizationId, user.id, input);
        if (!contact) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Contact not found' } }, 404);
        }
        return c.json({ data: contact });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Contact with this email already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async delete(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      await service.delete(id, organizationId, c);
      return c.json({ data: { id, status: 'deleted' } });
    },

    async bulkUpdate(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const { ids, changes } = z.object({
          ids: z.array(z.string()),
          changes: updateContactSchema.partial(),
        }).parse(body);

        const contacts = await service.list(organizationId, { limit: 500 });
        const targetIds = new Set(ids);

        let updated = 0;
        for (const contact of contacts.data) {
          if (targetIds.has(contact.id)) {
            await service.update(contact.id, organizationId, user.id, changes);
            updated++;
          }
        }

        return c.json({ data: { updated, total: ids.length } });
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

    async bulkDelete(c: any) {
      const organizationId = c.get('organizationId');
      const body = await c.req.json();
      const { ids } = z.object({ ids: z.array(z.string()) }).parse(body);

      const result = await service.bulkDelete(ids, organizationId, c);
      return c.json({ data: result });
    },
  };
}
