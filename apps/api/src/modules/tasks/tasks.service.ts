import { ObjectId } from 'mongodb';
import { TaskRepository } from './tasks.repository';
import type { CreateTaskInput, UpdateTaskInput, TaskResponse, TaskDetailResponse, TaskListResponse, TaskListQuery, CompleteTaskInput } from './tasks.types';
import { auditLog } from '../../middleware/audit';

function toObjectId(value: string | undefined | null): ObjectId | undefined {
  if (!value || !/^[0-9a-f]{24}$/i.test(value)) return undefined;
  return new ObjectId(value);
}

export class TaskService {
  constructor(private repository: TaskRepository) {}

  async list(organizationId: string, params: TaskListQuery): Promise<TaskListResponse> {
    const limit = params.limit || 50;
    const sort = params.sort || 'createdAt';
    const direction = params.direction || 'desc';

    const result = await this.repository.list(organizationId, {
      limit,
      cursor: params.cursor,
      search: params.search,
      status: params.status,
      priority: params.priority,
      assignedTo: params.assignedTo,
      contactId: params.contactId,
      companyId: params.companyId,
      dealId: params.dealId,
      leadId: params.leadId,
      dueBefore: params.dueBefore,
      dueAfter: params.dueAfter,
      sort,
      direction,
    });

    const assignedToIds = result.data.map((doc) => doc.assignedTo?.toHexString()).filter((id): id is string => id !== undefined);
    const assignedToMap = assignedToIds.length > 0 ? await this.repository.getUsers(assignedToIds) : new Map();

    const data = result.data.map((doc) => {
      const assignedTo = doc.assignedTo ? assignedToMap.get(doc.assignedTo.toHexString()) : undefined;
      return this.repository.toResponse(doc, assignedTo || undefined);
    });

    const filteredData = data.filter((task): task is TaskResponse => task !== null);

    return {
      data: filteredData,
      meta: {
        limit,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      },
    };
  }

  async create(organizationId: string, userId: string, input: CreateTaskInput): Promise<TaskResponse> {
    const task = await this.repository.create({
      organizationId,
      title: input.title,
      description: input.description || undefined,
      status: input.status || 'open',
      priority: input.priority || 'medium',
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      assignedTo: toObjectId(input.assignedTo) || new ObjectId(userId),
      contactId: toObjectId(input.contactId),
      companyId: toObjectId(input.companyId),
      dealId: toObjectId(input.dealId),
      leadId: toObjectId(input.leadId),
      reminderAt: input.reminderAt ? new Date(input.reminderAt) : undefined,
      createdBy: new ObjectId(userId),
    });

    const assignedTo = task.assignedTo ? await this.repository.getUser(task.assignedTo.toHexString()) : undefined;
    return this.repository.toResponse(task, assignedTo || undefined)!;
  }

  async getById(id: string, organizationId: string): Promise<TaskResponse | null> {
    const task = await this.repository.findById(id, organizationId);
    if (!task) return null;

    const assignedTo = task.assignedTo ? await this.repository.getUser(task.assignedTo.toHexString()) : undefined;
    return this.repository.toResponse(task, assignedTo || undefined);
  }

  async getDetail(id: string, organizationId: string): Promise<TaskDetailResponse | null> {
    const task = await this.repository.findById(id, organizationId);
    if (!task) return null;

    const assignedTo = task.assignedTo ? await this.repository.getUser(task.assignedTo.toHexString()) : undefined;
    return this.repository.toDetailResponse(task, assignedTo || undefined);
  }

  async update(id: string, organizationId: string, userId: string, input: UpdateTaskInput): Promise<TaskResponse | null> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      return null;
    }

    const task = await this.repository.update(id, organizationId, {
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      assignedTo: toObjectId(input.assignedTo),
      contactId: toObjectId(input.contactId),
      companyId: toObjectId(input.companyId),
      dealId: toObjectId(input.dealId),
      leadId: toObjectId(input.leadId),
      reminderAt: input.reminderAt ? new Date(input.reminderAt) : undefined,
      updatedBy: new ObjectId(userId),
    });

    if (!task) return null;

    const assignedTo = task.assignedTo ? await this.repository.getUser(task.assignedTo.toHexString()) : undefined;
    return this.repository.toResponse(task, assignedTo || undefined);
  }

  async delete(id: string, organizationId: string, c: any): Promise<void> {
    const existing = await this.repository.findById(id, organizationId);
    if (!existing) {
      throw new Error('Task not found');
    }

    await this.repository.softDelete(id, organizationId);

    await auditLog(c, {
      action: 'task.deleted',
      entityType: 'task',
      entityId: id,
      before: {
        title: existing.title,
        status: existing.status,
        priority: existing.priority,
      },
    });
  }

  async complete(id: string, organizationId: string, userId: string, input: CompleteTaskInput, c: any): Promise<TaskResponse> {
    const task = await this.repository.findById(id, organizationId);
    if (!task) {
      throw new Error('Task not found');
    }

    const now = new Date();
    const updatedTask = await this.repository.update(id, organizationId, {
      status: input.status,
      completedAt: now,
      updatedBy: new ObjectId(userId),
    });

    if (!updatedTask) {
      throw new Error('Failed to complete task');
    }

    await auditLog(c, {
      action: 'task.completed',
      entityType: 'task',
      entityId: id,
      after: {
        status: 'completed',
        completedAt: now.toISOString(),
      },
    });

    const assignedTo = updatedTask.assignedTo ? await this.repository.getUser(updatedTask.assignedTo.toHexString()) : undefined;
    return this.repository.toResponse(updatedTask, assignedTo || undefined)!;
  }
}
