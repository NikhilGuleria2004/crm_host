import { DashboardService } from './dashboard.service';

export function createDashboardController(service: DashboardService) {
  return {
    async summary(c: any) {
      const organizationId = c.get('organizationId');
      if (!organizationId) {
        return c.json(
          { error: { code: 'ORGANIZATION_CONTEXT_REQUIRED', message: 'Organization context required' } },
          400
        );
      }

      const data = await service.getSummary(organizationId);
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

      const data = await service.getPipeline(organizationId);
      return c.json({ data });
    },
  };
}
