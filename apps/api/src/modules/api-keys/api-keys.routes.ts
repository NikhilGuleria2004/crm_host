import { Hono } from 'hono';
import { ApiKeyService } from './api-keys.service';
import { ApiKeyRepository } from './api-keys.repository';
import { createApiKeysController } from './api-keys.controller';
import { authorize } from '../../middleware/authorization';
import { API_KEY_PERMISSIONS } from './api-keys.permissions';

export function createApiKeysRoutes() {
  const app = new Hono();
  const repository = new ApiKeyRepository();
  const service = new ApiKeyService(repository);
  const controller = createApiKeysController(service);

  app.get('/', authorize(API_KEY_PERMISSIONS.read), controller.list);
  app.post('/', authorize(API_KEY_PERMISSIONS.create), controller.create);
  app.post('/:id/revoke', authorize(API_KEY_PERMISSIONS.revoke), controller.revoke);

  return app;
}
