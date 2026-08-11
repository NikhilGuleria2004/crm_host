import { Hono } from 'hono';
import { ActivityService } from './activities.service';
import { ActivityRepository } from './activities.repository';
import { createActivitiesController } from './activities.controller';
import { authorize } from '../../middleware/authorization';
import { ACTIVITY_PERMISSIONS } from './activities.permissions';

export function createActivitiesRoutes() {
  const app = new Hono();
  const repository = new ActivityRepository();
  const service = new ActivityService(repository);
  const controller = createActivitiesController(service);

  app.get('/', authorize(ACTIVITY_PERMISSIONS.read), controller.list);
  app.post('/', authorize(ACTIVITY_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(ACTIVITY_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(ACTIVITY_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(ACTIVITY_PERMISSIONS.delete), controller.delete);
  app.post('/bulk/delete', authorize(ACTIVITY_PERMISSIONS.delete), controller.bulkDelete);

  return app;
}
