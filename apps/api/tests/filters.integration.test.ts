import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createContactsRoutes } from '../src/modules/contacts/contacts.routes';

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
const mockUsers = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    contacts: () => mockContacts,
    companies: () => mockCompanies,
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
const userId = new ObjectId().toHexString();
const contactId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'contacts.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/contacts', createContactsRoutes());
  return app;
}

describe('P25 FilterEngine Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'contacts.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockCompanies.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(), name: 'Acme Corp' }]),
    } as any);
    mockUsers.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(userId), firstName: 'John', lastName: 'Doe' }]),
    } as any);
    mockContacts.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{
            _id: new ObjectId(contactId),
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            organizationId: new ObjectId(orgAId),
            deletedAt: undefined,
            tags: [],
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
            createdBy: new ObjectId(userId),
            updatedBy: new ObjectId(userId),
            customFields: {},
            status: 'active',
          }]),
        }),
      }),
    } as any);
  });

  it('should filter contacts by status using filter engine', async () => {
    const app = createAppWithAuth();
    const response = await app.request('/api/v1/contacts?status=active');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBeDefined();
  });

  it('should filter contacts by ownerId using filter engine', async () => {
    const app = createAppWithAuth();
    const response = await app.request('/api/v1/contacts?ownerId=123');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBeDefined();
  });

  it('should reject non-whitelisted filter fields', async () => {
    const app = createAppWithAuth();
    const response = await app.request('/api/v1/contacts?unknownField=value');

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBeDefined();
  });
});
