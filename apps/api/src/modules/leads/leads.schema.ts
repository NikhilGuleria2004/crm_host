import { z } from 'zod';

export const createLeadSchema = z.object({
  firstName: z.string().min(1).max(150),
  lastName: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
  ownerId: z.string().optional().nullable(),
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = z.object({
  firstName: z.string().min(1).max(150).optional(),
  lastName: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
  ownerId: z.string().optional().nullable(),
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
});

export const leadListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
  ownerId: z.string().optional(),
  source: z.string().optional(),
  score: z.coerce.number().int().min(0).max(100).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email', 'score']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export const convertLeadSchema = z.object({
  createContact: z.boolean().optional().default(true),
  createCompany: z.boolean().optional().default(false),
  createDeal: z.boolean().optional().default(false),
  company: z.object({
    name: z.string().min(1).max(255),
  }).optional(),
  deal: z.object({
    name: z.string().min(1).max(255),
    pipelineId: z.string().min(1),
    stageId: z.string().min(1),
    amount: z.coerce.number().positive(),
    currency: z.string().length(3),
  }).optional(),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadListQuery = z.infer<typeof leadListQuerySchema>;
export type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
