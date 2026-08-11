import { Hono } from 'hono';
import { SearchService } from './search.service';
import { SearchRepository } from './search.repository';
import { createSearchController } from './search.controller';
import { authorize } from '../../middleware/authorization';
import { SEARCH_PERMISSIONS } from './search.permissions';

export function createSearchRoutes() {
  const app = new Hono();
  const repository = new SearchRepository();
  const service = new SearchService(repository);
  const controller = createSearchController(service);

  app.get('/', authorize(SEARCH_PERMISSIONS.read), controller.search);

  return app;
}
