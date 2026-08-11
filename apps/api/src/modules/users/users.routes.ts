import { Hono } from 'hono';
import { UserService } from './users.service';
import { UserRepository } from './users.repository';
import { createUsersController } from './users.controller';
import { authorize } from '../../middleware/authorization';
import { USER_PERMISSIONS } from './users.permissions';

export function createUsersRoutes() {
  const app = new Hono();
  const repository = new UserRepository();
  const service = new UserService(repository);
  const controller = createUsersController(service);

  app.get('/', authorize(USER_PERMISSIONS.read), controller.list);
  app.post('/', authorize(USER_PERMISSIONS.create), controller.create);
  app.post('/invite', authorize(USER_PERMISSIONS.invite), controller.invite);
  app.get('/:id', authorize(USER_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(USER_PERMISSIONS.update), controller.update);
  app.post('/:id/deactivate', authorize(USER_PERMISSIONS.suspend), controller.deactivate);

  return app;
}
