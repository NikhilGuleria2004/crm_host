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

export interface CustomFieldDefinitionResponse {
  id: string;
  organizationId: string;
  entity: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  options?: string[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomFieldListResponse {
  data: CustomFieldDefinitionResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CreateCustomFieldInput {
  entity: string;
  key: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  order?: number;
}

export const customFieldsApi = {
  list: (params?: { limit?: number; cursor?: string; entity?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.entity) searchParams.set('entity', params.entity);
    const query = searchParams.toString();
    return request<CustomFieldListResponse>(`/custom-fields${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    request<{ data: CustomFieldDefinitionResponse }>(`/custom-fields/${id}`),

  create: (input: CreateCustomFieldInput) =>
    request<{ data: CustomFieldDefinitionResponse }>(`/custom-fields`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  update: (id: string, input: Partial<CreateCustomFieldInput>) =>
    request<{ data: CustomFieldDefinitionResponse }>(`/custom-fields/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  delete: (id: string) =>
    request<void>(`/custom-fields/${id}`, {
      method: 'DELETE',
    }),
};
