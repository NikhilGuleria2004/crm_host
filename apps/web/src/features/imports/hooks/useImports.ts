import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { importsApi } from '../api/imports';

export function useImportJobs(params?: { limit?: number; cursor?: string; entity?: string; status?: string }) {
  return useQuery({
    queryKey: ['imports', params],
    queryFn: () => importsApi.list(params),
  });
}

export function useImportJob(id: string) {
  return useQuery({
    queryKey: ['imports', id],
    queryFn: () => importsApi.get(id),
    enabled: !!id,
  });
}

export function usePreviewImport() {
  return useMutation({
    mutationFn: ({ id, mapping }: { id: string; mapping: Record<string, string> }) =>
      importsApi.preview(id, mapping),
  });
}

export function useStartImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, mapping }: { id: string; mapping: Record<string, string> }) =>
      importsApi.start(id, mapping),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}

export function useCreateImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ entity, file }: { entity: string; file: File }) => {
      const formData = new FormData();
      formData.append('entity', entity);
      formData.append('file', file);

      const response = await fetch('/api/v1/imports', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Upload failed' } }));
        throw new Error(error.error?.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}
