const API_BASE = '/api/v1';

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'An error occurred' } }));
    throw new Error(error.error?.message || 'An error occurred');
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

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
