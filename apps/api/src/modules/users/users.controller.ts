import { z } from 'zod';
import { UserService } from './users.service';
import { createUserSchema, updateUserSchema, inviteUserSchema } from './users.schema';
import type { CreateUserInput, UpdateUserInput, InviteUserInput } from './users.types';

const toCreateInput = (body: unknown): CreateUserInput => {
  return createUserSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateUserInput => {
  return updateUserSchema.parse(body);
};

const toInviteInput = (body: unknown): InviteUserInput => {
  return inviteUserSchema.parse(body);
};

export function createUsersController(service: UserService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      const users = await service.list(organizationId);
      return c.json({ data: users });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const input = toCreateInput(await c.req.json());
        const user = await service.create(organizationId, input);
        return c.json({ data: user }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'User with this email already exists') {
          return c.json(
            { error: { code: 'DUPLICATE_RESOURCE', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async invite(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const input = toInviteInput(await c.req.json());
        const user = await service.invite(organizationId, input);
        return c.json({ data: user }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'User with this email already exists') {
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
      const organizationId = c.get('organizationId');
      const user = await service.getById(id, organizationId);
      if (!user) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } }, 404);
      }
      return c.json({ data: user });
    },

    async update(c: any) {
      try {
        const id = c.req.param('id');
        const organizationId = c.get('organizationId');
        const input = toUpdateInput(await c.req.json());
        const user = await service.update(id, organizationId, input);
        if (!user) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'User not found' } }, 404);
        }
        return c.json({ data: user });
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

    async deactivate(c: any) {
      const id = c.req.param('id');
      const organizationId = c.get('organizationId');
      await service.deactivate(id, organizationId);
      return c.json({ data: { id, status: 'deactivated' } });
    },
  };
}
