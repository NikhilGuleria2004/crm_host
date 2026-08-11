import { z } from 'zod';

export const createDealSchema = z.object({
  name: z.string().min(1).max(255),
  pipelineId: z.string().min(1),
  stageId: z.string().min(1),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  amount: z.coerce.number().positive(),
  currency: z.string().length(3),
  probability: z.coerce.number().int().min(0).max(100),
  expectedCloseDate: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateDealSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  pipelineId: z.string().min(1).optional(),
  stageId: z.string().min(1).optional(),
  companyId: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().length(3).optional(),
  probability: z.coerce.number().int().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

export const dealListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
  pipelineId: z.string().optional(),
  stageId: z.string().optional(),
  ownerId: z.string().optional(),
  companyId: z.string().optional(),
  contactId: z.string().optional(),
  status: z.enum(['open', 'won', 'lost']).optional(),
  minAmount: z.coerce.number().positive().optional(),
  maxAmount: z.coerce.number().positive().optional(),
  expectedCloseAfter: z.string().optional(),
  expectedCloseBefore: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'amount', 'probability', 'expectedCloseDate']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const changeStageSchema = z.object({
  stageId: z.string().min(1),
});

export const markWonSchema = z.object({
  wonAt: z.string().optional(),
});

export const markLostSchema = z.object({
  reason: z.string().min(1).max(500),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
export type DealListQuery = z.infer<typeof dealListQuerySchema>;
export type ChangeStageInput = z.infer<typeof changeStageSchema>;
export type MarkWonInput = z.infer<typeof markWonSchema>;
export type MarkLostInput = z.infer<typeof markLostSchema>;
