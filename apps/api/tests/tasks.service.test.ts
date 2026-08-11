import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ObjectId } from 'mongodb';
import { TaskService } from '../src/modules/tasks/tasks.service';
import type { TaskRepository } from '../src/modules/tasks/tasks.repository';

vi.mock('../src/middleware/audit', () => ({
  auditLog: vi.fn(),
}));

function createMockRepository(): vi.Mocked<TaskRepository> {
  return {
    findById: vi.fn(),
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    getUser: vi.fn(),
    toResponse: vi.fn(),
    toDetailResponse: vi.fn(),
  } as any;
}

const orgId = new ObjectId().toHexString();
const userId = new ObjectId().toHexString();
const taskId = new ObjectId().toHexString();
const assignedToId = new ObjectId().toHexString();

const mockTaskDoc = {
  _id: new ObjectId(taskId),
  organizationId: new ObjectId(orgId),
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

describe('P21 TaskService', () => {
  let service: TaskService;
  let repository: vi.Mocked<TaskRepository>;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new TaskService(repository);
    repository.toResponse.mockImplementation((doc: any) => ({
      id: doc._id?.toHexString?.() || taskId,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      dueDate: doc.dueDate?.toISOString?.(),
      assignedTo: doc.assignedTo ? { id: assignedToId, name: 'Jane Smith' } : undefined,
      contactId: doc.contactId?.toHexString?.(),
      companyId: doc.companyId?.toHexString?.(),
      dealId: doc.dealId?.toHexString?.(),
      leadId: doc.leadId?.toHexString?.(),
      reminderAt: doc.reminderAt?.toISOString?.(),
      completedAt: doc.completedAt?.toISOString?.(),
      createdAt: doc.createdAt?.toISOString?.(),
      updatedAt: doc.updatedAt?.toISOString?.(),
    }));
    repository.toDetailResponse.mockImplementation((doc: any) => {
      const response = repository.toResponse(doc);
      if (!response) return null;
      return { ...response, createdBy: doc.createdBy?.toHexString?.() || userId };
    });
  });

  describe('list', () => {
    it('should return paginated tasks', async () => {
      repository.list.mockResolvedValue({
        data: [mockTaskDoc],
        nextCursor: null,
        hasMore: false,
      });
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.list(orgId, { limit: 25 });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        limit: 25,
        sort: 'createdAt',
        direction: 'desc',
      }));
      expect(result.data).toHaveLength(1);
      expect(result.data[0].title).toBe('Send proposal');
      expect(result.meta.limit).toBe(25);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      repository.list.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.list(orgId, { status: 'open' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        status: 'open',
      }));
    });

    it('should filter by priority', async () => {
      repository.list.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.list(orgId, { priority: 'high' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        priority: 'high',
      }));
    });

    it('should search by title', async () => {
      repository.list.mockResolvedValue({
        data: [],
        nextCursor: null,
        hasMore: false,
      });

      await service.list(orgId, { search: 'proposal' });

      expect(repository.list).toHaveBeenCalledWith(orgId, expect.objectContaining({
        search: 'proposal',
      }));
    });
  });

  describe('create', () => {
    it('should create a task with default values', async () => {
      const createdDoc = {
        ...mockTaskDoc,
        status: 'open',
        priority: 'medium',
        assignedTo: new ObjectId(userId),
      };
      repository.create.mockResolvedValue(createdDoc);
      repository.getUser.mockResolvedValue({ id: userId, name: 'Alex Kumar' });

      const result = await service.create(orgId, userId, {
        title: 'Send proposal',
      });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        organizationId: orgId,
        title: 'Send proposal',
        status: 'open',
        priority: 'medium',
        assignedTo: new ObjectId(userId),
        createdBy: new ObjectId(userId),
      }));
      expect(result.title).toBe('Send proposal');
      expect(result.status).toBe('open');
    });

    it('should create a task with custom values', async () => {
      const customDoc = { ...mockTaskDoc, status: 'in_progress', priority: 'high' };
      repository.create.mockResolvedValue(customDoc);
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.create(orgId, userId, {
        title: 'Send proposal',
        description: 'Prepare and send proposal.',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-08-10T12:00:00.000Z',
        assignedTo: assignedToId,
      });

      expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({
        status: 'in_progress',
        priority: 'high',
        dueDate: new Date('2026-08-10T12:00:00.000Z'),
        assignedTo: new ObjectId(assignedToId),
      }));
      expect(result.status).toBe('in_progress');
    });
  });

  describe('getById', () => {
    it('should return a task by id', async () => {
      repository.findById.mockResolvedValue(mockTaskDoc);
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.getById(taskId, orgId);

      expect(repository.findById).toHaveBeenCalledWith(taskId, orgId);
      expect(result?.title).toBe('Send proposal');
    });

    it('should return null if task not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.getById(taskId, orgId);

      expect(result).toBeNull();
    });
  });

  describe('getDetail', () => {
    it('should return task detail with createdBy', async () => {
      repository.findById.mockResolvedValue(mockTaskDoc);
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.getDetail(taskId, orgId);

      expect(result?.title).toBe('Send proposal');
      expect(result?.createdBy).toBe(userId);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updatedDoc = { ...mockTaskDoc, title: 'Updated task' };
      repository.findById.mockResolvedValue(mockTaskDoc);
      repository.update.mockResolvedValue(updatedDoc);
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.update(taskId, orgId, userId, {
        title: 'Updated task',
      });

      expect(repository.update).toHaveBeenCalledWith(taskId, orgId, expect.objectContaining({
        title: 'Updated task',
        updatedBy: new ObjectId(userId),
      }));
      expect(result?.title).toBe('Updated task');
    });

    it('should return null if task not found', async () => {
      repository.findById.mockResolvedValue(null);

      const result = await service.update(taskId, orgId, userId, {
        title: 'Updated task',
      });

      expect(result).toBeNull();
      expect(repository.update).not.toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should soft delete a task', async () => {
      repository.findById.mockResolvedValue(mockTaskDoc);
      repository.softDelete.mockResolvedValue(undefined);

      await service.delete(taskId, orgId, {} as any);

      expect(repository.softDelete).toHaveBeenCalledWith(taskId, orgId);
    });

    it('should throw if task not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.delete(taskId, orgId, {} as any)).rejects.toThrow('Task not found');
    });
  });

  describe('complete', () => {
    it('should mark task as completed', async () => {
      const completedDoc = {
        ...mockTaskDoc,
        status: 'completed',
        completedAt: new Date(),
      };
      repository.findById.mockResolvedValue(mockTaskDoc);
      repository.update.mockResolvedValue(completedDoc);
      repository.getUser.mockResolvedValue({ id: assignedToId, name: 'Jane Smith' });

      const result = await service.complete(taskId, orgId, userId, { status: 'completed' }, {} as any);

      expect(repository.update).toHaveBeenCalledWith(taskId, orgId, expect.objectContaining({
        status: 'completed',
        completedAt: expect.any(Date),
        updatedBy: new ObjectId(userId),
      }));
      expect(result.status).toBe('completed');
      expect(result.completedAt).toBeDefined();
    });

    it('should throw if task not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.complete(taskId, orgId, userId, { status: 'completed' }, {} as any)).rejects.toThrow('Task not found');
    });
  });
});
