import { ObjectId } from 'mongodb';
import { collections } from '../../db/collections';
import type { TaskDocument } from '../../types/documents';
import type { TaskResponse, TaskDetailResponse } from './tasks.types';
import { FilterEngine } from '../filters/filters.engine';
import { TASK_FILTERS } from '../filters/filters.definitions';

export class TaskRepository {
  async findById(id: string, organizationId: string): Promise<TaskDocument | null> {
    const doc = await collections.tasks().findOne({
      _id: new ObjectId(id),
      organizationId: new ObjectId(organizationId),
    });
    return doc as TaskDocument | null;
  }

  async list(organizationId: string, params: {
    limit: number;
    cursor?: string;
    search?: string;
    status?: string;
    priority?: string;
    assignedTo?: string;
    contactId?: string;
    companyId?: string;
    dealId?: string;
    leadId?: string;
    dueBefore?: string;
    dueAfter?: string;
    sort?: string;
    direction?: 'asc' | 'desc';
  }): Promise<{ data: TaskDocument[]; nextCursor: string | null; hasMore: boolean }> {
    const engine = new FilterEngine(TASK_FILTERS);

    const query: Record<string, unknown> = engine.buildMongoQuery(
      engine.parseQuery({
        status: params.status,
        priority: params.priority,
        assignedTo: params.assignedTo,
        contactId: params.contactId,
        companyId: params.companyId,
        dealId: params.dealId,
        leadId: params.leadId,
        dueAfter: params.dueAfter,
        dueBefore: params.dueBefore,
      }).filters || [],
      organizationId
    );

    const searchQuery = engine.buildSearchQuery(params.search || '');
    if (searchQuery) {
      query.$or = (searchQuery as any).$or;
    }

    if (params.cursor) {
      const cursorDate = new Date(params.cursor);
      const sortField = params.sort === 'updatedAt' ? 'updatedAt' : params.sort === 'dueDate' ? 'dueDate' : 'createdAt';
      query[sortField] = { $lt: cursorDate };
    }

    const data = await collections.tasks()
      .find(query)
      .sort(engine.buildSort(params.sort, params.direction || 'desc') as any)
      .limit(params.limit + 1)
      .toArray();

    const hasMore = data.length > params.limit;
    const items = hasMore ? data.slice(0, params.limit) : data;

    let nextCursor: string | null = null;
    if (hasMore && items.length > 0) {
      nextCursor = items[items.length - 1].createdAt.toISOString();
    }

    return {
      data: items as TaskDocument[],
      nextCursor,
      hasMore,
    };
  }

  async create(input: {
    organizationId: string;
    title: string;
    description?: string;
    status: string;
    priority: string;
    dueDate?: Date;
    assignedTo: ObjectId;
    contactId?: ObjectId;
    companyId?: ObjectId;
    dealId?: ObjectId;
    leadId?: ObjectId;
    reminderAt?: Date;
    createdBy: ObjectId;
  }): Promise<TaskDocument> {
    const now = new Date();
    const result = await collections.tasks().insertOne({
      organizationId: new ObjectId(input.organizationId),
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate,
      assignedTo: input.assignedTo,
      contactId: input.contactId,
      companyId: input.companyId,
      dealId: input.dealId,
      leadId: input.leadId,
      reminderAt: input.reminderAt,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    } as any);

    const doc = await collections.tasks().findOne({ _id: result.insertedId });
    if (!doc) throw new Error('Failed to create task');
    return doc as TaskDocument;
  }

  async update(id: string, organizationId: string, input: {
    title?: string;
    description?: string | null;
    status?: string;
    priority?: string;
    dueDate?: Date | null;
    assignedTo?: ObjectId;
    contactId?: ObjectId | null;
    companyId?: ObjectId | null;
    dealId?: ObjectId | null;
    leadId?: ObjectId | null;
    reminderAt?: Date | null;
    completedAt?: Date;
    updatedBy: ObjectId;
  }): Promise<TaskDocument | null> {
    const now = new Date();
    const update: Record<string, unknown> = { updatedAt: now };

    if (input.title !== undefined) update.title = input.title;
    if (input.description !== undefined) update.description = input.description;
    if (input.status !== undefined) update.status = input.status;
    if (input.priority !== undefined) update.priority = input.priority;
    if (input.dueDate !== undefined) update.dueDate = input.dueDate;
    if (input.assignedTo !== undefined) update.assignedTo = input.assignedTo;
    if (input.contactId !== undefined) update.contactId = input.contactId;
    if (input.companyId !== undefined) update.companyId = input.companyId;
    if (input.dealId !== undefined) update.dealId = input.dealId;
    if (input.leadId !== undefined) update.leadId = input.leadId;
    if (input.reminderAt !== undefined) update.reminderAt = input.reminderAt;
    if (input.completedAt !== undefined) update.completedAt = input.completedAt;

    await collections.tasks().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: update }
    );

    const doc = await collections.tasks().findOne({ _id: new ObjectId(id) });
    return doc as TaskDocument | null;
  }

  async softDelete(id: string, organizationId: string): Promise<void> {
    await collections.tasks().updateOne(
      { _id: new ObjectId(id), organizationId: new ObjectId(organizationId) },
      { $set: { deletedAt: new Date() } }
    );
  }

  async getUser(userId: string): Promise<{ id: string; name: string } | null> {
    const doc = await collections.users().findOne({ _id: new ObjectId(userId) });
    if (!doc) return null;
    const firstName = (doc as any).firstName || '';
    const lastName = (doc as any).lastName || '';
    return { id: doc._id.toHexString(), name: `${firstName} ${lastName}`.trim() };
  }

  toResponse(doc: TaskDocument, assignedTo?: { id: string; name: string }): TaskResponse {
    return {
      id: doc._id.toHexString(),
      title: doc.title,
      description: doc.description,
      status: doc.status,
      priority: doc.priority,
      dueDate: doc.dueDate?.toISOString(),
      assignedTo,
      contactId: doc.contactId?.toHexString(),
      companyId: doc.companyId?.toHexString(),
      dealId: doc.dealId?.toHexString(),
      leadId: doc.leadId?.toHexString(),
      reminderAt: doc.reminderAt?.toISOString(),
      completedAt: doc.completedAt?.toISOString(),
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  toDetailResponse(doc: TaskDocument | null, assignedTo?: { id: string; name: string }): TaskDetailResponse | null {
    if (!doc) return null;
    const response = this.toResponse(doc, assignedTo);
    return {
      ...response,
      createdBy: doc.createdBy.toHexString(),
    };
  }
}
