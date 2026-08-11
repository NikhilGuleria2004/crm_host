import { z } from 'zod';
import { WebhookService } from './webhooks.service';
import { createWebhookSchema, updateWebhookSchema } from './webhooks.schema';
import type { CreateWebhookInput, UpdateWebhookInput } from './webhooks.types';

const toCreateInput = (body: unknown): CreateWebhookInput => {
  return createWebhookSchema.parse(body);
};

const toUpdateInput = (body: unknown): UpdateWebhookInput => {
  return updateWebhookSchema.parse(body);
};

export function createWebhooksController(service: WebhookService) {
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

    async update(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const input = toUpdateInput(await c.req.json());
      const result = await service.update(id, organizationId, input);
      if (!result) {
        return c.json({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } }, 404);
      }
      return c.json({ data: result });
    },

    async delete(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      await service.delete(id, organizationId);
      return c.json({ data: { id, status: 'deleted' } });
    },

    async deliveries(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const limit = Number(c.req.query('limit') || '50');
      const deliveries = await service.getDeliveries(id, organizationId, limit);
      return c.json({ data: deliveries });
    },
  };
}
