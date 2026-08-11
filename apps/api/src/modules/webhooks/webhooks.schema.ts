import { z } from 'zod';

export const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string().min(1)).min(1),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string().min(1)).min(1).optional(),
  status: z.enum(['active', 'inactive']).optional(),
});

export type CreateWebhookInput = z.infer<typeof createWebhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
