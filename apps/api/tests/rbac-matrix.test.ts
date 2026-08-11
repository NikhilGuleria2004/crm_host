import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { authenticate } from '../src/middleware/auth';
import { organizationContext } from '../src/middleware/organization';
import { authorize, checkRecordScope } from '../src/middleware/authorization';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };
}

const mockSessions = createMockCollection();
const mockUsers = createMockCollection();
const mockMemberships = createMockCollection();
const mockRolePermissions = createMockCollection();
const mockRoles = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    sessions: () => mockSessions,
    users: () => mockUsers,
    organizationMemberships: () => mockMemberships,
    rolePermissions: () => mockRolePermissions,
    roles: () => mockRoles,
  },
}));

function createHonoContext(overrides: any = {}): any {
  const store = new Map<string, any>();
  
  return {
    req: {
      cookie: vi.fn(),
      header: vi.fn(),
      path: '/api/v1/test',
      method: 'GET',
      json: vi.fn(() => Promise.resolve({})),
    },
    res: { status: 200 },
    json: vi.fn((data, status) => ({ data, status })),
    set: vi.fn((key: string, value: any) => { store.set(key, value); }),
    get: vi.fn((key: string) => store.get(key) ?? overrides[key] ?? null),
    ...overrides,
  };
}

describe('RBAC Test Matrix (Implementation.md §6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. Admin can manage users / Sales rep cannot', () => {
    it('should allow admin to access users.manage', async () => {
      const adminRoleId = new ObjectId().toHexString();
      
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{
          permission: 'users.*',
          scope: 'ORGANIZATION',
        }]),
      } as any);
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [adminRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
      });
      
      const middleware = await authorize('users.manage');
      const result = await middleware(c, vi.fn());
      
      expect(result).toBeUndefined();
      expect(c.set).toHaveBeenCalledWith('permissions', [{ permission: 'users.*', scope: 'ORGANIZATION' }]);
    });

    it('should deny sales rep access to users.manage', async () => {
      const salesRoleId = new ObjectId().toHexString();
      
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [salesRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
      });
      
      const middleware = await authorize('users.manage');
      const result = await middleware(c, vi.fn());
      
      expect(result).toEqual({
        data: { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        status: 403,
      });
    });
  });

  describe('2. Viewer cannot create contacts', () => {
    it('should deny viewer access to contacts.create', async () => {
      const viewerRoleId = new ObjectId().toHexString();
      
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [viewerRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
      });
      
      const middleware = await authorize('contacts.create');
      const result = await middleware(c, vi.fn());
      
      expect(result).toEqual({
        data: { error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } },
        status: 403,
      });
    });
  });

  describe('3. Sales rep can edit own deal / cannot edit another rep deal', () => {
    it('should allow sales rep to edit own deal', async () => {
      const salesRoleId = new ObjectId().toHexString();
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [salesRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
        permissions: [{ permission: 'deals.update', scope: 'OWN' }],
      });
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordOwnerId: 'user1',
      });
      
      expect(result).toBeUndefined();
    });

    it('should deny sales rep editing another rep deal', async () => {
      const salesRoleId = new ObjectId().toHexString();
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [salesRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
        permissions: [{ permission: 'deals.update', scope: 'OWN' }],
      });
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordOwnerId: 'user2',
      });
      
      expect(result).toEqual({
        data: { error: { code: 'FORBIDDEN', message: 'You do not own this record' } },
        status: 403,
      });
    });
  });

  describe('4. Manager can edit team deals / cannot edit other-team deals', () => {
    it('should allow manager to edit team deal', async () => {
      const managerRoleId = new ObjectId().toHexString();
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [managerRoleId], status: 'active', teamIds: ['team1'] },
        organizationId: 'org1',
        permissions: [{ permission: 'deals.update', scope: 'TEAM' }],
      });
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordTeamIds: ['team1'],
      });
      
      expect(result).toBeUndefined();
    });

    it('should deny manager editing other-team deal', async () => {
      const managerRoleId = new ObjectId().toHexString();
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [managerRoleId], status: 'active', teamIds: ['team1'] },
        organizationId: 'org1',
        permissions: [{ permission: 'deals.update', scope: 'TEAM' }],
      });
      
      const result = await checkRecordScope(c, {
        resource: 'deals.update',
        recordTeamIds: ['team2'],
      });
      
      expect(result).toEqual({
        data: { error: { code: 'FORBIDDEN', message: 'You are not a member of the team that owns this record' } },
        status: 403,
      });
    });
  });

  describe('5. Org A cannot access Org B', () => {
    it('should isolate organization data', async () => {
      const orgAId = new ObjectId().toHexString();
      
      mockSessions.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId: new ObjectId(),
        organizationId: new ObjectId(orgAId),
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
      });
      
      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(),
        email: 'user@orga.com',
        status: 'active',
        roleIds: [],
        teamIds: [],
      });
      
      mockMemberships.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId: new ObjectId(),
        organizationId: new ObjectId(orgAId),
        roleId: new ObjectId(),
        status: 'active',
        teamIds: [],
      });
      
      const c = createHonoContext({
        req: { cookie: vi.fn(() => 'session_token') },
      });
      
      await authenticate(c, vi.fn());
      
      const user = c.get('user');
      expect(user?.organizationId).toBe(orgAId);
      
      const next = vi.fn();
      await organizationContext(c, next);
      
      const orgId = c.get('organizationId');
      expect(orgId).toBe(orgAId);
    });
  });

  describe('6. Suspended user cannot access the CRM', () => {
    it('should reject suspended user in authenticate', async () => {
      mockSessions.findOne.mockResolvedValue({
        _id: new ObjectId(),
        userId: new ObjectId(),
        organizationId: new ObjectId(),
        tokenHash: 'hash',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
      });
      
      mockUsers.findOne.mockResolvedValue({
        _id: new ObjectId(),
        email: 'suspended@example.com',
        status: 'suspended',
        roleIds: [],
        teamIds: [],
      });
      
      const c = createHonoContext({
        req: { cookie: vi.fn(() => 'session_token') },
      });
      
      await authenticate(c, vi.fn());
      
      expect(c.get('user')).toBeNull();
      expect(c.get('organizationId')).toBeNull();
    });
  });

  describe('7. Privilege escalation attempts are rejected', () => {
    it('should reject sales manager assigning administrator role', async () => {
      const salesManagerRoleId = new ObjectId().toHexString();
      const adminRoleId = new ObjectId().toHexString();
      
      mockRoles.findOne.mockImplementation((query: any) => {
        if (query._id && query._id.toString() === salesManagerRoleId) {
          return Promise.resolve({ _id: new ObjectId(salesManagerRoleId), level: 3 });
        }
        if (query._id && query._id.toString() === adminRoleId) {
          return Promise.resolve({ _id: new ObjectId(adminRoleId), level: 4 });
        }
        return Promise.resolve(null);
      });
      
      const c = createHonoContext({
        user: { id: 'user1', roleIds: [salesManagerRoleId], status: 'active', teamIds: [] },
        organizationId: 'org1',
        req: { 
          cookie: vi.fn(() => 'session_token'),
          json: vi.fn(() => Promise.resolve({ userId: 'user2', roleId: adminRoleId })),
        },
      });
      
      const membershipService = {
        inviteUser: vi.fn(),
      };
      
      const roleService = {
        canAssignRole: vi.fn(async () => false),
      };
      
      const { createMembershipsController } = await import('../src/modules/memberships/memberships.controller');
      const controller = createMembershipsController(membershipService as any, roleService as any);
      
      const result = await controller.invite(c);
      
      expect(c.json).toHaveBeenCalledWith(
        { error: { code: 'FORBIDDEN', message: 'Cannot assign a role above your own' } },
        403
      );
    });
  });
});
