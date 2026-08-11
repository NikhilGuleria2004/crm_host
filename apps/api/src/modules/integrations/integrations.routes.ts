import { Hono } from 'hono';
import { IntegrationService } from './integrations.service';
import { IntegrationRepository } from './integrations.repository';
import { createIntegrationsController } from './integrations.controller';
import { authorize } from '../../middleware/authorization';
import { INTEGRATION_PERMISSIONS } from './integrations.permissions';

export function createIntegrationsRoutes() {
  const app = new Hono();
  const repository = new IntegrationRepository();
  const service = new IntegrationService(repository);
  const controller = createIntegrationsController(service);

  app.get('/', authorize(INTEGRATION_PERMISSIONS.read), controller.list);
  app.post('/connect', authorize(INTEGRATION_PERMISSIONS.connect), controller.connect);
  app.patch('/:id', authorize(INTEGRATION_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(INTEGRATION_PERMISSIONS.disconnect), controller.delete);
  app.post('/:id/sync', authorize(INTEGRATION_PERMISSIONS.update), controller.sync);

  return app;
}
