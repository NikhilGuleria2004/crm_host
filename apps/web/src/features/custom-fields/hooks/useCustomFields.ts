import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFieldsApi } from '../api/customFields';

export function useCustomFields(params?: { limit?: number; cursor?: string; entity?: string }) {
  return useQuery({
    queryKey: ['customFields', params],
    queryFn: () => customFieldsApi.list(params),
  });
}

export function useCustomField(id: string) {
  return useQuery({
    queryKey: ['customFields', id],
    queryFn: () => customFieldsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { entity: string; key: string; label: string; type: string; required?: boolean; options?: string[]; order?: number }) =>
      customFieldsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}

export function useUpdateCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{ label: string; type: string; required: boolean; options: string[]; order: number }>) =>
      customFieldsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}

export function useDeleteCustomField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customFieldsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customFields'] });
    },
  });
}
