import { Hono } from 'hono';
import { ImportService } from './imports.service';
import { ImportRepository } from './imports.repository';
import { createImportsController } from './imports.controller';
import { authorize } from '../../middleware/authorization';
import { IMPORT_PERMISSIONS } from './imports.permissions';

export function createImportsRoutes() {
  const app = new Hono();
  const repository = new ImportRepository();
  const service = new ImportService(repository);
  const controller = createImportsController(service);

  app.get('/', authorize(IMPORT_PERMISSIONS.read), controller.list);
  app.get('/:id', authorize(IMPORT_PERMISSIONS.read), controller.getById);
  app.post('/:id/preview', authorize(IMPORT_PERMISSIONS.create), controller.preview);
  app.post('/:id/start', authorize(IMPORT_PERMISSIONS.create), controller.start);

  return app;
}
