import { NotificationService } from './notifications.service';
import { notificationListQuerySchema } from './notifications.schema';
import type { NotificationListQuery } from './notifications.types';

const toListQuery = (c: any): NotificationListQuery => {
  const query: NotificationListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const unread = c.req.query('unread');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (unread) query.unread = unread === 'true';

  return notificationListQuerySchema.parse(query);
};

export function createNotificationsController(service: NotificationService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      const user = c.get('user');
      if (!organizationId || !user) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toListQuery(c);
      const result = await service.list(organizationId, user.id, query);
      return c.json({ data: result.data, meta: result.meta });
    },

    async getUnreadCount(c: any) {
      const organizationId = c.get('organizationId');
      const user = c.get('user');
      if (!organizationId || !user) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const count = await service.getUnreadCount(organizationId, user.id);
      return c.json({ data: { count } });
    },

    async markAsRead(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const id = c.req.param('id');
        await service.markAsRead(id, organizationId);
        return c.json({ data: { id, readAt: new Date().toISOString() } });
      } catch (error) {
        if (error instanceof Error && error.message === 'Notification not found') {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Notification not found' } }, 404);
        }
        throw error;
      }
    },

    async markAllAsRead(c: any) {
      const organizationId = c.get('organizationId');
      const user = c.get('user');
      if (!organizationId || !user) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      await service.markAllAsRead(organizationId, user.id);
      return c.json({ data: { readAt: new Date().toISOString() } });
    },
  };
}
