import { z } from 'zod';

export const createTeamSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  managerIds: z.array(z.string()).optional(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  managerIds: z.array(z.string()).optional(),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
