import { Hono } from 'hono';
import { ExportService } from './exports.service';
import { ExportRepository } from './exports.repository';
import { createExportsController } from './exports.controller';

export function createExportsRoutes() {
  const app = new Hono();
  const repository = new ExportRepository();
  const service = new ExportService(repository);
  const controller = createExportsController(service);

  app.get('/', controller.list);
  app.get('/:id', controller.getById);
  app.get('/:id/download', controller.download);
  app.post('/', controller.create);

  return app;
}
