import { z } from 'zod';

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(255),
  scopes: z.array(z.string().min(1)).min(1),
});

export const revokeApiKeySchema = z.object({
  id: z.string().min(1),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type RevokeApiKeyInput = z.infer<typeof revokeApiKeySchema>;
