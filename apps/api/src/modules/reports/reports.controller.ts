import { ReportsService } from './reports.service';

export function createReportsController(service: ReportsService) {
  return {
    async sales(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const { from, to, ownerId, pipelineId } = c.req.query();
      const data = await service.getSalesReport(organizationId, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        ownerId: ownerId || undefined,
        pipelineId: pipelineId || undefined,
      });
      return c.json({ data });
    },

    async pipeline(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const { from, to } = c.req.query();
      const data = await service.getPipelineReport(organizationId, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      return c.json({ data });
    },

    async leads(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const { from, to } = c.req.query();
      const data = await service.getLeadsReport(organizationId, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      });
      return c.json({ data });
    },

    async activity(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const { from, to, ownerId } = c.req.query();
      const data = await service.getActivityReport(organizationId, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        ownerId: ownerId || undefined,
      });
      return c.json({ data });
    },

    async exportSales(c: any) {
      const organizationId = c.get('organizationId');
      const user = c.get('user');
      if (!organizationId || !user) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const { from, to, ownerId, pipelineId } = c.req.query();
      const job = await service.createSalesExportJob(organizationId, user.id, {
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
        ownerId: ownerId || undefined,
        pipelineId: pipelineId || undefined,
      });
      return c.json({ data: job }, 202);
    },

    async getExportStatus(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const job = await service.getExportJob(id, organizationId);
      if (!job) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Report job not found' } }, 404);
      }
      return c.json({ data: job });
    },

    async downloadExport(c: any) {
      const organizationId = c.get('organizationId');
      const id = c.req.param('id');
      const job = await service.getExportJob(id, organizationId);
      if (!job || !job.fileKey) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Export file not found' } }, 404);
      }

      const { fileStorage } = await import('../../storage/factory');
      const file = await fileStorage.get(job.fileKey);
      if (!file) {
        return c.json({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Export file not found' } }, 404);
      }

      c.header('Content-Type', file.contentType || 'text/csv');
      c.header('Content-Disposition', `attachment; filename="sales-report-${id}.csv"`);
      return c.body(file.content);
    },
  };
}
