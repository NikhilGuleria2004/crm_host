import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createCompaniesRoutes } from '../src/modules/companies/companies.routes';

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

const mockCompanies = createMockCollection();
const mockContacts = createMockCollection();
const mockDeals = createMockCollection();
const mockUsers = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    companies: () => mockCompanies,
    contacts: () => mockContacts,
    deals: () => mockDeals,
    users: () => mockUsers,
    auditLogs: () => mockAuditLogs,
    rolePermissions: () => mockRolePermissions,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockCompanyData = {
  _id: new ObjectId(companyId),
  organizationId: new ObjectId(orgAId),
  name: 'Acme Corp',
  normalizedName: 'acme-corp',
  website: 'https://acme.com',
  email: 'contact@acme.com',
  phone: '+1234567890',
  industry: 'Technology',
  employeeCount: 100,
  annualRevenue: 5000000,
  ownerId: new ObjectId(ownerId),
  status: 'active',
  tags: [],
  customFields: {},
  address: { city: 'NYC' },
  description: 'A test company',
  createdBy: new ObjectId(userId),
  updatedBy: new ObjectId(userId),
  createdAt: new Date(),
  updatedAt: new Date(),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'companies.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/companies', createCompaniesRoutes());
  return app;
}

describe('P14 Companies Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompanyData = {
      _id: new ObjectId(companyId),
      organizationId: new ObjectId(orgAId),
      name: 'Acme Corp',
      normalizedName: 'acme-corp',
      website: 'https://acme.com',
      email: 'contact@acme.com',
      phone: '+1234567890',
      industry: 'Technology',
      employeeCount: 100,
      annualRevenue: 5000000,
      ownerId: new ObjectId(ownerId),
      status: 'active',
      tags: [],
      customFields: {},
      address: { city: 'NYC' },
      description: 'A test company',
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'companies.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockUsers.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(ownerId), firstName: 'John', lastName: 'Doe' }]),
    } as any);
    mockCompanies.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === companyId && !query.organizationId) {
        return Promise.resolve({ ...mockCompanyData });
      }
      if (query._id?.toString() === companyId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockCompanyData });
      }
      if (query.normalizedName === 'other-corp' && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockCompanyData, _id: new ObjectId(), normalizedName: 'other-corp', name: 'Other Corp' });
      }
      return Promise.resolve(null);
    });
    mockCompanies.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockCompanyData }]),
        }),
      }),
    } as any);
    mockCompanies.insertOne.mockResolvedValue({ insertedId: new ObjectId(companyId) });
    mockCompanies.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === companyId) {
        mockCompanyData = { ...mockCompanyData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockCompanies.countDocuments.mockResolvedValue(0);
    mockDeals.aggregate.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ count: 0, totalValue: 0 }]),
    } as any);
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
    mockContacts.countDocuments.mockResolvedValue(0);
  });

  describe('GET /api/v1/companies', () => {
    it('should list companies', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 400 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/companies');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/companies', () => {
    it('should create a company', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.name).toBe('Acme Corp');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });

    it('should return 409 on duplicate name', async () => {
      mockCompanies.findOne.mockImplementation((query: any) => {
        if (query._id?.toString() === companyId) {
          return Promise.resolve({ ...mockCompanyData });
        }
        if (query.normalizedName === 'acme-corp' && query.organizationId?.toString() === orgAId) {
          return Promise.resolve({ ...mockCompanyData, _id: new ObjectId(), normalizedName: 'acme-corp' });
        }
        return Promise.resolve(null);
      });

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Acme Corp' }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/companies/:id', () => {
    it('should get a company by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${companyId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(companyId);
    });

    it('should return 404 when company not found', async () => {
      mockCompanies.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/companies/${companyId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/companies/:id', () => {
    it('should update a company', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.name).toBe('New Name');
    });

    it('should return 404 when company not found', async () => {
      mockCompanies.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 409 on duplicate name', async () => {
      const otherId = new ObjectId().toHexString();
      mockCompanies.findOne.mockImplementation((query: any) => {
        if (query._id?.toString() === companyId) {
          return Promise.resolve({ ...mockCompanyData, normalizedName: 'acme-corp' });
        }
        if (query.normalizedName === 'other-corp' && query.organizationId?.toString() === orgAId) {
          return Promise.resolve({ ...mockCompanyData, _id: new ObjectId(otherId), normalizedName: 'other-corp', name: 'Other Corp' });
        }
        return Promise.resolve(null);
      });

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Other Corp' }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe('DELETE /api/v1/companies/:id', () => {
    it('should soft delete a company', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${companyId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(companyId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when company not found', async () => {
      mockCompanies.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/companies/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/companies/bulk/delete', () => {
    it('should bulk delete companies', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [companyId] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(1);
    });

    it('should track failures for missing companies', async () => {
      mockCompanies.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/companies/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['nonexistent'] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.failed).toBe(1);
    });
  });
});
