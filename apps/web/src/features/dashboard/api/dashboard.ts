import { request } from '../../../lib/request';

export interface DashboardSummaryData {
  pipelineValue: number;
  openDeals: number;
  wonRevenue: number;
  lostRevenue: number;
  winRate: number;
  newLeads: number;
  qualifiedLeads: number;
  overdueTasks: number;
}

export interface DashboardPipelineStage {
  stageId: string;
  stageName: string;
  dealCount: number;
  totalValue: number;
}

export const dashboardApi = {
  getSummary: () => request<{ data: DashboardSummaryData }>('/dashboard/summary'),
  getPipeline: () => request<{ data: DashboardPipelineStage[] }>('/dashboard/pipeline'),
};
