import { z } from 'zod';

export const createNoteSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  body: z.string().min(1).max(10000),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
});

export const updateNoteSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  body: z.string().min(1).max(10000).optional(),
});

export const noteListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  leadId: z.string().optional(),
  dealId: z.string().optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'title']).optional(),
  direction: z.enum(['asc', 'desc']).optional(),
});

export type CreateNoteInput = z.infer<typeof createNoteSchema>;
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>;
export type NoteListQuery = z.infer<typeof noteListQuerySchema>;
