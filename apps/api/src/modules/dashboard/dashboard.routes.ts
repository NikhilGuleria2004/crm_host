import { Hono } from 'hono';
import { createDashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DashboardRepository } from './dashboard.repository';
import { authorize } from '../../middleware/authorization';
import { DASHBOARD_PERMISSIONS } from './dashboard.permissions';

export function createDashboardRoutes() {
  const app = new Hono();
  const repository = new DashboardRepository();
  const service = new DashboardService(repository);
  const controller = createDashboardController(service);

  app.get('/summary', authorize(DASHBOARD_PERMISSIONS.read), controller.summary);
  app.get('/pipeline', authorize(DASHBOARD_PERMISSIONS.read), controller.pipeline);

  return app;
}
