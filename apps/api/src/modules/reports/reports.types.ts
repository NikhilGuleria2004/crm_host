export interface SalesReportResponse {
  revenue: number;
  wonDeals: number;
  lostDeals: number;
  averageDealSize: number;
  winRate: number;
}

export interface LeadConversionReportResponse {
  source: string;
  leads: number;
  qualified: number;
  converted: number;
  conversionRate: number;
}

export interface ActivityReportResponse {
  userId: string;
  userName: string;
  calls: number;
  emails: number;
  meetings: number;
  tasks: number;
}

export interface PipelineReportResponse {
  stageId: string;
  stageName: string;
  dealCount: number;
  dealValue: number;
}

export interface ReportExportJobResponse {
  id: string;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileKey?: string;
  createdAt: string;
  completedAt?: string;
}
