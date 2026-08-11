import { z } from 'zod';

export const importStartSchema = z.object({
  entity: z.enum(['contacts', 'companies', 'leads', 'deals']).optional(),
  mapping: z.record(z.string()),
});

export const importListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  entity: z.enum(['contacts', 'companies', 'leads', 'deals']).optional(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']).optional(),
});

export type ImportStartInput = z.infer<typeof importStartSchema>;
export type ImportListQuery = z.infer<typeof importListQuerySchema>;
