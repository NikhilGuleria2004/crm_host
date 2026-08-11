import { z } from 'zod';

export const connectIntegrationSchema = z.object({
  provider: z.string().min(1),
  credentials: z.record(z.unknown()),
  settings: z.record(z.unknown()).optional(),
});

export const updateIntegrationSchema = z.object({
  credentials: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
  status: z.enum(['connected', 'disconnected']).optional(),
});

export type ConnectIntegrationInput = z.infer<typeof connectIntegrationSchema>;
export type UpdateIntegrationInput = z.infer<typeof updateIntegrationSchema>;
