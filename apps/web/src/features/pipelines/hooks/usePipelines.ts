import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pipelinesApi, type CreatePipelineInput, type UpdatePipelineInput, type CreatePipelineStageInput, type UpdatePipelineStageInput } from '../api/pipelines';

export function usePipelines(params?: Record<string, unknown>) {
  return useQuery({
    queryKey: ['pipelines', params],
    queryFn: () => pipelinesApi.list(params),
  });
}

export function usePipeline(id: string) {
  return useQuery({
    queryKey: ['pipelines', id],
    queryFn: () => pipelinesApi.get(id),
    enabled: !!id,
  });
}

export function useCreatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePipelineInput) => pipelinesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePipelineInput }) =>
      pipelinesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines', id] });
    },
  });
}

export function useDeletePipeline() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => pipelinesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    },
  });
}

export function useCreatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, data }: { pipelineId: string; data: CreatePipelineStageInput }) =>
      pipelinesApi.createStage(pipelineId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] });
    },
  });
}

export function useUpdatePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageId, data }: { pipelineId: string; stageId: string; data: UpdatePipelineStageInput }) =>
      pipelinesApi.updateStage(pipelineId, stageId, data),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] });
    },
  });
}

export function useDeletePipelineStage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ pipelineId, stageId, replacementStageId }: { pipelineId: string; stageId: string; replacementStageId?: string }) =>
      pipelinesApi.deleteStage(pipelineId, stageId, replacementStageId),
    onSuccess: (_, { pipelineId }) => {
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
      queryClient.invalidateQueries({ queryKey: ['pipelines', pipelineId] });
    },
  });
}
