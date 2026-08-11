import { z } from 'zod';

export const createMembershipSchema = z.object({
  userId: z.string(),
  roleId: z.string(),
  teamIds: z.array(z.string()).optional(),
});

export const updateMembershipSchema = z.object({
  roleId: z.string().optional(),
  teamIds: z.array(z.string()).optional(),
  status: z.enum(['invited', 'active', 'suspended', 'removed']).optional(),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1),
});

export type CreateMembershipInput = z.infer<typeof createMembershipSchema>;
export type UpdateMembershipInput = z.infer<typeof updateMembershipSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
