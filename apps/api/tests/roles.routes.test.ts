import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createRolesRoutes } from '../src/modules/roles/roles.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
  };
}

const mockRoles = createMockCollection();
const mockRolePermissions = createMockCollection();
const mockAuditLogs = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    roles: () => mockRoles,
    rolePermissions: () => mockRolePermissions,
    auditLogs: () => mockAuditLogs,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();
const adminRoleId = new ObjectId().toHexString();

const mockRoleData = {
  _id: new ObjectId(roleId),
  organizationId: new ObjectId(orgAId),
  name: 'Sales Rep',
  description: 'Sales role',
  permissionIds: ['contacts.read', 'contacts.create'],
  isSystem: false,
  level: 2,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockAdminRoleData = {
  _id: new ObjectId(adminRoleId),
  organizationId: new ObjectId(orgAId),
  name: 'Administrator',
  description: 'Admin role',
  permissionIds: ['*'],
  isSystem: true,
  level: 4,
  createdAt: new Date(),
  updatedAt: new Date(),
};

let rolesStore: any[] = [];
let rolePermissionsStore: any[] = [];

function setupStores() {
  rolesStore = [
    { ...mockRoleData },
    { ...mockAdminRoleData },
  ];
  rolePermissionsStore = [
    { _id: new ObjectId(), roleId: new ObjectId(roleId), organizationId: new ObjectId(orgAId), permission: 'contacts.read', scope: 'ORGANIZATION', createdAt: new Date() },
    { _id: new ObjectId(), roleId: new ObjectId(roleId), organizationId: new ObjectId(orgAId), permission: 'contacts.create', scope: 'ORGANIZATION', createdAt: new Date() },
    { _id: new ObjectId(), roleId: new ObjectId(adminRoleId), organizationId: new ObjectId(orgAId), permission: '*', scope: 'ORGANIZATION', createdAt: new Date() },
  ];
}

function createFindReturn(data: any[]) {
  const sort = vi.fn().mockReturnValue({
    limit: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(data),
    }),
  });
  const cursor = {
    sort,
    toArray: vi.fn().mockResolvedValue(data),
  };
  return cursor;
}

function setupRoleMocks() {
  mockRoles.findOne.mockImplementation((query: any) => {
    if (query._id && query.organizationId) {
      const idStr = query._id.toString();
      const orgStr = query.organizationId.toString();
      const role = rolesStore.find((r) => r._id.toString() === idStr && r.organizationId.toString() === orgStr);
      return Promise.resolve(role ? { ...role } : null);
    }
    if (query._id) {
      const idStr = query._id.toString();
      const role = rolesStore.find((r) => r._id.toString() === idStr);
      return Promise.resolve(role ? { ...role } : null);
    }
    if (query.name && query.organizationId) {
      const orgStr = query.organizationId.toString();
      const role = rolesStore.find((r) => r.name === query.name && r.organizationId.toString() === orgStr);
      return Promise.resolve(role ? { ...role } : null);
    }
    return Promise.resolve(null);
  });

  mockRoles.find.mockImplementation((query: any) => {
    let results = [...rolesStore];
    if (query.organizationId) {
      const orgStr = query.organizationId.toString();
      results = results.filter((r) => r.organizationId.toString() === orgStr);
    }
    return createFindReturn(results);
  });

  mockRoles.insertOne.mockImplementation((doc: any) => {
    const _id = new ObjectId();
    const newDoc = { ...doc, _id };
    rolesStore.push(newDoc);
    return Promise.resolve({ insertedId: _id });
  });

  mockRoles.updateOne.mockImplementation((query: any, update: any) => {
    const idStr = query._id?.toString();
    const idx = rolesStore.findIndex((r) => r._id.toString() === idStr);
    if (idx >= 0) {
      rolesStore[idx] = { ...rolesStore[idx], ...update.$set };
      return Promise.resolve({ modifiedCount: 1 });
    }
    return Promise.resolve({ modifiedCount: 0 });
  });

  mockRoles.deleteOne.mockImplementation((query: any) => {
    const idStr = query._id?.toString();
    const idx = rolesStore.findIndex((r) => r._id.toString() === idStr);
    if (idx >= 0) {
      rolesStore.splice(idx, 1);
      return Promise.resolve({ deletedCount: 1 });
    }
    return Promise.resolve({ deletedCount: 0 });
  });

  mockRolePermissions.find.mockImplementation((query: any) => {
    if (query.roleId?.$in) {
      const ids = query.roleId.$in.map((id: any) => id.toString());
      const perms = rolePermissionsStore.filter((p) => ids.includes(p.roleId.toString()));
      return createFindReturn(perms);
    }
    if (query.roleId) {
      const idStr = query.roleId.toString();
      const perms = rolePermissionsStore.filter((p) => p.roleId.toString() === idStr);
      return createFindReturn(perms);
    }
    return createFindReturn(rolePermissionsStore);
  });

  mockRolePermissions.insertOne.mockImplementation((doc: any) => {
    const _id = new ObjectId();
    const newDoc = { ...doc, _id };
    rolePermissionsStore.push(newDoc);
    return Promise.resolve({ insertedId: _id });
  });

  mockRolePermissions.deleteMany.mockImplementation((query: any) => {
    if (query.roleId) {
      const idStr = query.roleId.toString();
      const initialLen = rolePermissionsStore.length;
      rolePermissionsStore = rolePermissionsStore.filter((p) => p.roleId.toString() !== idStr);
      return Promise.resolve({ deletedCount: initialLen - rolePermissionsStore.length });
    }
    return Promise.resolve({ deletedCount: 0 });
  });
}

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [adminRoleId], teamIds: [] });
    await next();
  });
  app.route('/api/v1/roles', createRolesRoutes());
  return app;
}

