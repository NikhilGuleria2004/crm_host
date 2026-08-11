import { z } from 'zod';
import { NoteService } from './notes.service';
import { createNoteSchema, updateNoteSchema, noteListQuerySchema } from './notes.schema';
import type { CreateNoteInput, UpdateNoteInput, NoteListQuery } from './notes.types';

const toCreateInput = (body: unknown): CreateNoteInput => {
  return createNoteSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateNoteInput => {
  return updateNoteSchema.parse(body);
};

const toListQuery = (c: any): NoteListQuery => {
  const query: NoteListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const contactId = c.req.query('contactId');
  const companyId = c.req.query('companyId');
  const leadId = c.req.query('leadId');
  const dealId = c.req.query('dealId');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (contactId) query.contactId = contactId;
  if (companyId) query.companyId = companyId;
  if (leadId) query.leadId = leadId;
  if (dealId) query.dealId = dealId;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return noteListQuerySchema.parse(query);
};

export function createNotesController(service: NoteService) {
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
        const note = await service.create(organizationId, user.id, input);
        return c.json({ data: note }, 201);
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
      const note = await service.getById(id, organizationId);
      if (!note) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } }, 404);
      }
      return c.json({ data: note });
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
        const note = await service.update(id, organizationId, user.id, input);
        if (!note) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } }, 404);
        }
        return c.json({ data: note });
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
        if (error instanceof Error && error.message === 'Note not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Note not found' } }, 404);
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
