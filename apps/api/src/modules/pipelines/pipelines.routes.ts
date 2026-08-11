import { Hono } from 'hono';
import { PipelineService } from './pipelines.service';
import { PipelineRepository } from './pipelines.repository';
import { createPipelinesController } from './pipelines.controller';
import { authorize } from '../../middleware/authorization';
import { PIPELINE_PERMISSIONS } from './pipelines.permissions';

export function createPipelinesRoutes() {
  const app = new Hono();
  const repository = new PipelineRepository();
  const service = new PipelineService(repository);
  const controller = createPipelinesController(service);

  app.get('/', authorize(PIPELINE_PERMISSIONS.read), controller.list);
  app.post('/', authorize(PIPELINE_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(PIPELINE_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(PIPELINE_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(PIPELINE_PERMISSIONS.delete), controller.delete);
  app.post('/:id/stages', authorize(PIPELINE_PERMISSIONS.create), controller.createStage);
  app.patch('/:pipelineId/stages/:stageId', authorize(PIPELINE_PERMISSIONS.update), controller.updateStage);
  app.delete('/:pipelineId/stages/:stageId', authorize(PIPELINE_PERMISSIONS.delete), controller.deleteStage);

  return app;
}
