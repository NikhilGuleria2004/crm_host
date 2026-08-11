import { Hono } from 'hono';
import { DealService } from './deals.service';
import { DealRepository } from './deals.repository';
import { createDealsController } from './deals.controller';
import { authorize } from '../../middleware/authorization';
import { DEAL_PERMISSIONS } from './deals.permissions';

export function createDealsRoutes() {
  const app = new Hono();
  const repository = new DealRepository();
  const service = new DealService(repository);
  const controller = createDealsController(service);

  app.get('/', authorize(DEAL_PERMISSIONS.read), controller.list);
  app.post('/', authorize(DEAL_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(DEAL_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(DEAL_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(DEAL_PERMISSIONS.delete), controller.delete);
  app.post('/:id/stage', authorize(DEAL_PERMISSIONS.update), controller.changeStage);
  app.post('/:id/won', authorize(DEAL_PERMISSIONS.update), controller.markWon);
  app.post('/:id/lost', authorize(DEAL_PERMISSIONS.update), controller.markLost);

  return app;
}
