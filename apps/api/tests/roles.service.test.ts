import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { RoleService } from '../src/modules/roles/roles.service';
import type { RoleRepository } from '../src/modules/roles/roles.repository';

function createMockRepository(): vi.Mocked<RoleRepository> {
  return {
    findById: vi.fn(),
    findByOrganization: vi.fn(),
    findByName: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    createRolePermission: vi.fn(),
    deleteRolePermissionsByRole: vi.fn(),
    findPermissionsByRoleId: vi.fn(),
    toResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();
const adminRoleId = new ObjectId().toHexString();

const mockRoleDoc = {
  _id: new ObjectId(roleId),
  organizationId: new ObjectId(orgId),
  name: 'Sales Rep',
  description: 'Sales role',
  permissionIds: ['contacts.read', 'contacts.create'],
  isSystem: false,
  level: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminRoleDoc = {
  _id: new ObjectId(adminRoleId),
  organizationId: new ObjectId(orgId),
  name: 'Administrator',
  description: 'Admin role',
  permissionIds: ['users.*', 'roles.*'],
  isSystem: true,
  level: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const toResponse = (doc: any): any => {
  if (!doc) return null;
  return {
    id: doc._id.toHexString(),
    organizationId: doc.organizationId.toHexString(),
    name: doc.name,
    description: doc.description,
    permissionIds: doc.permissionIds,
    isSystem: doc.isSystem,
    level: doc.level,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
};

describe('P33 RoleService', () => {
  let repository: ReturnType<typeof createMockRepository>;
  let service: RoleService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    repository.toResponse.mockImplementation(toResponse);
    service = new RoleService(repository);
  });

  describe('create', () => {
    it('should create a role with permissions', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockRoleDoc);

      const result = await service.create(orgId, { name: 'Sales Rep', permissionIds: ['contacts.read', 'contacts.create'] });

      expect(repository.findByName).toHaveBeenCalledWith(orgId, 'Sales Rep');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sales Rep',
          organizationId: orgId,
          isSystem: false,
        })
      );
      expect(repository.createRolePermission).toHaveBeenCalledTimes(2);
      expect(result.name).toBe('Sales Rep');
    });

    it('should throw when role name already exists', async () => {
      repository.findByName.mockResolvedValue(mockRoleDoc as any);

      await expect(service.create(orgId, { name: 'Sales Rep', permissionIds: ['contacts.read'] })).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('getById', () => {
    it('should return role by id', async () => {
      repository.findById.mockResolvedValue(mockRoleDoc);

      const result = await service.getById(roleId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(roleId, orgId);
      expect(result?.name).toBe('Sales Rep');
    });

    it('should return null when role not found', async () => {
      repository.findById.mockResolvedValue(null as any);

      const result = await service.getById(roleId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('listByOrganization', () => {
    it('should return roles for organization', async () => {
      repository.findByOrganization.mockResolvedValue([mockRoleDoc]);

      const result = await service.listByOrganization(orgId);

      expect(repository.findByOrganization).toHaveBeenCalledWith(orgId);
      expect(result).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a custom role', async () => {
      repository.findById.mockResolvedValue(mockRoleDoc);
      repository.findByName.mockResolvedValue(null);
      repository.update.mockResolvedValue({ ...mockRoleDoc, name: 'Senior Sales Rep' });

      const result = await service.update(roleId, orgId, { name: 'Senior Sales Rep' });

      expect(repository.update).toHaveBeenCalledWith(roleId, orgId, { name: 'Senior Sales Rep' });
      expect(result?.name).toBe('Senior Sales Rep');
    });

    it('should throw when updating system role', async () => {
      repository.findById.mockResolvedValue(mockAdminRoleDoc);

      await expect(service.update(adminRoleId, orgId, { name: 'New Name' })).rejects.toThrow('System roles cannot be modified');
    });

    it('should throw when role not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update(roleId, orgId, { name: 'New Name' })).rejects.toThrow('Role not found');
    });

    it('should throw on duplicate name', async () => {
      const otherRole = { ...mockRoleDoc, _id: new ObjectId(), name: 'Other Role' };
      repository.findById.mockResolvedValue(mockRoleDoc);
      repository.findByName.mockResolvedValue(otherRole as any);

      await expect(service.update(roleId, orgId, { name: 'Other Role' })).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('delete', () => {
    it('should delete a custom role', async () => {
      repository.findById.mockResolvedValue(mockRoleDoc);
      repository.delete.mockResolvedValue(undefined);

      await service.delete(roleId, orgId);

      expect(repository.delete).toHaveBeenCalledWith(roleId, orgId);
    });

    it('should throw when deleting system role', async () => {
      repository.findById.mockResolvedValue(mockAdminRoleDoc);

      await expect(service.delete(adminRoleId, orgId)).rejects.toThrow('System roles cannot be deleted');
    });

    it('should throw when role not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(roleId, orgId)).rejects.toThrow('Role not found');
    });
  });

  describe('cloneRole', () => {
    it('should clone a role with same permissions', async () => {
      repository.findById.mockResolvedValueOnce(mockRoleDoc);
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValueOnce({ ...mockRoleDoc, _id: new ObjectId(), name: 'Sales Rep (Copy)' });
      repository.findPermissionsByRoleId.mockResolvedValue([
        { permission: 'contacts.read', scope: 'ORGANIZATION' },
        { permission: 'contacts.create', scope: 'ORGANIZATION' },
      ]);

      const result = await service.cloneRole(orgId, roleId, 'Sales Rep (Copy)');

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Sales Rep (Copy)',
          organizationId: orgId,
          isSystem: false,
        })
      );
      expect(repository.createRolePermission).toHaveBeenCalledTimes(2);
      expect(result.name).toBe('Sales Rep (Copy)');
    });

    it('should throw when source role not found', async () => {
      repository.findById.mockResolvedValueOnce(null);

      await expect(service.cloneRole(orgId, 'nonexistent', 'Copy')).rejects.toThrow('Role not found');
    });

    it('should throw when cloned name already exists', async () => {
      repository.findById.mockResolvedValueOnce(mockRoleDoc);
      repository.findByName.mockResolvedValue({ ...mockRoleDoc, _id: new ObjectId(), name: 'Sales Rep (Copy)' });

      await expect(service.cloneRole(orgId, roleId, 'Sales Rep (Copy)')).rejects.toThrow('Role with this name already exists');
    });
  });

  describe('validatePermissionsAgainstActor', () => {
    it('should allow owner to assign any permission', async () => {
      const ownerRoleId = new ObjectId().toHexString();
      repository.findById.mockImplementation((id: string) => {
        if (id === ownerRoleId) return Promise.resolve({ ...mockAdminRoleDoc, _id: new ObjectId(ownerRoleId), level: 5 });
        return Promise.resolve(null);
      });
      repository.findPermissionsByRoleId.mockResolvedValue([]);

      const result = await service.validatePermissionsAgainstActor([ownerRoleId], ['*', 'contacts.read']);

      expect(result).toBe(true);
    });

    it('should allow when actor has exact permission', async () => {
      const actorRoleId = new ObjectId().toHexString();
      repository.findById.mockImplementation((id: string) => {
        if (id === actorRoleId) return Promise.resolve({ ...mockRoleDoc, _id: new ObjectId(actorRoleId), level: 2 });
        return Promise.resolve(null);
      });
      repository.findPermissionsByRoleId.mockResolvedValue([
        { permission: 'contacts.read', scope: 'ORGANIZATION' },
        { permission: 'contacts.create', scope: 'ORGANIZATION' },
      ]);

      const result = await service.validatePermissionsAgainstActor([actorRoleId], ['contacts.read']);

      expect(result).toBe(true);
    });

    it('should allow when actor has wildcard permission', async () => {
      const actorRoleId = new ObjectId().toHexString();
      repository.findById.mockImplementation((id: string) => {
        if (id === actorRoleId) return Promise.resolve({ ...mockRoleDoc, _id: new ObjectId(actorRoleId), level: 2 });
        return Promise.resolve(null);
      });
      repository.findPermissionsByRoleId.mockResolvedValue([
        { permission: 'contacts.*', scope: 'ORGANIZATION' },
      ]);

      const result = await service.validatePermissionsAgainstActor([actorRoleId], ['contacts.read', 'contacts.create']);

      expect(result).toBe(true);
    });

    it('should deny when actor lacks permission', async () => {
      const actorRoleId = new ObjectId().toHexString();
      repository.findById.mockImplementation((id: string) => {
        if (id === actorRoleId) return Promise.resolve({ ...mockRoleDoc, _id: new ObjectId(actorRoleId), level: 2 });
        return Promise.resolve(null);
      });
      repository.findPermissionsByRoleId.mockResolvedValue([
        { permission: 'contacts.read', scope: 'ORGANIZATION' },
      ]);

      const result = await service.validatePermissionsAgainstActor([actorRoleId], ['users.delete']);

      expect(result).toBe(false);
    });

    it('should deny when actor lacks any of multiple target permissions', async () => {
      const actorRoleId = new ObjectId().toHexString();
      repository.findById.mockImplementation((id: string) => {
        if (id === actorRoleId) return Promise.resolve({ ...mockRoleDoc, _id: new ObjectId(actorRoleId), level: 2 });
        return Promise.resolve(null);
      });
      repository.findPermissionsByRoleId.mockResolvedValue([
        { permission: 'contacts.read', scope: 'ORGANIZATION' },
      ]);

      const result = await service.validatePermissionsAgainstActor([actorRoleId], ['contacts.read', 'users.delete']);

      expect(result).toBe(false);
    });
  });

  describe('getRoleLevel / getMaxRoleLevel', () => {
    it('should return role level', async () => {
      repository.findById.mockResolvedValue(mockRoleDoc);

      const level = await service.getRoleLevel(roleId);

      expect(level).toBe(2);
    });

    it('should throw when role not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getRoleLevel(roleId)).rejects.toThrow('Role not found');
    });

    it('should return max level from multiple roles', async () => {
      repository.findById.mockImplementation((id: string) => {
        if (id === roleId) return Promise.resolve(mockRoleDoc);
        if (id === adminRoleId) return Promise.resolve(mockAdminRoleDoc);
        return Promise.resolve(null);
      });

      const max = await service.getMaxRoleLevel([roleId, adminRoleId]);

      expect(max).toBe(4);
    });

    it('should return 0 for empty array', async () => {
      const max = await service.getMaxRoleLevel([]);

      expect(max).toBe(0);
    });
  });

  describe('canAssignRole', () => {
    it('should allow assigning lower level role', async () => {
      repository.findById.mockImplementation((id: string) => {
        if (id === adminRoleId) return Promise.resolve(mockAdminRoleDoc);
        if (id === roleId) return Promise.resolve(mockRoleDoc);
        return Promise.resolve(null);
      });

      const result = await service.canAssignRole([adminRoleId], roleId);

      expect(result).toBe(true);
    });

    it('should deny assigning equal or higher level role', async () => {
      repository.findById.mockImplementation((id: string) => {
        if (id === roleId) return Promise.resolve(mockRoleDoc);
        if (id === adminRoleId) return Promise.resolve(mockAdminRoleDoc);
        return Promise.resolve(null);
      });

      const result = await service.canAssignRole([roleId], adminRoleId);

      expect(result).toBe(false);
    });
  });
});