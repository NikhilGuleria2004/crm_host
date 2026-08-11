import { Hono } from 'hono';
import { WebhookService } from './webhooks.service';
import { WebhookRepository } from './webhooks.repository';
import { createWebhooksController } from './webhooks.controller';
import { authorize } from '../../middleware/authorization';
import { WEBHOOK_PERMISSIONS } from './webhooks.permissions';

export function createWebhooksRoutes() {
  const app = new Hono();
  const repository = new WebhookRepository();
  const service = new WebhookService(repository);
  const controller = createWebhooksController(service);

  app.get('/', authorize(WEBHOOK_PERMISSIONS.read), controller.list);
  app.post('/', authorize(WEBHOOK_PERMISSIONS.create), controller.create);
  app.patch('/:id', authorize(WEBHOOK_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(WEBHOOK_PERMISSIONS.delete), controller.delete);
  app.get('/:id/deliveries', authorize(WEBHOOK_PERMISSIONS.read), controller.deliveries);

  return app;
}
