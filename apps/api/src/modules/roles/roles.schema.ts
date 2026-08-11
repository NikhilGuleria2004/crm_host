import { z } from 'zod';

export const createRoleSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).min(1),
});

export const updateRoleSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  permissionIds: z.array(z.string()).optional(),
});

export const cloneRoleSchema = z.object({
  name: z.string().min(1).max(255),
  permissionIds: z.array(z.string()).optional(),
});

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CloneRoleInput = z.infer<typeof cloneRoleSchema>;
