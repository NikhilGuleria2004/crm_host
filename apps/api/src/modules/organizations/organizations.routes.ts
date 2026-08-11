import { Hono } from 'hono';
import { OrganizationService } from './organizations.service';
import { OrganizationRepository } from './organizations.repository';
import { createOrganizationsController } from './organizations.controller';

export function createOrganizationsRoutes() {
  const app = new Hono();
  const repository = new OrganizationRepository();
  const service = new OrganizationService(repository);
  const controller = createOrganizationsController(service);

  app.post('/', controller.create);
  app.get('/:id', controller.getById);
  app.patch('/:id', controller.update);

  return app;
}
