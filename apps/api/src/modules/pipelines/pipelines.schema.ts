import { z } from 'zod';

export const createPipelineSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
});

export const pipelineListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const createPipelineStageSchema = z.object({
  name: z.string().min(1).max(255),
  order: z.coerce.number().int().min(0),
  probability: z.coerce.number().int().min(0).max(100),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
});

export const updatePipelineStageSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  order: z.coerce.number().int().min(0).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  isWon: z.boolean().optional(),
  isLost: z.boolean().optional(),
});

export type CreatePipelineInput = z.infer<typeof createPipelineSchema>;
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>;
export type PipelineListQuery = z.infer<typeof pipelineListQuerySchema>;
export type CreatePipelineStageInput = z.infer<typeof createPipelineStageSchema>;
export type UpdatePipelineStageInput = z.infer<typeof updatePipelineStageSchema>;
