import { Hono } from 'hono';
import { LeadService } from './leads.service';
import { LeadRepository } from './leads.repository';
import { createLeadsController } from './leads.controller';
import { authorize } from '../../middleware/authorization';
import { LEAD_PERMISSIONS } from './leads.permissions';

export function createLeadsRoutes() {
  const app = new Hono();
  const repository = new LeadRepository();
  const service = new LeadService(repository);
  const controller = createLeadsController(service);

  app.get('/', authorize(LEAD_PERMISSIONS.read), controller.list);
  app.post('/', authorize(LEAD_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(LEAD_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(LEAD_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(LEAD_PERMISSIONS.delete), controller.delete);
  app.post('/bulk/delete', authorize(LEAD_PERMISSIONS.delete), controller.bulkDelete);
  app.post('/:id/convert', authorize(LEAD_PERMISSIONS.convert), controller.convert);

  return app;
}
