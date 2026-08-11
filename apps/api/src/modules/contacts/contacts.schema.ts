import { z } from 'zod';

export const createContactSchema = z.object({
  firstName: z.string().min(1).max(150),
  lastName: z.string().max(150).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  companyId: z.string().optional().nullable(),
  jobTitle: z.string().max(150).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  source: z.string().max(100).optional().nullable(),
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

export const updateContactSchema = z.object({
  firstName: z.string().min(1).max(150).optional(),
  lastName: z.string().max(150).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  companyId: z.string().optional().nullable(),
  jobTitle: z.string().max(150).optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  source: z.string().max(100).optional().nullable(),
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

export const contactListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  ownerId: z.string().optional(),
  companyId: z.string().optional(),
  source: z.string().optional(),
  tagId: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'firstName', 'lastName', 'email']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
export type ContactListQuery = z.infer<typeof contactListQuerySchema>;
