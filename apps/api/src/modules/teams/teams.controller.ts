import { z } from 'zod';
import { TeamService } from './teams.service';
import { createTeamSchema, updateTeamSchema } from './teams.schema';
import type { CreateTeamInput, UpdateTeamInput } from './teams.types';

const toCreateInput = (body: unknown): CreateTeamInput => {
  return createTeamSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateTeamInput => {
  return updateTeamSchema.parse(body);
};

export function createTeamsController(service: TeamService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const teams = await service.listByOrganization(organizationId);
      return c.json({ data: teams });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        if (!organizationId) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }
        const input = toCreateInput(await c.req.json());
        const team = await service.create(organizationId, input);
        return c.json({ data: team }, 201);
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
      const id = c.req.param('id');
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const team = await service.getById(id, organizationId);
      if (!team) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Team not found' } }, 404);
      }
      return c.json({ data: team });
    },

    async update(c: any) {
      try {
        const id = c.req.param('id');
        const organizationId = c.get('organizationId');
        if (!organizationId) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }
        const input = toUpdateInput(await c.req.json());
        const team = await service.update(id, organizationId, input);
        if (!team) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Team not found' } }, 404);
        }
        return c.json({ data: team });
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
      const id = c.req.param('id');
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      await service.delete(id, organizationId);
      return c.json({ data: { id, status: 'deleted' } });
    },
  };
}
