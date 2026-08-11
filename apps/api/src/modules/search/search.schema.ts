import { z } from 'zod';

export const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  types: z.array(z.string()).optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
