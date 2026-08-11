import { Hono } from 'hono';
import { NoteService } from './notes.service';
import { NoteRepository } from './notes.repository';
import { createNotesController } from './notes.controller';
import { authorize } from '../../middleware/authorization';
import { NOTE_PERMISSIONS } from './notes.permissions';

export function createNotesRoutes() {
  const app = new Hono();
  const repository = new NoteRepository();
  const service = new NoteService(repository);
  const controller = createNotesController(service);

  app.get('/', authorize(NOTE_PERMISSIONS.read), controller.list);
  app.post('/', authorize(NOTE_PERMISSIONS.create), controller.create);
  app.get('/:id', authorize(NOTE_PERMISSIONS.read), controller.getById);
  app.patch('/:id', authorize(NOTE_PERMISSIONS.update), controller.update);
  app.delete('/:id', authorize(NOTE_PERMISSIONS.delete), controller.delete);
  app.post('/bulk/delete', authorize(NOTE_PERMISSIONS.delete), controller.bulkDelete);

  return app;
}
