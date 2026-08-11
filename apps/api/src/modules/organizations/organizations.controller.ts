import { z } from 'zod';
import { OrganizationService } from './organizations.service';
import { createOrganizationSchema, updateOrganizationSchema } from './organizations.schema';
import type { CreateOrganizationInput, UpdateOrganizationInput } from './organizations.types';

const toCreateInput = (body: unknown): CreateOrganizationInput => {
  return createOrganizationSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateOrganizationInput => {
  return updateOrganizationSchema.parse(body);
};

export function createOrganizationsController(service: OrganizationService) {
  return {
    async create(c: any) {
      try {
        const input = toCreateInput(await c.req.json());
        const org = await service.create(input);
        return c.json({ data: org }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Organization slug already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const id = c.req.param('id');
      const org = await service.getById(id);
      if (!org) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Organization not found' } }, 404);
      }
      return c.json({ data: org });
    },

    async update(c: any) {
      try {
        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const org = await service.update(id, input);
        if (!org) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Organization not found' } }, 404);
        }
        return c.json({ data: org });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Organization slug already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },
  };
}
