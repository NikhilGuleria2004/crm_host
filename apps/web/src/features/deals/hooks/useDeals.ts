import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsApi, type CreateDealInput, type UpdateDealInput } from '../api/deals';

export function useDeals(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: () => dealsApi.list(params),
  });
}

export function useDeal(id: string) {
  return useQuery({
    queryKey: ['deals', id],
    queryFn: () => dealsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateDealInput) => dealsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useUpdateDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDealInput }) =>
      dealsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
    },
  });
}

export function useDeleteDeal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => dealsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
    },
  });
}

export function useChangeDealStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, stageId }: { id: string; stageId: string }) =>
      dealsApi.changeStage(id, stageId),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
    },
  });
}

export function useMarkDealWon() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, wonAt }: { id: string; wonAt?: string }) =>
      dealsApi.markWon(id, wonAt),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
    },
  });
}

export function useMarkDealLost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      dealsApi.markLost(id, reason),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['deals', id] });
    },
  });
}
