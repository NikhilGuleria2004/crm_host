import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
});

export const taskListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  dealId: z.string().optional(),
  leadId: z.string().optional(),
  dueBefore: z.string().optional(),
  dueAfter: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'dueDate', 'priority', 'title']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const completeTaskSchema = z.object({
  status: z.literal('completed'),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type TaskListQuery = z.infer<typeof taskListQuerySchema>;
export type CompleteTaskInput = z.infer<typeof completeTaskSchema>;
