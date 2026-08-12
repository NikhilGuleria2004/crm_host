import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createLeadsRoutes } from '../src/modules/leads/leads.routes';

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

const mockLeads = createMockCollection();
const mockUsers = createMockCollection();
const mockContacts = createMockCollection();
const mockCompanies = createMockCollection();
const mockDeals = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();
const mockActivities = createMockCollection();
const mockOutboxEvents = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    leads: () => mockLeads,
    users: () => mockUsers,
    contacts: () => mockContacts,
    companies: () => mockCompanies,
    deals: () => mockDeals,
    auditLogs: () => mockAuditLogs,
    rolePermissions: () => mockRolePermissions,
    activities: () => mockActivities,
    outboxEvents: () => mockOutboxEvents,
    queueJobs: () => ({
      findOne: vi.fn().mockResolvedValue(null),
      insertOne: vi.fn().mockResolvedValue({ insertedId: new (require('mongodb').ObjectId)() }),
    }),
  },
}));

const orgAId = new ObjectId().toHexString();
const orgBId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const leadId = new ObjectId().toHexString();
const ownerId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockLeadData = {
  _id: new ObjectId(leadId),
  organizationId: new ObjectId(orgAId),
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  emailNormalized: 'john@example.com',
  phone: '+1234567890',
  companyName: 'Acme Corp',
  source: 'website',
  status: 'new',
  ownerId: new ObjectId(ownerId),
  score: 72,
  tags: [],
  customFields: {},
  convertedAt: undefined,
  convertedContactId: undefined,
  convertedCompanyId: undefined,
  convertedDealId: undefined,
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
    c.set('permissions', overrides.permissions || [{ permission: 'leads.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/leads', createLeadsRoutes());
  return app;
}

describe('P17 Leads Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLeadData = {
      _id: new ObjectId(leadId),
      organizationId: new ObjectId(orgAId),
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      emailNormalized: 'john@example.com',
      phone: '+1234567890',
      companyName: 'Acme Corp',
      source: 'website',
      status: 'new',
      ownerId: new ObjectId(ownerId),
      score: 72,
      tags: [],
      customFields: {},
      convertedAt: undefined,
      convertedContactId: undefined,
      convertedCompanyId: undefined,
      convertedDealId: undefined,
      createdBy: new ObjectId(userId),
      updatedBy: new ObjectId(userId),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'leads.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockUsers.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(ownerId), firstName: 'John', lastName: 'Doe' }]),
    } as any);
    mockLeads.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === leadId && !query.organizationId) {
        return Promise.resolve({ ...mockLeadData, _id: new ObjectId(leadId) });
      }
      if (query._id?.toString() === leadId && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockLeadData, _id: new ObjectId(leadId), organizationId: new ObjectId(orgAId) });
      }
      if (query.emailNormalized === 'jane@example.com' && query.organizationId?.toString() === orgAId) {
        return Promise.resolve({ ...mockLeadData, _id: new ObjectId(), email: 'jane@example.com', emailNormalized: 'jane@example.com' });
      }
      return Promise.resolve(null);
    });
    mockLeads.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockLeadData, _id: new ObjectId(leadId) }]),
        }),
      }),
    } as any);
    mockLeads.insertOne.mockResolvedValue({ insertedId: new ObjectId(leadId) });
    mockLeads.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === leadId) {
        mockLeadData = { ...mockLeadData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
    mockContacts.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockContacts.findOne.mockResolvedValue({ _id: new ObjectId(), firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
    mockCompanies.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockCompanies.findOne.mockResolvedValue({ _id: new ObjectId(), name: 'Acme Corp' });
    mockDeals.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockDeals.findOne.mockResolvedValue({ _id: new ObjectId(), name: 'Example Opportunity' });
    mockActivities.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockOutboxEvents.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  describe('GET /api/v1/leads', () => {
    it('should list leads', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.meta.limit).toBe(50);
    });

    it('should return 403 without organization context', async () => {
      const app = createAppWithAuth({ organizationId: null });
      const res = await app.request('/api/v1/leads');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/leads', () => {
    it('should create a lead', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'John', email: 'john@example.com' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.firstName).toBe('John');
    });

    it('should return 422 on validation error', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.status).toBe(422);
    });

    it('should return 409 on duplicate email', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'John', email: 'jane@example.com' }),
      });
      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    it('should get a lead by id', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${leadId}`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(leadId);
    });

    it('should return 404 when lead not found', async () => {
      mockLeads.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${new ObjectId().toHexString()}`);
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant access', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/leads/${leadId}`);
      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/leads/:id', () => {
    it('should update a lead', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.firstName).toBe('Jane');
    });

    it('should return 404 when lead not found', async () => {
      mockLeads.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${new ObjectId().toHexString()}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' }),
      });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    it('should soft delete a lead', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${leadId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.id).toBe(leadId);
      expect(json.data.status).toBe('deleted');
    });

    it('should return 404 when lead not found', async () => {
      mockLeads.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${new ObjectId().toHexString()}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const res = await app.request(`/api/v1/leads/${leadId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/v1/leads/bulk/delete', () => {
    it('should bulk delete leads', async () => {
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [leadId] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.deleted).toBe(1);
    });

    it('should track failures for missing leads', async () => {
      mockLeads.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request('/api/v1/leads/bulk/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: ['nonexistent'] }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.failed).toBe(1);
    });
  });

  describe('POST /api/v1/leads/:id/convert', () => {
    it('should convert a lead', async () => {
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${leadId}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          createContact: true,
          createCompany: false,
          createDeal: false,
        }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.lead.status).toBe('converted');
    });

    it('should return 404 when lead not found', async () => {
      mockLeads.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/leads/${new ObjectId().toHexString()}/convert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ createContact: true }),
      });
      expect(res.status).toBe(404);
    });
  });
});
