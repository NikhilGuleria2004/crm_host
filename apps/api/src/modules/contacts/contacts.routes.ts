import { Hono } from 'hono';
import { ContactService } from './contacts.service';
import { ContactRepository } from './contacts.repository';
import { createContactsController } from './contacts.controller';
import { authorize } from '../../middleware/authorization';
import { CONTACT_PERMISSIONS } from './contacts.permissions';

export function createContactsRoutes() {
  const app = new Hono();
  const repository = new ContactRepository();
  const service = new ContactService(repository);
  const controller = createContactsController(service);

  app.get('/', authorize(CONTACT_PERMISSIONS.read), controller.list);
  app.post('/', authorize(CONTACT_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(CONTACT_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(CONTACT_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(CONTACT_PERMISSIONS.delete), controller.delete);
  app.post('/bulk/update', authorize(CONTACT_PERMISSIONS.update), controller.bulkUpdate);
  app.post('/bulk/delete', authorize(CONTACT_PERMISSIONS.delete), controller.bulkDelete);

  return app;
}
