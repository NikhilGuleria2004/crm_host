import { RoleRepository } from './roles.repository';
import type { CreateRoleInput, UpdateRoleInput, RoleResponse } from './roles.types';
import { DEFAULT_ROLES } from '@crm/shared';

export class RoleService {
  constructor(private repository: RoleRepository) {}

  async create(organizationId: string, input: CreateRoleInput): Promise<RoleResponse> {
    const existing = await this.repository.findByName(organizationId, input.name);
    if (existing) {
      throw new Error('Role with this name already exists');
    }

    const role = await this.repository.create({
      ...input,
      organizationId,
      isSystem: false,
    });
    for (const perm of input.permissionIds) {
      await this.repository.createRolePermission(role._id.toHexString(), organizationId, perm, 'ORGANIZATION');
    }
    return this.repository.toResponse(role) as RoleResponse;
  }

  async getById(id: string, organizationId: string): Promise<RoleResponse | null> {
    const role = await this.repository.findById(id, organizationId);
    return this.repository.toResponse(role) as RoleResponse | null;
  }

  async listByOrganization(organizationId: string): Promise<RoleResponse[]> {
    const roles = await this.repository.findByOrganization(organizationId);
    return roles.map((role) => this.repository.toResponse(role) as RoleResponse);
  }

  async update(id: string, organizationId: string, input: UpdateRoleInput): Promise<RoleResponse | null> {
    const role = await this.repository.findById(id, organizationId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('System roles cannot be modified');
    }

    if (input.name) {
      const existing = await this.repository.findByName(role.organizationId.toHexString(), input.name);
      if (existing && existing._id.toHexString() !== id) {
        throw new Error('Role with this name already exists');
      }
    }

    const updated = await this.repository.update(id, organizationId, input);
    if (input.permissionIds !== undefined) {
      await this.repository.deleteRolePermissionsByRole(id);
      for (const perm of input.permissionIds) {
        await this.repository.createRolePermission(id, role.organizationId.toHexString(), perm, 'ORGANIZATION');
      }
    }
    return this.repository.toResponse(updated) as RoleResponse | null;
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const role = await this.repository.findById(id, organizationId);
    if (!role) {
      throw new Error('Role not found');
    }

    if (role.isSystem) {
      throw new Error('System roles cannot be deleted');
    }

    await this.repository.delete(id, organizationId);
  }

  async seedDefaultRoles(organizationId: string): Promise<string[]> {
    const roleIds: string[] = [];
    for (const defaultRole of DEFAULT_ROLES) {
      const existing = await this.repository.findByName(organizationId, defaultRole.name);
      if (!existing) {
        const role = await this.repository.create({
          organizationId,
          name: defaultRole.name,
          description: defaultRole.description,
          permissionIds: defaultRole.permissions.map((p) => p.permission),
          isSystem: defaultRole.isSystem,
          level: defaultRole.level,
        });
        for (const perm of defaultRole.permissions) {
          await this.repository.createRolePermission(role._id.toHexString(), organizationId, perm.permission, perm.scope);
        }
        roleIds.push(role._id.toHexString());
      } else {
        roleIds.push(existing._id.toHexString());
      }
    }
    return roleIds;
  }

  async getRoleLevel(roleId: string): Promise<number> {
    const role = await this.repository.findById(roleId);
    if (!role) {
      throw new Error('Role not found');
    }
    return role.level;
  }

  async getMaxRoleLevel(roleIds: string[]): Promise<number> {
    if (roleIds.length === 0) return 0;
    let maxLevel = 0;
    for (const roleId of roleIds) {
      const level = await this.getRoleLevel(roleId);
      if (level > maxLevel) {
        maxLevel = level;
      }
    }
    return maxLevel;
  }

  async canAssignRole(actorRoleIds: string[], targetRoleId: string): Promise<boolean> {
    const actorLevel = await this.getMaxRoleLevel(actorRoleIds);
    const targetLevel = await this.getRoleLevel(targetRoleId);
    return actorLevel > targetLevel;
  }

  async cloneRole(organizationId: string, sourceRoleId: string, newName: string): Promise<RoleResponse> {
    const sourceRole = await this.repository.findById(sourceRoleId, organizationId);
    if (!sourceRole) {
      throw new Error('Role not found');
    }

    const existing = await this.repository.findByName(organizationId, newName);
    if (existing) {
      throw new Error('Role with this name already exists');
    }

    const permissionIds = sourceRole.permissionIds;
    const cloned = await this.repository.create({
      organizationId,
      name: newName,
      description: sourceRole.description ? `${sourceRole.description} (cloned)` : 'Cloned role',
      permissionIds,
      isSystem: false,
      level: sourceRole.level,
    });

    const sourcePermissions = await this.repository.findPermissionsByRoleId(sourceRoleId);
    for (const perm of sourcePermissions) {
      await this.repository.createRolePermission(cloned._id.toHexString(), organizationId, perm.permission, perm.scope);
    }

    return this.repository.toResponse(cloned) as RoleResponse;
  }

  async validatePermissionsAgainstActor(actorRoleIds: string[], targetPermissionIds: string[]): Promise<boolean> {
    const actorLevel = await this.getMaxRoleLevel(actorRoleIds);
    if (actorLevel >= 5) return true;

    const actorPermissions = new Set<string>();
    for (const roleId of actorRoleIds) {
      const perms = await this.repository.findPermissionsByRoleId(roleId);
      for (const p of perms) {
        actorPermissions.add(p.permission);
      }
    }

    for (const targetPerm of targetPermissionIds) {
      if (actorPermissions.has(targetPerm)) continue;
      const [resource] = targetPerm.split('.');
      if (actorPermissions.has(`${resource}.*`)) continue;
      if (actorPermissions.has('*')) continue;
      return false;
    }

    return true;
  }
}
