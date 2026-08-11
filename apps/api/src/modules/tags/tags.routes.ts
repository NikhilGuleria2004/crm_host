import { Hono } from 'hono';
import { TagService } from './tags.service';
import { TagRepository } from './tags.repository';
import { createTagsController } from './tags.controller';
import { authorize } from '../../middleware/authorization';
import { TAG_PERMISSIONS } from './tags.permissions';

export function createTagsRoutes() {
  const app = new Hono();
  const repository = new TagRepository();
  const service = new TagService(repository);
  const controller = createTagsController(service);

  app.get('/', authorize(TAG_PERMISSIONS.read), controller.list);
  app.get('/:id', authorize(TAG_PERMISSIONS.read), controller.getById);
  app.post('/', authorize(TAG_PERMISSIONS.create), controller.create);
  app.put('/:id', authorize(TAG_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(TAG_PERMISSIONS.delete), controller.delete);

  return app;
}
