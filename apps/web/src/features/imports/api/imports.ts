import { API_BASE, request } from '../../../lib/request';

export { API_BASE };

export interface ImportJobResponse {
  id: string;
  entity: string;
  status: string;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  errorFileKey?: string;
  createdAt: string;
  completedAt?: string;
}

export interface ImportPreviewResponse {
  headers: string[];
  rows: Record<string, unknown>[];
  mapping: Record<string, string>;
  errors: Array<{ row: number; message: string }>;
}

export interface ImportListResponse {
  data: ImportJobResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export const importsApi = {
  list: (params?: { limit?: number; cursor?: string; entity?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.entity) searchParams.set('entity', params.entity);
    if (params?.status) searchParams.set('status', params.status);
    const query = searchParams.toString();
    return request<ImportListResponse>(`/imports${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: ImportJobResponse }>(`/imports/${id}`),

  preview: (id: string, mapping: Record<string, string>) =>
    request<{ data: ImportPreviewResponse }>(`/imports/${id}/preview`, {
      method: 'POST',
      body: JSON.stringify({ mapping }),
    }),

  start: (id: string, mapping: Record<string, string>) =>
    request<{ data: ImportJobResponse }>(`/imports/${id}/start`, {
      method: 'POST',
      body: JSON.stringify({ mapping }),
    }),
};
