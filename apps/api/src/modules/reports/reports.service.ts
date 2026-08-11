import { ReportsRepository } from './reports.repository';
import type { SalesReportResponse, LeadConversionReportResponse, ActivityReportResponse, PipelineReportResponse } from './reports.types';

export class ReportsService {
  constructor(private repository: ReportsRepository) {}

  async getSalesReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string; pipelineId?: string }): Promise<SalesReportResponse> {
    return this.repository.getSalesReport(organizationId, params);
  }

  async getPipelineReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<PipelineReportResponse[]> {
    return this.repository.getPipelineReport(organizationId, params);
  }

  async getLeadsReport(organizationId: string, params: { from?: Date; to?: Date }): Promise<LeadConversionReportResponse[]> {
    return this.repository.getLeadsReport(organizationId, params);
  }

  async getActivityReport(organizationId: string, params: { from?: Date; to?: Date; ownerId?: string }): Promise<ActivityReportResponse[]> {
    return this.repository.getActivityReport(organizationId, params);
  }
}
