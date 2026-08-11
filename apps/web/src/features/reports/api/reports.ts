import { request } from '../../../lib/request';

export interface SalesReportParams {
  from?: string;
  to?: string;
  ownerId?: string;
  pipelineId?: string;
}

export interface PipelineReportParams {
  from?: string;
  to?: string;
}

export interface LeadsReportParams {
  from?: string;
  to?: string;
}

export interface ActivityReportParams {
  from?: string;
  to?: string;
  ownerId?: string;
}

export interface SalesReportResponse {
  revenue: number;
  wonDeals: number;
  lostDeals: number;
  averageDealSize: number;
  winRate: number;
}

export interface PipelineReportResponse {
  stageId: string;
  stageName: string;
  dealCount: number;
  dealValue: number;
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

export const reportsApi = {
  getSales: (params?: SalesReportParams) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.ownerId) qs.set('ownerId', params.ownerId);
    if (params?.pipelineId) qs.set('pipelineId', params.pipelineId);
    const query = qs.toString();
    return request<{ data: SalesReportResponse }>(`/reports/sales${query ? `?${query}` : ''}`);
  },
  getPipeline: (params?: PipelineReportParams) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const query = qs.toString();
    return request<{ data: PipelineReportResponse[] }>(`/reports/pipeline${query ? `?${query}` : ''}`);
  },
  getLeads: (params?: LeadsReportParams) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const query = qs.toString();
    return request<{ data: LeadConversionReportResponse[] }>(`/reports/leads${query ? `?${query}` : ''}`);
  },
  getActivity: (params?: ActivityReportParams) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.ownerId) qs.set('ownerId', params.ownerId);
    const query = qs.toString();
    return request<{ data: ActivityReportResponse[] }>(`/reports/activity${query ? `?${query}` : ''}`);
  },
  exportSales: (params?: SalesReportParams) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    if (params?.ownerId) qs.set('ownerId', params.ownerId);
    if (params?.pipelineId) qs.set('pipelineId', params.pipelineId);
    const query = qs.toString();
    return request<{ data: { url: string } }>(`/reports/sales/export${query ? `?${query}` : ''}`);
  },
};
