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

      const headers = ['Metric', 'Value'];
      const rows = [
        ['Revenue', String(data.revenue)],
        ['Won Deals', String(data.wonDeals)],
        ['Lost Deals', String(data.lostDeals)],
        ['Average Deal Size', String(data.averageDealSize)],
        ['Win Rate (%)', String(data.winRate)],
      ];

      const escape = (value: string) => value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;

      const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');

      return c.body(csv, 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="sales-report.csv"',
      });
    },
  };
}
