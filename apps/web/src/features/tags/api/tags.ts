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

export interface TagResponse {
  id: string;
  organizationId: string;
  name: string;
  normalizedName: string;
  createdAt: string;
}

export interface TagListResponse {
  data: TagResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateTagInput {
  name: string;
}

export const tagsApi = {
  list: (params?: { limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return request<TagListResponse>(`/tags${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: TagResponse }>(`/tags/${id}`),

  create: (input: CreateTagInput) =>
    request<{ data: TagResponse }>(`/tags`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<CreateTagInput>) =>
    request<{ data: TagResponse }>(`/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<void>(`/tags/${id}`, {
      method: 'DELETE',
    }),
};
