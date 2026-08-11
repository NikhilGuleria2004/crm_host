import { ExportService } from './exports.service';
import { exportStartSchema, exportListQuerySchema } from './exports.schema';
import { ENTITY_EXPORT_PERMISSIONS } from './exports.permissions';
import type { ExportEntity } from './exports.permissions';
import type { ExportStartInput, ExportListQuery } from './exports.types';

const toStartInput = (body: unknown): ExportStartInput => {
  return exportStartSchema.parse(body);
};

const toListQuery = (c: any): ExportListQuery => {
  const query: ExportListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const entity = c.req.query('entity');
  const status = c.req.query('status');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (entity) query.entity = entity;
  if (status) query.status = status;

  return exportListQuerySchema.parse(query);
};

async function hasPermission(c: any, permission: string): Promise<boolean> {
  const permissions: Array<{ permission: string; scope: string }> = c.get('permissions') || [];
  return permissions.some(
    (p) => p.permission === permission || p.permission === '*' || p.permission.endsWith('.*')
  );
}

export function createExportsController(service: ExportService) {
  return {
    async list(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
      }

      const query = toListQuery(c);
      const result = await service.list(organizationId, query);
      return c.json({ data: result.data, meta: result.meta });
    },

    async getById(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const job = await service.getById(id, organizationId);
      if (!job) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Export job not found' } }, 404);
      }
      return c.json({ data: job });
    },

    async download(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const job = await service.getById(id, organizationId);
      if (!job || !job.fileKey) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Export file not found' } }, 404);
      }

      const file = await service.getFile(job.fileKey);
      if (!file) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Export file not found' } }, 404);
      }

      c.header('Content-Type', file.contentType || 'text/csv');
      c.header('Content-Disposition', `attachment; filename="${job.entity}-${id}.csv"`);
      return c.body(file.content);
    },

    async create(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const body = await c.req.json();
        const input = toStartInput(body);

        const requiredPermission = ENTITY_EXPORT_PERMISSIONS[input.entity as ExportEntity];
        if (!requiredPermission || !(await hasPermission(c, requiredPermission))) {
          return c.json({ error: { code: 'FORBIDDEN', message: `Missing permission: ${requiredPermission}` } }, 403);
        }

        const job = await service.createJob(organizationId, user.id, input.entity, input.fields, input.filters);
        return c.json({ data: job }, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create export job' } }, 500);
      }
    },
  };
}
