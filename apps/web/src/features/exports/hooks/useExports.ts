import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { exportsApi } from '../api/exports';

export function useExportJobs(params?: { limit?: number; cursor?: string; entity?: string; status?: string }) {
  return useQuery({
    queryKey: ['exports', params],
    queryFn: () => exportsApi.list(params),
  });
}

export function useExportJob(id: string) {
  return useQuery({
    queryKey: ['exports', id],
    queryFn: () => exportsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { entity: string; fields: string[]; filters?: Record<string, unknown> }) =>
      exportsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
  });
}
