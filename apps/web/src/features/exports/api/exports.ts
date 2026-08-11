import { request } from '../../../lib/request';

export interface ExportJobResponse {
  id: string;
  entity: string;
  status: string;
  totalRows?: number;
  fileKey?: string;
  downloadUrl?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

export interface ExportListResponse {
  data: ExportJobResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ExportStartInput {
  entity: string;
  fields: string[];
  filters?: Record<string, unknown>;
}

export const exportsApi = {
  list: (params?: { limit?: number; cursor?: string; entity?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.entity) searchParams.set('entity', params.entity);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<ExportListResponse>(`/exports${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: ExportJobResponse }>(`/exports/${id}`),

  create: (input: ExportStartInput) =>
    request<{ data: ExportJobResponse }>(`/exports`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
};