describe('P33 Roles Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStores();
    setupRoleMocks();
  });

  describe('GET /api/v1/roles', () => {
    it('should list roles when authorized', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/roles');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(2);
    });

    it('should return 403 without permission', async () => {
      mockRolePermissions.find.mockImplementation(() => createFindReturn([]));

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/roles');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/roles', () => {
    it('should create a role', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Role', permissionIds: ['contacts.read'] }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('New Role');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });

    it('should return 409 on duplicate name', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Administrator', permissionIds: ['contacts.read'] }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/roles/:id', () => {
    it('should get a role by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${roleId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(roleId);
    });

    it('should return 404 when role not found', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/roles/:id', () => {
    it('should update a role', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Role' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('Updated Role');
    });

    it('should return 403 when updating system role', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${adminRoleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      expect(res.status).toBe(403);
    });

    it('should return 403 on privilege escalation', async () => {
      const salesRoleId = new ObjectId().toHexString();
      const salesRole = { ...mockRoleData, _id: new ObjectId(salesRoleId), name: 'Sales', level: 1, permissionIds: [] };
      rolesStore.push(salesRole);
      rolePermissionsStore.push({
        _id: new ObjectId(),
        roleId: new ObjectId(salesRoleId),
        organizationId: new ObjectId(orgAId),
        permission: 'contacts.read',
        scope: 'ORGANIZATION',
        createdAt: new Date(),
      });

      const app = createAppWithAuth({ user: { id: userId, status: 'active', roleIds: [salesRoleId], teamIds: [] } });
      const res = await app.request(`/api/v1/roles/${roleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissionIds: ['users.delete'] }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/roles/:id', () => {
    it('should delete a role', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${roleId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(roleId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 403 when deleting system role', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${adminRoleId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/roles/:id/clone', () => {
    it('should clone a role', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/roles/${roleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Sales Rep (Copy)' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Sales Rep (Copy)');
    });

    it('should return 403 on privilege escalation when cloning', async () => {
      const salesRoleId = new ObjectId().toHexString();
      const salesRole = { ...mockRoleData, _id: new ObjectId(salesRoleId), name: 'Sales', level: 1, permissionIds: [] };
      rolesStore.push(salesRole);
      rolePermissionsStore.push({
        _id: new ObjectId(),
        roleId: new ObjectId(salesRoleId),
        organizationId: new ObjectId(orgAId),
        permission: 'contacts.read',
        scope: 'ORGANIZATION',
        createdAt: new Date(),
      });

      const app = createAppWithAuth({ user: { id: userId, status: 'active', roleIds: [salesRoleId], teamIds: [] } });
      const res = await app.request(`/api/v1/roles/${roleId}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Escalated Clone', permissionIds: ['users.delete'] }),
      });
      expect(res.status).toBe(403);
    });

    it('should return empty list for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request('/api/v1/roles');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(0);
    });
  });
});
