import { Hono } from 'hono';
import { createReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReportsRepository } from './reports.repository';
import { authorize } from '../../middleware/authorization';
import { REPORTS_PERMISSIONS } from './reports.permissions';

export function createReportsRoutes() {
  const app = new Hono();
  const repository = new ReportsRepository();
  const service = new ReportsService(repository);
  const controller = createReportsController(service);

  app.get('/sales', authorize(REPORTS_PERMISSIONS.read), controller.sales);
  app.get('/pipeline', authorize(REPORTS_PERMISSIONS.read), controller.pipeline);
  app.get('/leads', authorize(REPORTS_PERMISSIONS.read), controller.leads);
  app.get('/activity', authorize(REPORTS_PERMISSIONS.read), controller.activity);
  app.get('/sales/export', authorize(REPORTS_PERMISSIONS.export), controller.exportSales);

  return app;
}
