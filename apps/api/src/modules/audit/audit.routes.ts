import { Hono } from 'hono';
import { AuditService } from './audit.service';
import { AuditRepository } from './audit.repository';
import { createAuditController } from './audit.controller';
import { authorize } from '../../middleware/authorization';
import { AUDIT_PERMISSIONS } from './audit.permissions';

export function createAuditRoutes() {
  const app = new Hono();
  const repository = new AuditRepository();
  const service = new AuditService(repository);
  const controller = createAuditController(service);

  app.get('/', authorize(AUDIT_PERMISSIONS.read), controller.list);
  app.post('/', controller.create);
  app.get('/:id', authorize(AUDIT_PERMISSIONS.read), controller.getById);
  app.get('/export/csv', authorize(AUDIT_PERMISSIONS.read), controller.exportCsv);

  return app;
}
