import { z } from 'zod';

export const notificationListQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional(),
  cursor: z.string().optional(),
  unread: z.boolean().optional(),
});

export type NotificationListQuery = z.infer<typeof notificationListQuerySchema>;
