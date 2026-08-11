import { z } from 'zod';

export const createAuditLogSchema = z.object({
  action: z.string().min(1).max(255),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  before: z.record(z.unknown()).optional(),
  after: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type CreateAuditLogInput = z.infer<typeof createAuditLogSchema>;
