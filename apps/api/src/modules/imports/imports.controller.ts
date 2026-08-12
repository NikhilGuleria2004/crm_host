import { ImportService } from './imports.service';
import { importStartSchema, importListQuerySchema } from './imports.schema';
import type { ImportStartInput, ImportListQuery } from './imports.types';

const toStartInput = (body: unknown): ImportStartInput => {
  return importStartSchema.parse(body);
};

const toListQuery = (c: any): ImportListQuery => {
  const query: ImportListQuery = {};
  const limit = c.req.query('limit');
  const cursor = c.req.query('cursor');
  const entity = c.req.query('entity');
  const status = c.req.query('status');

  if (limit) query.limit = parseInt(limit, 10);
  if (cursor) query.cursor = cursor;
  if (entity) query.entity = entity;
  if (status) query.status = status;

  return importListQuerySchema.parse(query);
};

export function createImportsController(service: ImportService) {
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
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Import job not found' } }, 404);
      }
      return c.json({ data: job });
    },

    async upload(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const formData = await c.req.formData();
        const entity = formData.get('entity');
        const file = formData.get('file');

        if (!entity || typeof entity !== 'string') {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Entity is required' } }, 400);
        }

        if (!file || !(file instanceof File)) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: 'File is required' } }, 400);
        }

        const fileName = file.name.toLowerCase();
        if (!fileName.endsWith('.csv')) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Only CSV files are allowed' } }, 400);
        }

        const content = Buffer.from(await file.arrayBuffer());
        const maxSize = 10 * 1024 * 1024;
        if (content.length > maxSize) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: `File size exceeds maximum allowed size of ${maxSize / 1024 / 1024} MB` } }, 400);
        }

        const text = content.toString('utf-8');
        if (!text.trim()) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: 'File is empty' } }, 400);
        }

        const lines = text.split(/\r?\n/).filter((line) => line.trim());
        if (lines.length < 2) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: 'CSV must contain a header row and at least one data row' } }, 400);
        }
        const job = await service.createJob(organizationId, user.id, entity, {
          name: file.name,
          content,
        });

        return c.json({ data: job }, 201);
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create import job' } }, 500);
      }
    },

    async preview(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const body = await c.req.json();
        const input = toStartInput(body);

        const job = await service.getById(id, organizationId);
        if (!job) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Import job not found' } }, 404);
        }

        const preview = await service.previewImport(id, organizationId, input.mapping);
        return c.json({ data: preview });
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'VALIDATION_ERROR', message: error.message } }, 400);
        }
        throw error;
      }
    },

    async start(c: any) {
      try {
        const organizationId = c.get('organizationId');
        const user = c.get('user');
        if (!organizationId || !user) {
          return c.json({ error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } }, 400);
        }

        const id = c.req.param('id');
        const body = await c.req.json();
        const input = toStartInput(body);

        const job = await service.getById(id, organizationId);
        if (!job) {
          return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Import job not found' } }, 404);
        }

        if (job.status !== 'pending') {
          return c.json({ error: { code: 'INVALID_STATE', message: 'Import job is not in pending state' } }, 400);
        }

        await service.startImport(id, organizationId, input.mapping);
        const updatedJob = await service.getById(id, organizationId);
        return c.json({ data: updatedJob });
      } catch (error) {
        if (error instanceof Error) {
          return c.json({ error: { code: 'IMPORT_ERROR', message: error.message } }, 400);
        }
        throw error;
      }
    },
  };
}
