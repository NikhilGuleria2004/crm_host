import { z } from 'zod';

export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const tagListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type TagListQuery = z.infer<typeof tagListQuerySchema>;
