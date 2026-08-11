import { Hono } from 'hono';
import { TeamService } from './teams.service';
import { TeamRepository } from './teams.repository';
import { createTeamsController } from './teams.controller';

export function createTeamsRoutes() {
  const app = new Hono();
  const repository = new TeamRepository();
  const service = new TeamService(repository);
  const controller = createTeamsController(service);

  app.get('/', controller.list);
  app.post('/', controller.create);
  app.get('/:id', controller.getById);
  app.patch('/:id', controller.update);
  app.delete('/:id', controller.delete);

  return app;
}
