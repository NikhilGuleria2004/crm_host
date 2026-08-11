import { Hono } from 'hono';
import { RoleService } from './roles.service';
import { RoleRepository } from './roles.repository';
import { createRolesController } from './roles.controller';
import { authorize } from '../../middleware/authorization';
import { ROLE_PERMISSIONS } from './roles.permissions';

export function createRolesRoutes() {
  const app = new Hono();
  const repository = new RoleRepository();
  const service = new RoleService(repository);
  const controller = createRolesController(service);

  app.get('/', authorize(ROLE_PERMISSIONS.read), controller.list);
  app.post('/', authorize(ROLE_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(ROLE_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(ROLE_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(ROLE_PERMISSIONS.delete), controller.delete);
  app.post('/:id/clone', authorize(ROLE_PERMISSIONS.create), controller.clone);

  return app;
}
