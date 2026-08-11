import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createSearchRoutes } from '../src/modules/search/search.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    updateOne: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
  };
}

const mockContacts = createMockCollection();
const mockCompanies = createMockCollection();
const mockDeals = createMockCollection();
const mockTasks = createMockCollection();
const mockLeads = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    contacts: () => mockContacts,
    companies: () => mockCompanies,
    deals: () => mockDeals,
    tasks: () => mockTasks,
    leads: () => mockLeads,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const contactId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const dealId = new ObjectId().toHexString();
const taskId = new ObjectId().toHexString();
const leadId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createChainableMock(data: any[]) {
  return {
    limit: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue(data),
    }),
  };
}

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'search.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/search', createSearchRoutes());
  return app;
}

describe('P24 Search Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'search.*', scope: 'ORGANIZATION' }]),
    } as any);

    const contactDoc = { _id: new ObjectId(contactId), firstName: 'John', lastName: 'Doe', email: 'john@example.com', organizationId: new ObjectId(orgAId), deletedAt: undefined };
    const companyDoc = { _id: new ObjectId(companyId), name: 'Acme Corp', organizationId: new ObjectId(orgAId), deletedAt: undefined };
    const dealDoc = { _id: new ObjectId(dealId), name: 'Enterprise Deal', amount: 100000, currency: 'USD', organizationId: new ObjectId(orgAId) };
    const taskDoc = { _id: new ObjectId(taskId), title: 'Send proposal', status: 'open', organizationId: new ObjectId(orgAId) };
    const leadDoc = { _id: new ObjectId(leadId), firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', organizationId: new ObjectId(orgAId), deletedAt: undefined };

    mockContacts.find.mockImplementation((query: any) => {
      if (query.organizationId?.toString() === orgAId) {
        return createChainableMock([contactDoc]) as any;
      }
      return createChainableMock([]) as any;
    });
    mockCompanies.find.mockImplementation((query: any) => {
      if (query.organizationId?.toString() === orgAId) {
        return createChainableMock([companyDoc]) as any;
      }
      return createChainableMock([]) as any;
    });
    mockDeals.find.mockImplementation((query: any) => {
      if (query.organizationId?.toString() === orgAId) {
        return createChainableMock([dealDoc]) as any;
      }
      return createChainableMock([]) as any;
    });
    mockTasks.find.mockImplementation((query: any) => {
      if (query.organizationId?.toString() === orgAId) {
        return createChainableMock([taskDoc]) as any;
      }
      return createChainableMock([]) as any;
    });
    mockLeads.find.mockImplementation((query: any) => {
      if (query.organizationId?.toString() === orgAId) {
        return createChainableMock([leadDoc]) as any;
      }
      return createChainableMock([]) as any;
    });
  });

  describe('GET /api/v1/search', () => {
    it('should search across all entities', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/search?q=acme');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
      expect(Array.isArray(data.data)).toBe(true);
    });

    it('should filter by types', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/search?q=acme&types=contacts,companies');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toBeDefined();
    });

    it('should require authentication', async () => {
      const app = new Hono();
      app.route('/api/v1/search', createSearchRoutes());
      const response = await app.request('/api/v1/search?q=acme');

      expect(response.status).toBe(401);
    });

    it('should require organization context', async () => {
      const app = new Hono();
      app.use('*', async (c, next) => {
        c.set('organizationId', '');
        c.set('user', { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
        c.set('permissions', [{ permission: 'search.*', scope: 'ORGANIZATION' }]);
        await next();
      });
      app.route('/api/v1/search', createSearchRoutes());
      const response = await app.request('/api/v1/search?q=acme');

      expect(response.status).toBe(403);
    });

    it('should enforce cross-tenant isolation', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const response = await app.request('/api/v1/search?q=acme');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(0);
    });
  });
});
