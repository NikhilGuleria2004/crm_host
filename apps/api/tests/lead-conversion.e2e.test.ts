import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createLeadsRoutes } from '../src/modules/leads/leads.routes';

const mockQueue = { enqueue: vi.fn().mockResolvedValue('mock-job-id') };

vi.mock('../src/queue/factory', () => ({
  createQueue: () => mockQueue,
}));

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
const userId = new ObjectId().toHexString();
const leadId = new ObjectId().toHexString();
const companyId = new ObjectId().toHexString();
const pipelineId = new ObjectId().toHexString();
const stageId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

const mockLead = {
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
  ownerId: new ObjectId(),
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

describe('P20 Lead Conversion E2E', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'leads.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockLeads.findOne.mockResolvedValue({ ...mockLead });
    mockLeads.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockUsers.findOne.mockResolvedValue({ firstName: 'John', lastName: 'Doe' });
    mockContacts.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockContacts.findOne.mockResolvedValue({ _id: new ObjectId(), firstName: 'John', lastName: 'Doe', email: 'john@example.com' });
    mockCompanies.insertOne.mockResolvedValue({ insertedId: new ObjectId(companyId) });
    mockCompanies.findOne.mockResolvedValue({ _id: new ObjectId(companyId), name: 'Acme Corp' });
    mockDeals.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockDeals.findOne.mockResolvedValue({ _id: new ObjectId(), name: 'Example Opportunity' });
    mockActivities.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockOutboxEvents.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    mockAuditLogs.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it('should convert lead with full transactional side effects', async () => {
    const app = createAppWithAuth();
    const res = await app.request(`/api/v1/leads/${leadId}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        createContact: true,
        createCompany: true,
        createDeal: true,
        company: { name: 'Acme Corp' },
        deal: {
          name: 'Example Opportunity',
          pipelineId,
          stageId,
          amount: 100000,
          currency: 'INR',
        },
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.data.lead.status).toBe('converted');
    expect(json.data.contact).toBeDefined();
    expect(json.data.company).toBeDefined();
    expect(json.data.deal).toBeDefined();

    expect(mockContacts.insertOne).toHaveBeenCalledTimes(1);
    expect(mockCompanies.insertOne).toHaveBeenCalledTimes(1);
    expect(mockDeals.insertOne).toHaveBeenCalledTimes(1);
    expect(mockActivities.insertOne).toHaveBeenCalledTimes(1);
    expect(mockAuditLogs.insertOne).toHaveBeenCalledTimes(1);

    const { createQueue } = await import('../src/queue/factory');
    const queue = createQueue();
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        type: 'outbox',
        payload: expect.objectContaining({
          type: 'lead.converted',
        }),
      })
    );
  });

  it('should create activity and outbox event even for contact-only conversion', async () => {
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
    expect(json.data.contact).toBeDefined();
    expect(json.data.company).toBeUndefined();
    expect(json.data.deal).toBeUndefined();

    expect(mockContacts.insertOne).toHaveBeenCalledTimes(1);
    expect(mockActivities.insertOne).toHaveBeenCalledTimes(1);
    expect(mockAuditLogs.insertOne).toHaveBeenCalledTimes(1);

    const { createQueue } = await import('../src/queue/factory');
    const queue = createQueue();
    expect(queue.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        version: 1,
        type: 'outbox',
        payload: expect.objectContaining({
          type: 'lead.converted',
        }),
      })
    );
  });

  it('should be idempotent and reject double conversion', async () => {
    mockLeads.findOne.mockResolvedValue({ ...mockLead, status: 'converted' });

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

    expect(res.status).toBe(404);
  });
});
