import { z } from 'zod';

export const createOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255).optional(),
  timezone: z.string().min(1).max(100),
  currency: z.string().min(1).max(10),
  locale: z.string().min(1).max(10),
});

export const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  logoUrl: z.string().url().optional().nullable(),
  timezone: z.string().min(1).max(100).optional(),
  currency: z.string().min(1).max(10).optional(),
  locale: z.string().min(1).max(10).optional(),
  status: z.enum(['active', 'suspended']).optional(),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationSchema>;
export type UpdateOrganizationInput = z.infer<typeof updateOrganizationSchema>;
