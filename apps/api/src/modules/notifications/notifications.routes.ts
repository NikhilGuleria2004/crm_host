import { Hono } from 'hono';
import { NotificationService } from './notifications.service';
import { NotificationRepository } from './notifications.repository';
import { createNotificationsController } from './notifications.controller';
import { authorize } from '../../middleware/authorization';
import { NOTIFICATION_PERMISSIONS } from './notifications.permissions';

export function createNotificationsRoutes() {
  const app = new Hono();
  const repository = new NotificationRepository();
  const service = new NotificationService(repository);
  const controller = createNotificationsController(service);

  app.get('/', authorize(NOTIFICATION_PERMISSIONS.read), controller.list);
  app.get('/unread-count', authorize(NOTIFICATION_PERMISSIONS.read), controller.getUnreadCount);
  app.post('/:id/read', authorize(NOTIFICATION_PERMISSIONS.read), controller.markAsRead);
  app.post('/read-all', authorize(NOTIFICATION_PERMISSIONS.read), controller.markAllAsRead);

  return app;
}
