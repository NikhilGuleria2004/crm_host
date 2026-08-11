import { z } from 'zod';

export const createSessionSchema = z.object({
  userId: z.string(),
  organizationId: z.string(),
  expiresAt: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const revokeSessionSchema = z.object({
  sessionId: z.string(),
});

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type RevokeSessionInput = z.infer<typeof revokeSessionSchema>;
