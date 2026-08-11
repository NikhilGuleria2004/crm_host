import { Hono } from 'hono';
import { CompanyService } from './companies.service';
import { CompanyRepository } from './companies.repository';
import { createCompaniesController } from './companies.controller';
import { authorize } from '../../middleware/authorization';
import { COMPANY_PERMISSIONS } from './companies.permissions';

export function createCompaniesRoutes() {
  const app = new Hono();
  const repository = new CompanyRepository();
  const service = new CompanyService(repository);
  const controller = createCompaniesController(service);

  app.get('/', authorize(COMPANY_PERMISSIONS.read), controller.list);
  app.post('/', authorize(COMPANY_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(COMPANY_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(COMPANY_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(COMPANY_PERMISSIONS.delete), controller.delete);
  app.post('/bulk/update', authorize(COMPANY_PERMISSIONS.update), controller.bulkUpdate);
  app.post('/bulk/delete', authorize(COMPANY_PERMISSIONS.delete), controller.bulkDelete);

  return app;
}
