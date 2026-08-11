import { DashboardRepository } from './dashboard.repository';
import type { DashboardSummary, DashboardPipelineStage } from './dashboard.types';

export class DashboardService {
  constructor(private repository: DashboardRepository) {}

  async getSummary(organizationId: string): Promise<DashboardSummary> {
    return this.repository.getSummary(organizationId);
  }

  async getPipeline(organizationId: string): Promise<DashboardPipelineStage[]> {
    return this.repository.getPipeline(organizationId);
  }
}
