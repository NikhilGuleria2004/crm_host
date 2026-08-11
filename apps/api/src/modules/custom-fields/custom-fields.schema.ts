import { z } from 'zod';

export const createCustomFieldSchema = z.object({
  entity: z.enum(['contact', 'company', 'lead', 'deal']),
  key: z.string().min(1).max(100),
  label: z.string().min(1).max(150),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'currency',
    'date',
    'datetime',
    'boolean',
    'select',
    'multiselect',
    'email',
    'phone',
    'url',
  ]),
  required: z.boolean().optional().default(false),
  options: z.array(z.string()).optional(),
  order: z.number().int().optional(),
});

export const updateCustomFieldSchema = z.object({
  label: z.string().min(1).max(150).optional(),
  type: z.enum([
    'text',
    'textarea',
    'number',
    'currency',
    'date',
    'datetime',
    'boolean',
    'select',
    'multiselect',
    'email',
    'phone',
    'url',
  ]).optional(),
  required: z.boolean().optional(),
  options: z.array(z.string()).optional(),
  order: z.number().int().optional(),
});

export const customFieldListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  entity: z.enum(['contact', 'company', 'lead', 'deal']).optional(),
});

export type CreateCustomFieldInput = z.infer<typeof createCustomFieldSchema>;
export type UpdateCustomFieldInput = z.infer<typeof updateCustomFieldSchema>;
export type CustomFieldListQuery = z.infer<typeof customFieldListQuerySchema>;
