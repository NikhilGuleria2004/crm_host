import { z } from 'zod';
import { MembershipService } from './memberships.service';
import { RoleService } from '../roles/roles.service';
import { createMembershipSchema, updateMembershipSchema, acceptInvitationSchema } from './memberships.schema';
import type { CreateMembershipInput, UpdateMembershipInput, AcceptInvitationInput } from './memberships.types';

const toCreateInput = (body: unknown): CreateMembershipInput => {
  return createMembershipSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateMembershipInput => {
  return updateMembershipSchema.parse(body);
};

const toAcceptInput = (body: unknown): AcceptInvitationInput => {
  return acceptInvitationSchema.parse(body);
};

export function createMembershipsController(service: MembershipService, roleService: RoleService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const memberships = await service.getByOrganization(organizationId);
      return c.json({ data: memberships });
    },

    async invite(c: any) {
      try {
        const organizationId = c.get('organizationId');
        if (!organizationId) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }
        const input = toCreateInput(await c.req.json());
        const user = c.get('user');
        if (user && input.roleId) {
          const canAssign = await roleService.canAssignRole(user.roleIds, input.roleId);
          if (!canAssign) {
            return c.json(
              { error: { code: 'FORBIDDEN', message: 'Cannot assign a role above your own' } },
              403
            );
          }
        }
        const membership = await service.inviteUser(organizationId, input);
        return c.json({ data: membership }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'User is already a member of this organization') {
          return c.json(
            { error: { code: 'CONFLICT', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async accept(c: any) {
      try {
        const input = toAcceptInput(await c.req.json());
        const membership = await service.acceptInvitation(input.token);
        return c.json({ data: membership });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && (error.message === 'Invalid or expired invitation')) {
          return c.json(
            { error: { code: 'INVALID_CREDENTIALS', message: error.message } },
            400
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const id = c.req.param('id');
      const membership = await service.getById(id);
      if (!membership) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Membership not found' } }, 404);
      }
      return c.json({ data: membership });
    },

    async update(c: any) {
      try {
        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const user = c.get('user');
        if (user && input.roleId) {
          const canAssign = await roleService.canAssignRole(user.roleIds, input.roleId);
          if (!canAssign) {
            return c.json(
              { error: { code: 'FORBIDDEN', message: 'Cannot assign a role above your own' } },
              403
            );
          }
        }
        const membership = await service.update(id, input);
        if (!membership) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Membership not found' } }, 404);
        }
        return c.json({ data: membership });
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

    async remove(c: any) {
      const id = c.req.param('id');
      await service.remove(id);
      return c.json({ data: { id, status: 'removed' } });
    },
  };
}
