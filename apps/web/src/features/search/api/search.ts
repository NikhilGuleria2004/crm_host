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

export interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle?: string;
}

export interface SearchListResponse {
  data: SearchResult[];
}

export const searchApi = {
  search: (params: { q: string; types?: string[]; limit?: number }) => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.q);
    if (params.types) searchParams.set('types', params.types.join(','));
    if (params.limit) searchParams.set('limit', String(params.limit));
    return request<SearchListResponse>(`/search?${searchParams.toString()}`);
  },
};
