import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { RoleDocument } from '../../types/documents';
import type { RoleResponse, CreateRoleInput, UpdateRoleInput } from './roles.types';

function toResponse(doc: RoleDocument): RoleResponse {
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
}

export class RoleRepository {
  async findById(id: string, organizationId?: string): Promise<RoleDocument | null> {
    const query: Record<string, unknown> = { _id: new ObjectId(id) };
    if (organizationId) {
      query.organizationId = new ObjectId(organizationId);
    }
    const doc = await collections.roles().findOne(query);
    return doc as RoleDocument | null;
  }

  async findByOrganization(organizationId: string): Promise<RoleDocument[]> {
    const docs = await collections.roles().find({ organizationId: new ObjectId(organizationId) }).toArray();
    return docs as RoleDocument[];
  }

  async findByName(organizationId: string, name: string): Promise<RoleDocument | null> {
    const doc = await collections.roles().findOne({ organizationId: new ObjectId(organizationId), name });
    return doc as RoleDocument | null;
  }

  async create(input: CreateRoleInput & { organizationId: string; isSystem?: boolean; level?: number }): Promise<RoleDocument> {
    const now = new Date();
    const result = await collections.roles().insertOne({
      organizationId: new ObjectId(input.organizationId),
      name: input.name,
      description: input.description,
      permissionIds: input.permissionIds,
      isSystem: input.isSystem || false,
      level: input.level ?? 0,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.roles().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create role');
    return doc as RoleDocument;
  }

  async update(id: string, organizationId: string, input: UpdateRoleInput): Promise<RoleDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.name !== undefined) update.name = input.name;
    if (input.description !== undefined) update.description = input.description;
    if (input.permissionIds !== undefined) update.permissionIds = input.permissionIds;
    if (input.level !== undefined) update.level = input.level;

    await collections.roles().updateOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) }, { $set: update });
    return this.findById(id, organizationId);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    await collections.roles().deleteOne({ _id: new ObjectId(id), organizationId: new ObjectId(organizationId) });
  }

  async createRolePermission(roleId: string, organizationId: string, permission: string, scope: string): Promise<void> {
    await collections.rolePermissions().insertOne({
      roleId: new ObjectId(roleId),
      organizationId: new ObjectId(organizationId),
      permission,
      scope: scope as 'NONE' | 'OWN' | 'TEAM' | 'ORGANIZATION' | 'GLOBAL',
      createdAt: new Date(),
    } as any);
  }

  async deleteRolePermissionsByRole(roleId: string): Promise<void> {
    await collections.rolePermissions().deleteMany({ roleId: new ObjectId(roleId) });
  }

  async findPermissionsByRoleId(roleId: string): Promise<{ permission: string; scope: string }[]> {
    const docs = await collections.rolePermissions().find({ roleId: new ObjectId(roleId) }).toArray();
    return docs.map((doc: any) => ({
      permission: doc.permission,
      scope: doc.scope,
    }));
  }

  toResponse(doc: RoleDocument | null): RoleResponse | null {
    if (!doc) return null;
    return toResponse(doc);
  }
}
