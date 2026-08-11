import { Hono } from 'hono';
import { TaskService } from './tasks.service';
import { TaskRepository } from './tasks.repository';
import { createTasksController } from './tasks.controller';
import { authorize } from '../../middleware/authorization';
import { TASK_PERMISSIONS } from './tasks.permissions';

export function createTasksRoutes() {
  const app = new Hono();
  const repository = new TaskRepository();
  const service = new TaskService(repository);
  const controller = createTasksController(service);

  app.get('/', authorize(TASK_PERMISSIONS.read), controller.list);
  app.post('/', authorize(TASK_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(TASK_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(TASK_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(TASK_PERMISSIONS.delete), controller.delete);
  app.post('/:id/complete', authorize(TASK_PERMISSIONS.update), controller.complete);

  return app;
}
