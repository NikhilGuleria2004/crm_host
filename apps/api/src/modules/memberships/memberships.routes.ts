import { Hono } from 'hono';
import { MembershipService } from './memberships.service';
import { MembershipRepository } from './memberships.repository';
import { RoleService } from '../roles/roles.service';
import { RoleRepository } from '../roles/roles.repository';
import { createMembershipsController } from './memberships.controller';

export function createMembershipsRoutes() {
  const app = new Hono();
  const membershipRepository = new MembershipRepository();
  const membershipService = new MembershipService(membershipRepository);
  const roleRepository = new RoleRepository();
  const roleService = new RoleService(roleRepository);
  const controller = createMembershipsController(membershipService, roleService);

  app.get('/', controller.list);
  app.post('/invite', controller.invite);
  app.post('/accept', controller.accept);
  app.get('/:id', controller.getById);
  app.patch('/:id', controller.update);
  app.delete('/:id', controller.remove);

  return app;
}
