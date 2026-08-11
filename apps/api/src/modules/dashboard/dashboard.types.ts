export interface DashboardSummary {
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

export interface DashboardPipelineResponse {
  data: DashboardPipelineStage[];
}
