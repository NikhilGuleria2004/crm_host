import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createWebhooksRoutes } from '../src/modules/webhooks/webhooks.routes';

function createMockCollection() {
  return {
    findOne: vi.fn(),
    find: vi.fn(),
    countDocuments: vi.fn(),
    aggregate: vi.fn(),
    updateOne: vi.fn(),
    updateMany: vi.fn(),
    insertOne: vi.fn(),
    deleteOne: vi.fn(),
    deleteMany: vi.fn(),
  };
}

const mockWebhooks = createMockCollection();
const mockWebhookDeliveries = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    webhooks: () => mockWebhooks,
    webhookDeliveries: () => mockWebhookDeliveries,
    rolePermissions: () => mockRolePermissions,
  },
}));

const orgAId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const webhookId = new ObjectId().toHexString();

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [], teamIds: [] });
    c.set('permissions', overrides.permissions || [
      { permission: 'webhooks.read', scope: 'ORGANIZATION' },
      { permission: 'webhooks.create', scope: 'ORGANIZATION' },
      { permission: 'webhooks.update', scope: 'ORGANIZATION' },
      { permission: 'webhooks.delete', scope: 'ORGANIZATION' },
    ]);
    await next();
  });
  app.route('/api/v1/webhooks', createWebhooksRoutes());
  return app;
}

describe('P37 Webhooks Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        { permission: 'webhooks.read', scope: 'ORGANIZATION' },
        { permission: 'webhooks.create', scope: 'ORGANIZATION' },
        { permission: 'webhooks.update', scope: 'ORGANIZATION' },
        { permission: 'webhooks.delete', scope: 'ORGANIZATION' },
      ]),
    } as any);
  });

  describe('GET /api/v1/webhooks', () => {
    it('should return webhooks list', async () => {
      mockWebhooks.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: new ObjectId(webhookId),
                organizationId: new ObjectId(orgAId),
                url: 'https://example.com/webhook',
                events: ['contact.created'],
                secret: 'secret',
                status: 'active',
                createdBy: new ObjectId(userId),
                createdAt: new Date(),
                updatedAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/webhooks');
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].url).toBe('https://example.com/webhook');
    });

    it('should return 403 without webhooks.read permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request('/api/v1/webhooks');
      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/v1/webhooks', () => {
    it('should create a webhook', async () => {
      mockWebhooks.insertOne.mockResolvedValue({ insertedId: new ObjectId(webhookId) } as any);
      mockWebhooks.findOne.mockResolvedValueOnce({
        _id: new ObjectId(webhookId),
        organizationId: new ObjectId(orgAId),
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'generated_secret',
        status: 'active',
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const app = createAppWithAuth();
      const res = await app.request('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/webhook', events: ['contact.created'], status: 'active' }),
      });
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.data.url).toBe('https://example.com/webhook');
      expect(json.data.secret).toBeDefined();
    });

    it('should return 403 without webhooks.create permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request('/api/v1/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/webhook', events: ['contact.created'], status: 'active' }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/webhooks/:id', () => {
    it('should update a webhook', async () => {
      mockWebhooks.findOne.mockResolvedValueOnce({
        _id: new ObjectId(webhookId),
        organizationId: new ObjectId(orgAId),
        url: 'https://example.com/new-webhook',
        events: ['deal.created'],
        secret: 'secret',
        status: 'inactive',
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockWebhooks.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/new-webhook', events: ['deal.created'], status: 'inactive' }),
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.url).toBe('https://example.com/new-webhook');
      expect(json.data.status).toBe('inactive');
      expect(mockWebhooks.updateOne).toHaveBeenCalledWith(
        { _id: new ObjectId(webhookId), organizationId: new ObjectId(orgAId) },
        { $set: { url: 'https://example.com/new-webhook', events: ['deal.created'], status: 'inactive', updatedAt: expect.any(Date) } }
      );
    });

    it('should return 403 without webhooks.update permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request(`/api/v1/webhooks/${webhookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: 'https://example.com/new-webhook' }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/v1/webhooks/:id', () => {
    it('should delete a webhook', async () => {
      mockWebhooks.findOne.mockResolvedValueOnce({
        _id: new ObjectId(webhookId),
        organizationId: new ObjectId(orgAId),
        url: 'https://example.com/webhook',
        events: ['contact.created'],
        secret: 'secret',
        status: 'active',
        createdBy: new ObjectId(userId),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockWebhooks.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.status).toBe('deleted');
    });

    it('should return 403 without webhooks.delete permission', async () => {
      mockRolePermissions.find.mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      } as any);
      const app = createAppWithAuth({ permissions: [] });
      const res = await app.request(`/api/v1/webhooks/${webhookId}`, {
        method: 'DELETE',
      });
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/webhooks/:id/deliveries', () => {
    it('should return webhook deliveries', async () => {
      mockWebhookDeliveries.find.mockReturnValue({
        sort: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            toArray: vi.fn().mockResolvedValue([
              {
                _id: new ObjectId(),
                webhookId: new ObjectId(webhookId),
                organizationId: new ObjectId(orgAId),
                eventId: 'event1',
                eventType: 'contact.created',
                payload: {},
                attempt: 1,
                status: 'delivered',
                responseCode: 200,
                duration: 100,
                createdAt: new Date(),
              },
            ]),
          }),
        }),
      } as any);

      const app = createAppWithAuth();
      const res = await app.request(`/api/v1/webhooks/${webhookId}/deliveries`);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data).toHaveLength(1);
      expect(json.data[0].eventType).toBe('contact.created');
    });
  });
});
