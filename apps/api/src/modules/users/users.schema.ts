import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  password: z.string().min(8),
  roleIds: z.array(z.string()).optional(),
  teamIds: z.array(z.string()).optional(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().min(1).max(255).optional(),
  roleIds: z.array(z.string()).optional(),
  teamIds: z.array(z.string()).optional(),
  status: z.enum(['invited', 'active', 'suspended', 'deactivated']).optional(),
});

export const inviteUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(255),
  lastName: z.string().min(1).max(255),
  roleIds: z.array(z.string()),
  teamIds: z.array(z.string()).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;
