import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { Hono } from 'hono';
import { createTasksRoutes } from '../src/modules/tasks/tasks.routes';

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

const mockTasks = createMockCollection();
const mockUsers = createMockCollection();
const mockAuditLogs = createMockCollection();
const mockRolePermissions = createMockCollection();

vi.mock('../src/db/collections', () => ({
  collections: {
    tasks: () => mockTasks,
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
const taskId = new ObjectId().toHexString();
const assignedToId = new ObjectId().toHexString();
const roleId = new ObjectId().toHexString();

let mockTaskData = {
  _id: new ObjectId(taskId),
  organizationId: new ObjectId(orgAId),
  title: 'Send proposal',
  description: 'Prepare and send proposal.',
  status: 'open',
  priority: 'medium',
  dueDate: new Date('2026-08-10'),
  assignedTo: new ObjectId(assignedToId),
  contactId: new ObjectId(),
  companyId: new ObjectId(),
  dealId: new ObjectId(),
  leadId: undefined,
  reminderAt: new Date('2026-08-09T12:00:00.000Z'),
  completedAt: undefined,
  createdBy: new ObjectId(userId),
  createdAt: new Date('2026-08-09T10:00:00.000Z'),
  updatedAt: new Date('2026-08-09T10:00:00.000Z'),
};

function createAppWithAuth(overrides: any = {}) {
  const app = new Hono();
  app.use('*', async (c, next) => {
    const organizationId = overrides.organizationId !== undefined ? overrides.organizationId : orgAId;
    c.set('organizationId', organizationId);
    c.set('user', overrides.user || { id: userId, status: 'active', roleIds: [roleId], teamIds: [] });
    c.set('permissions', overrides.permissions || [{ permission: 'tasks.*', scope: 'ORGANIZATION' }]);
    await next();
  });
  app.route('/api/v1/tasks', createTasksRoutes());
  return app;
}

describe('P21 Tasks Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTaskData = {
      _id: new ObjectId(taskId),
      organizationId: new ObjectId(orgAId),
      title: 'Send proposal',
      description: 'Prepare and send proposal.',
      status: 'open',
      priority: 'medium',
      dueDate: new Date('2026-08-10'),
      assignedTo: new ObjectId(assignedToId),
      contactId: new ObjectId(),
      companyId: new ObjectId(),
      dealId: new ObjectId(),
      leadId: undefined,
      reminderAt: new Date('2026-08-09T12:00:00.000Z'),
      completedAt: undefined,
      createdBy: new ObjectId(userId),
      createdAt: new Date('2026-08-09T10:00:00.000Z'),
      updatedAt: new Date('2026-08-09T10:00:00.000Z'),
    };
    mockRolePermissions.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ permission: 'tasks.*', scope: 'ORGANIZATION' }]),
    } as any);
    mockUsers.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ _id: new ObjectId(assignedToId), firstName: 'Jane', lastName: 'Smith' }]),
    } as any);
    mockTasks.findOne.mockImplementation((query: any) => {
      if (query._id?.toString() === taskId) {
        if (query.organizationId && query.organizationId.toString() !== orgAId.toString()) {
          return Promise.resolve(null);
        }
        return Promise.resolve({ ...mockTaskData, _id: new ObjectId(taskId), organizationId: new ObjectId(orgAId) });
      }
      return Promise.resolve(null);
    });
    mockTasks.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([{ ...mockTaskData, _id: new ObjectId(taskId) }]),
        }),
      }),
    } as any);
    mockTasks.insertOne.mockResolvedValue({ insertedId: new ObjectId(taskId) });
    mockTasks.updateOne.mockImplementation((query: any, update: any) => {
      if (query._id?.toString() === taskId) {
        mockTaskData = { ...mockTaskData, ...update.$set };
      }
      return Promise.resolve({ modifiedCount: 1 });
    });
    mockTasks.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockUsers.findOne.mockResolvedValue({ _id: new ObjectId(assignedToId), firstName: 'Jane', lastName: 'Smith' });
  });

  describe('GET /api/v1/tasks', () => {
    it('should list tasks', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks');

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data).toHaveLength(1);
      expect(data.data[0].title).toBe('Send proposal');
      expect(data.meta).toBeDefined();
    });

  it('should require authentication', async () => {
    const app = new Hono();
    app.route('/api/v1/tasks', createTasksRoutes());
    const response = await app.request('/api/v1/tasks');

    expect(response.status).toBe(401);
  });
  });

  describe('POST /api/v1/tasks', () => {
    it('should create a task', async () => {
      mockTasks.insertOne.mockImplementationOnce((doc: any) => {
        mockTaskData.title = doc.title;
        mockTaskData.description = doc.description;
        mockTaskData.status = doc.status;
        mockTaskData.priority = doc.priority;
        mockTaskData.dueDate = doc.dueDate;
        mockTaskData.assignedTo = doc.assignedTo;
        mockTaskData.contactId = doc.contactId;
        mockTaskData.companyId = doc.companyId;
        mockTaskData.dealId = doc.dealId;
        mockTaskData.leadId = doc.leadId;
        mockTaskData.reminderAt = doc.reminderAt;
        return Promise.resolve({ insertedId: new ObjectId(taskId) });
      });

      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New task',
          priority: 'high',
          dueDate: '2026-08-12T10:00:00.000Z',
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.data.title).toBe('New task');
      expect(data.data.priority).toBe('high');
    });

    it('should validate required fields', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priority: 'high' }),
      });

      expect(response.status).toBe(422);
    });
  });

  describe('GET /api/v1/tasks/:id', () => {
    it('should get a task by id', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tasks/${taskId}`);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.title).toBe('Send proposal');
    });

    it('should return 404 for non-existent task', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks/000000000000000000000000');

      expect(response.status).toBe(404);
    });

    it('should enforce cross-tenant isolation', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const response = await app.request(`/api/v1/tasks/${taskId}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/tasks/:id', () => {
    it('should update a task', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated task' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.title).toBe('Updated task');
    });

    it('should return 404 for non-existent task', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks/000000000000000000000000', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 for cross-tenant update', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const response = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated task' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/tasks/:id', () => {
    it('should soft delete a task', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe('deleted');
    });

    it('should return 404 for non-existent task', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks/000000000000000000000000', {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });

    it('should return 404 for cross-tenant delete', async () => {
      const app = createAppWithAuth({ organizationId: orgBId });
      const response = await app.request(`/api/v1/tasks/${taskId}`, {
        method: 'DELETE',
      });

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/v1/tasks/:id/complete', () => {
    it('should complete a task', async () => {
      const app = createAppWithAuth();
      const response = await app.request(`/api/v1/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.status).toBe('completed');
      expect(data.data.completedAt).toBeDefined();
    });

    it('should return 404 for non-existent task', async () => {
      const app = createAppWithAuth();
      const response = await app.request('/api/v1/tasks/000000000000000000000000/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed' }),
      });

      expect(response.status).toBe(404);
    });
  });
});
