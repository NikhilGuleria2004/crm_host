import { z } from 'zod';
import { TaskService } from './tasks.service';
import { createTaskSchema, updateTaskSchema, taskListQuerySchema, completeTaskSchema } from './tasks.schema';
import type { CreateTaskInput, UpdateTaskInput, TaskListQuery, CompleteTaskInput } from './tasks.types';

const toCreateInput = (body: unknown): CreateTaskInput => {
  return createTaskSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateTaskInput => {
  return updateTaskSchema.parse(body);
};

const toListQuery = (c: any): TaskListQuery => {
  const query: TaskListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const search = c.req.query('search');
  const status = c.req.query('status');
  const priority = c.req.query('priority');
  const assignedTo = c.req.query('assignedTo');
  const contactId = c.req.query('contactId');
  const companyId = c.req.query('companyId');
  const dealId = c.req.query('dealId');
  const leadId = c.req.query('leadId');
  const dueBefore = c.req.query('dueBefore');
  const dueAfter = c.req.query('dueAfter');
  const sort = c.req.query('sort');
  const direction = c.req.query('direction');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (search) query.search = search;
  if (status) query.status = status;
  if (priority) query.priority = priority;
  if (assignedTo) query.assignedTo = assignedTo;
  if (contactId) query.contactId = contactId;
  if (companyId) query.companyId = companyId;
  if (dealId) query.dealId = dealId;
  if (leadId) query.leadId = leadId;
  if (dueBefore) query.dueBefore = dueBefore;
  if (dueAfter) query.dueAfter = dueAfter;
  if (sort) query.sort = sort;
  if (direction) query.direction = direction;

  return taskListQuerySchema.parse(query);
};

export function createTasksController(service: TaskService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toListQuery(c);
      const result = await service.list(organizationId, query);
      return c.json({ data: result.data, meta: result.meta });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const input = toCreateInput(await c.req.json());
        const task = await service.create(organizationId, user.id, input);
        return c.json({ data: task }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const task = await service.getDetail(id, organizationId);
      if (!task) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Task not found' } }, 404);
      }
      return c.json({ data: task });
    },

    async update(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = toUpdateInput(await c.req.json());
        const task = await service.update(id, organizationId, user.id, input);
        if (!task) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Task not found' } }, 404);
        }
        return c.json({ data: task });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async delete(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const id = c.req.param('id');
        await service.delete(id, organizationId, c);
        return c.json({ data: { id, status: 'deleted' } });
      } catch (error) {
        if (error instanceof Error && error.message === 'Task not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Task not found' } }, 404);
        }
        throw error;
      }
    },

    async complete(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const input = completeTaskSchema.parse(await c.req.json()) as CompleteTaskInput;
        const task = await service.complete(id, organizationId, user.id, input, c);
        return c.json({ data: task });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        if (error instanceof Error && error.message === 'Task not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Task not found' } }, 404);
        }
        throw error;
      }
    },
  };
}
