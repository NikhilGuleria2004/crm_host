import { z } from 'zod';

export const exportStartSchema = z.object({
  entity: z.enum(['contacts', 'companies', 'leads', 'deals']),
  fields: z.array(z.string()).min(1),
  filters: z.record(z.any()).optional(),
});

export const exportListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  entity: z.enum(['contacts', 'companies', 'leads', 'deals']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type ExportStartInput = z.infer<typeof exportStartSchema>;
export type ExportListQuery = z.infer<typeof exportListQuerySchema>;
