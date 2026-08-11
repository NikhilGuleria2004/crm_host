import { z } from 'zod';
import { ApiKeyService } from './api-keys.service';
import { createApiKeySchema } from './api-keys.schema';
import type { CreateApiKeyInput } from './api-keys.types';

const toCreateInput = (body: unknown): CreateApiKeyInput => {
  return createApiKeySchema.parse(body);
};

export function createApiKeysController(service: ApiKeyService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const limit = Number(c.req.query('limit') || '25');
      const cursor = c.req.query('cursor') || undefined;
      const result = await service.listPaginated(organizationId, { limit, cursor });
      return c.json({ data: result.data, meta: result.meta });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const userId = c.get('user')?.id;
        if (!organizationId || !userId) {
          return c.json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } }, 401);
        }

        const input = toCreateInput(await c.req.json());
        const result = await service.create(organizationId, userId, input);
        return c.json({ data: result }, 201);
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

    async revoke(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      await service.revoke(id, organizationId);
      return c.json({ data: { id, status: 'revoked' } });
    },
  };
}
