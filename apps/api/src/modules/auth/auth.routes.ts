import { Hono } from 'hono';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { OrganizationRepository } from '../organizations/organizations.repository';
import { UserRepository } from '../users/users.repository';
import { SessionRepository } from '../sessions/sessions.repository';
import { RoleService } from '../roles/roles.service';
import { RoleRepository } from '../roles/roles.repository';
import { MembershipRepository } from '../memberships/memberships.repository';
import { createAuthController } from './auth.controller';
import { authorize } from '../../middleware/authorization';
import { SECURITY_PERMISSIONS } from './auth.permissions';

export function createAuthRoutes() {
  const app = new Hono();
  const organizationRepository = new OrganizationRepository();
  const userRepository = new UserRepository();
  const sessionRepository = new SessionRepository();
  const roleRepository = new RoleRepository();
  const roleService = new RoleService(roleRepository);
  const authRepository = new AuthRepository();
  const membershipRepository = new MembershipRepository();
  const service = new AuthService(organizationRepository, userRepository, sessionRepository, roleService, authRepository, membershipRepository);
  const controller = createAuthController(service);

  app.post('/register', controller.register);
  app.post('/login', controller.login);
  app.post('/logout', controller.logout);
  app.get('/me', controller.me);
  app.post('/forgot-password', controller.forgotPassword);
  app.post('/reset-password', controller.resetPassword);
  app.post('/change-password', authorize(SECURITY_PERMISSIONS.update), controller.changePassword);

  return app;
}
