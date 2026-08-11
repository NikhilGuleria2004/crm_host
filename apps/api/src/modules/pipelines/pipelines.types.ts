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

export interface PipelineListParams {
  limit?: number;
  cursor?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PipelineListQuery {
  limit?: number;
  cursor?: string;
  sort?: 'createdAt' | 'updatedAt' | 'name';
  direction?: 'asc' | 'desc';
}

export interface PipelineListResponse {
  data: PipelineResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}
