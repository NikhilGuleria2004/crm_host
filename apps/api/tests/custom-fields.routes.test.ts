import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createCustomFieldsRoutes } from '../src/modules/custom-fields/custom-fields.routes';

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

const mockCustomFieldDefinitions = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    customFieldDefinitions: () => mockCustomFieldDefinitions,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const fieldId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'custom_fields.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/custom-fields', createCustomFieldsRoutes());
  return app;
}

describe('P28 Custom Fields Routes', () => {
  let mockField: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'custom_fields.*', scope: 'ORGANIZATION' }]),
    } as any);

    mockField = {
      _id: new ObjectId(fieldId),
      organizationId: new ObjectId(orgAId),
      entity: 'contact',
      key: 'customerTier',
      label: 'Customer Tier',
      type: 'select',
      required: false,
      options: ['Standard', 'Premium', 'Enterprise'],
      order: 1,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
    };

    mockCustomFieldDefinitions.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === fieldId) {
        return Promise.resolve({ ...mockField });
      }
      return Promise.resolve(null);
    });

    mockCustomFieldDefinitions.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockField }]),
        }),
      }),
    } as any);

    mockCustomFieldDefinitions.insertOne.mockReturnValue({
      insertedId: new ObjectId(fieldId),
    } as any);

    mockCustomFieldDefinitions.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === fieldId && update.$set) {
        Object.assign(mockField, update.$set);
      }
      return Promise.resolve({ modifiedCount: 1 } as any);
    });

    mockCustomFieldDefinitions.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);
  });

  describe('POST /custom-fields', () => {
    it('should create custom field', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'contact',
          key: 'customerTier',
          label: 'Customer Tier',
          type: 'select',
          required: false,
          options: ['Standard', 'Premium', 'Enterprise'],
          order: 1,
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.label).toBe('Customer Tier');
    });

    it('should normalize key to lowercase with underscores', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/custom-fields', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entity: 'contact',
          key: 'Customer Tier',
          label: 'Customer Tier',
          type: 'select',
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe('GET /custom-fields', () => {
    it('should list custom fields', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/custom-fields');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].entity).toBe('contact');
    });

    it('should filter by entity', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/custom-fields?entity=contact');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
    });
  });

  describe('GET /custom-fields/:id', () => {
    it('should return custom field by id', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/custom-fields/${fieldId}`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(fieldId);
      expect(data.data.key).toBe('customerTier');
    });

    it('should return 404 for non-existent field', async () => {
      mockCustomFieldDefinitions.findOne.mockResolvedValue(null);
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/custom-fields/000000000000000000000000');

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /custom-fields/:id', () => {
    it('should update custom field', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/custom-fields/${fieldId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          label: 'Updated Tier',
        }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.label).toBe('Updated Tier');
    });
  });

  describe('DELETE /custom-fields/:id', () => {
    it('should delete custom field', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/custom-fields/${fieldId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.id).toBe(fieldId);
      expect(data.data.status).toBe('deleted');
    });
  });
});
