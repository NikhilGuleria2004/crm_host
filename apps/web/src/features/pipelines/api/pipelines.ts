import { request } from '../../../lib/request';

export const pipelinesApi = {
  list: (params?: Record<string, unknown>) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return request<{ data: PipelineResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/pipelines${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: PipelineResponse }>(`/pipelines/${id}`),

  create: (data: CreatePipelineInput) =>
    request<{ data: PipelineResponse }>('/pipelines', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdatePipelineInput) =>
    request<{ data: PipelineResponse }>(`/pipelines/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/pipelines/${id}`, {
      method: 'DELETE',
    }),

  createStage: (pipelineId: string, data: CreatePipelineStageInput) =>
    request<{ data: PipelineStageResponse }>(`/pipelines/${pipelineId}/stages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateStage: (pipelineId: string, stageId: string, data: UpdatePipelineStageInput) =>
    request<{ data: PipelineStageResponse }>(`/pipelines/${pipelineId}/stages/${stageId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteStage: (pipelineId: string, stageId: string, replacementStageId?: string) => {
    const url = replacementStageId
      ? `/pipelines/${pipelineId}/stages/${stageId}?replacementStageId=${replacementStageId}`
      : `/pipelines/${pipelineId}/stages/${stageId}`;
    return request<void>(url, {
      method: 'DELETE',
    });
  },
};

export interface PipelineResponse {
  id: string;
  name: string;
  description?: string | null;
  isDefault: boolean;
  stages: PipelineStageResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineStageResponse {
  id: string;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}

export interface CreatePipelineInput {
  name: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface UpdatePipelineInput {
  name?: string;
  description?: string | null;
  isDefault?: boolean;
}

export interface CreatePipelineStageInput {
  name: string;
  order: number;
  probability: number;
  isWon?: boolean;
  isLost?: boolean;
}

export interface UpdatePipelineStageInput {
  name?: string;
  order?: number;
  probability?: number;
  isWon?: boolean;
  isLost?: boolean;
}
