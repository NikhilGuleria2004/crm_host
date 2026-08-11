import { z } from 'zod';
import { AuditService } from './audit.service';
import { createAuditLogSchema } from './audit.schema';
import type { CreateAuditLogInput } from './audit.types';

const toCreateInput = (body: unknown): CreateAuditLogInput => {
  return createAuditLogSchema.parse(body);
};

export function createAuditController(service: AuditService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const limit = Math.min(Number(c.req.query('limit')) || 50, 100);
      const cursor = c.req.query('cursor') || undefined;
      const actorId = c.req.query('actorId') || undefined;
      const action = c.req.query('action') || undefined;
      const entityType = c.req.query('entityType') || undefined;
      const entityId = c.req.query('entityId') || undefined;
      const ipAddress = c.req.query('ipAddress') || undefined;
      const search = c.req.query('search') || undefined;
      const result = await service.getLogsWithFilters(organizationId, {
        limit,
        cursor,
        actorId,
        action,
        entityType,
        entityId,
        ipAddress,
        search,
      });
      return c.json({ data: result.logs, meta: { limit, nextCursor: result.nextCursor } });
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const actorId = c.get('user')?.id;
        const ipAddress = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || undefined;
        const userAgent = c.req.header('user-agent') || undefined;
        
        if (!organizationId) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }
        
        const input = toCreateInput(await c.req.json());
        const log = await service.log(organizationId, input, actorId, ipAddress, userAgent);
        return c.json({ data: log }, 201);
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
      const log = await service.getLogById(id);
      if (!log) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Audit log not found' } }, 404);
      }
      return c.json({ data: log });
    },

    async exportCsv(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }
      const actorId = c.req.query('actorId') || undefined;
      const action = c.req.query('action') || undefined;
      const entityType = c.req.query('entityType') || undefined;
      const entityId = c.req.query('entityId') || undefined;
      const ipAddress = c.req.query('ipAddress') || undefined;
      const search = c.req.query('search') || undefined;
      const limit = Math.min(Number(c.req.query('limit')) || 1000, 1000);
      const result = await service.getLogsWithFilters(organizationId, {
        limit,
        cursor: undefined,
        actorId,
        action,
        entityType,
        entityId,
        ipAddress,
        search,
      });
      const csv = service.generateCsv(result.logs);
      c.header('Content-Type', 'text/csv');
      c.header('Content-Disposition', `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`);
      return c.text(csv);
    },
  };
}
