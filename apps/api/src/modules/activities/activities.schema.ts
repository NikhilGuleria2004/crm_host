import { z } from 'zod';

export const createActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']),
  subject: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  occurredAt: z.string().datetime(),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const updateActivitySchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']).optional(),
  subject: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  occurredAt: z.string().datetime().optional(),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  metadata: z.record(z.unknown()).optional(),
});

export const activityListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']).optional(),
  ownerId: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'occurredAt', 'subject', 'type']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type ActivityListQuery = z.infer<typeof activityListQuerySchema>;
