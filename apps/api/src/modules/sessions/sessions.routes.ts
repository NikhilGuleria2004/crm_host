import { Hono } from 'hono';
import { SessionService } from './sessions.service';
import { SessionRepository } from './sessions.repository';
import { createSessionsController } from './sessions.controller';
import { authorize } from '../../middleware/authorization';
import { SESSION_PERMISSIONS } from './sessions.permissions';

export function createSessionsRoutes() {
  const app = new Hono();
  const repository = new SessionRepository();
  const service = new SessionService(repository);
  const controller = createSessionsController(service);

  app.post('/', controller.create);
  app.get('/:id', authorize(SESSION_PERMISSIONS.read), controller.getById);
  app.get('/user/:userId', authorize(SESSION_PERMISSIONS.read), controller.getByUserId);
  app.post('/:id/revoke', authorize(SESSION_PERMISSIONS.revoke), controller.revoke);
  app.post('/user/:userId/revoke-all', authorize(SESSION_PERMISSIONS.revoke), controller.revokeAll);
  app.post('/revoke-all-others', authorize(SESSION_PERMISSIONS.revoke), controller.revokeAllOthers);

  return app;
}
