import { z } from 'zod';

export const createCompanySchema = z.object({
  name: z.string().min(1).max(255),
  normalizedName: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.coerce.number().int().positive().optional().nullable(),
  annualRevenue: z.coerce.number().positive().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  address: z.object({
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const updateCompanySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  normalizedName: z.string().min(1).max(255).optional(),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.coerce.number().int().positive().optional().nullable(),
  annualRevenue: z.coerce.number().positive().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  address: z.object({
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional().nullable(),
});

export const companyListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
  industry: z.string().optional(),
  ownerId: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'name', 'industry', 'annualRevenue']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type CompanyListQuery = z.infer<typeof companyListQuerySchema>;
