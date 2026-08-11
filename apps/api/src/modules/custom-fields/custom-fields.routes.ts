import { Hono } from 'hono';
import { CustomFieldService } from './custom-fields.service';
import { CustomFieldRepository } from './custom-fields.repository';
import { createCustomFieldsController } from './custom-fields.controller';
import { authorize } from '../../middleware/authorization';
import { CUSTOM_FIELD_PERMISSIONS } from './custom-fields.permissions';

export function createCustomFieldsRoutes() {
  const app = new Hono();
  const repository = new CustomFieldRepository();
  const service = new CustomFieldService(repository);
  const controller = createCustomFieldsController(service);

  app.get('/', authorize(CUSTOM_FIELD_PERMISSIONS.read), controller.list);
  app.get('/:id', authorize(CUSTOM_FIELD_PERMISSIONS.read), controller.getById);
  app.post('/', authorize(CUSTOM_FIELD_PERMISSIONS.create), controller.create);
  app.put('/:id', authorize(CUSTOM_FIELD_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(CUSTOM_FIELD_PERMISSIONS.delete), controller.delete);

  return app;
}
