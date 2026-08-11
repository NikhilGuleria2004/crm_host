import { useQuery } from '@tanstack/react-query';
import { reportsApi, type SalesReportParams, type PipelineReportParams, type LeadsReportParams, type ActivityReportParams } from '../api/reports';

export function useSalesReport(params?: SalesReportParams) {
  return useQuery({
    queryKey: ['reports', 'sales', params],
    queryFn: () => reportsApi.getSales(params),
  });
}

export function usePipelineReport(params?: PipelineReportParams) {
  return useQuery({
    queryKey: ['reports', 'pipeline', params],
    queryFn: () => reportsApi.getPipeline(params),
  });
}

export function useLeadsReport(params?: LeadsReportParams) {
  return useQuery({
    queryKey: ['reports', 'leads', params],
    queryFn: () => reportsApi.getLeads(params),
  });
}

export function useActivityReport(params?: ActivityReportParams) {
  return useQuery({
    queryKey: ['reports', 'activity', params],
    queryFn: () => reportsApi.getActivity(params),
  });
}
