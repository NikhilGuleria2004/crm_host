import { z } from 'zod';
import { SessionService } from './sessions.service';
import { createSessionSchema } from './sessions.schema';
import type { CreateSessionInput } from './sessions.types';

const toCreateInput = (body: unknown): CreateSessionInput => {
  return createSessionSchema.parse(body);
};

export function createSessionsController(service: SessionService) {
  return {
    async create(c: any) {
      try {
        const input = toCreateInput(await c.req.json());
        const session = await service.create(input);
        return c.json({ data: session }, 201);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return c.json(
            { error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', fields: error.flatten().fieldErrors } },
            422
          );
        }
        throw error;
      }
    },

    async getById(c: any) {
      const id = c.req.param('id');
      const session = await service.getById(id);
      if (!session) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Session not found' } }, 404);
      }
      return c.json({ data: session });
    },

    async getByUserId(c: any) {
      const userId = c.req.param('userId');
      const sessions = await service.getByUserId(userId);
      return c.json({ data: sessions });
    },

    async revoke(c: any) {
      const id = c.req.param('id');
      await service.revoke(id);
      return c.json({ data: { id, status: 'revoked' } });
    },

    async revokeAll(c: any) {
      const userId = c.req.param('userId');
      await service.revokeAllUserSessions(userId);
      return c.json({ data: { userId, status: 'all_revoked' } });
    },

    async revokeAllOthers(c: any) {
      const userId = c.get('user')?.id;
      const currentSessionId = c.get('user')?.sessionId;
      if (!userId) {
        return c.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 401);
      }
      await service.revokeAllUserSessionsExcept(userId, currentSessionId);
      return c.json({ data: { success: true } });
    },
  };
}
