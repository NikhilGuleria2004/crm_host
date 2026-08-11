import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tagsApi } from '../api/tags';

export function useTags(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['tags', params],
    queryFn: () => tagsApi.list(params),
  });
}

export function useTag(id: string) {
  return useQuery({
    queryKey: ['tags', id],
    queryFn: () => tagsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { name: string }) => tagsApi.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...input }: { id: string } & Partial<{ name: string }>) =>
      tagsApi.update(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => tagsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tags'] });
    },
  });
}
