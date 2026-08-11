import { z } from 'zod';
import { RoleService } from './roles.service';
import { createRoleSchema, updateRoleSchema, cloneRoleSchema } from './roles.schema';
import type { CreateRoleInput, UpdateRoleInput, CloneRoleInput } from './roles.types';
import { clearRolePermissionCache } from '../../middleware/authorization';

const toCreateInput = (body: unknown): CreateRoleInput => {
  return createRoleSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateRoleInput => {
  return updateRoleSchema.parse(body);
};

const toCloneInput = (body: unknown): CloneRoleInput => {
  return cloneRoleSchema.parse(body);
};

export function createRolesController(service: RoleService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const roles = await service.listByOrganization(organizationId);
      return c.json({ data: roles });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const input = toCreateInput(await c.req.json());
        const canAssign = await service.validatePermissionsAgainstActor(user.roleIds, input.permissionIds);
        if (!canAssign) {
          return c.json(
            { error: { code: 'FORBIDDEN', message: 'Cannot assign permissions above your own' } },
            403
          );
        }

        const role = await service.create(organizationId, input);
        clearRolePermissionCache();
        return c.json({ data: role }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Role with this name already exists') {
          return c.json(
            { error: { code: 'CONFLICT', message: error.message } },
            409
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const id = c.req.param('id');
      const organizationId = c.get('organizationId');
      const role = await service.getById(id, organizationId);
      if (!role) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Role not found' } }, 404);
      }
      return c.json({ data: role });
    },

    async update(c: any) {
      try {
        const id = c.req.param('id');
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!user) {
          return c.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 401);
        }

        const existing = await service.getById(id, organizationId);
        if (!existing) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Role not found' } }, 404);
        }

        const input = toUpdateInput(await c.req.json());
        const targetPermissionIds = input.permissionIds ?? existing.permissionIds;

        const canAssign = await service.validatePermissionsAgainstActor(user.roleIds, targetPermissionIds);
        if (!canAssign) {
          return c.json(
            { error: { code: 'FORBIDDEN', message: 'Cannot assign permissions above your own' } },
            403
          );
        }

        const role = await service.update(id, organizationId, input);
        if (!role) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Role not found' } }, 404);
        }
        clearRolePermissionCache();
        return c.json({ data: role });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && (error.message === 'Role not found' || error.message === 'System roles cannot be modified' || error.message === 'Role with this name already exists')) {
          return c.json(
            { error: { code: error.message === 'System roles cannot be modified' ? 'FORBIDDEN' : 'CONFLICT', message: error.message } },
            error.message === 'System roles cannot be modified' ? 403 : 409
          );
        }
        throw error;
      }
    },

    async delete(c: any) {
      try {
        const id = c.req.param('id');
        const organizationId = c.get('organizationId');
        await service.delete(id, organizationId);
        clearRolePermissionCache();
        return c.json({ data: { id, status: 'deleted' } });
      } catch (error) {
        if (error instanceof Error && error.message === 'System roles cannot be deleted') {
          return c.json(
            { error: { code: 'FORBIDDEN', message: error.message } },
            403
          );
        }
        throw error;
      }
    },

    async clone(c: any) {
      try {
        const id = c.req.param('id');
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const input = toCloneInput(await c.req.json());
        const sourceRole = await service.getById(id, organizationId);
        if (!sourceRole) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Role not found' } }, 404);
        }

        const targetPermissionIds = input.permissionIds ?? sourceRole.permissionIds;
        const canAssign = await service.validatePermissionsAgainstActor(user.roleIds, targetPermissionIds);
        if (!canAssign) {
          return c.json(
            { error: { code: 'FORBIDDEN', message: 'Cannot assign permissions above your own' } },
            403
          );
        }

        const cloned = await service.cloneRole(organizationId, id, input.name);
        clearRolePermissionCache();
        return c.json({ data: cloned }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Role with this name already exists') {
          return c.json(
            { error: { code: 'CONFLICT', message: error.message } },
            409
          );
        }
        throw error;
      }
    },
  };
}
