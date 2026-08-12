import { Hono } from 'hono';
import { ExportService } from './exports.service';
import { ExportRepository } from './exports.repository';
import { createExportsController } from './exports.controller';
import { authorize } from '../../middleware/authorization';
import { EXPORT_PERMISSIONS, ENTITY_EXPORT_PERMISSIONS } from './exports.permissions';
import type { ExportEntity } from './exports.permissions';

export function createExportsRoutes() {
  const app = new Hono();
  const repository = new ExportRepository();
  const service = new ExportService(repository);
  const controller = createExportsController(service);

  app.get('/', authorize(EXPORT_PERMISSIONS.read), controller.list);
  app.get('/:id', authorize(EXPORT_PERMISSIONS.read), controller.getById);
  app.get('/:id/download', authorize(EXPORT_PERMISSIONS.read), controller.download);
  app.post('/', async (c, next) => {
    const body = await c.req.json().catch(() => null);
    const entity = body?.entity as ExportEntity | undefined;
    if (entity && ENTITY_EXPORT_PERMISSIONS[entity]) {
      return authorize(ENTITY_EXPORT_PERMISSIONS[entity])(c, next);
    }
    return authorize(EXPORT_PERMISSIONS.create)(c, next);
  }, controller.create);

  return app;
}
