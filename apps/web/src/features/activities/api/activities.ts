const API_BASE = '/api/v1';

async function request<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
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

export const activitiesApi = {
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
    return request<{ data: ActivityResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/activities${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: ActivityDetailResponse }>(`/activities/${id}`),

  create: (data: CreateActivityInput) =>
    request<{ data: ActivityResponse }>('/activities', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateActivityInput) =>
    request<{ data: ActivityResponse }>(`/activities/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/activities/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ data: { deleted: number; failed: number } }>('/activities/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export interface ActivityResponse {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject: string;
  description?: string;
  occurredAt: string;
  durationMinutes?: number;
  owner?: { id: string; name: string };
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityDetailResponse extends ActivityResponse {
  createdBy: string;
}

export interface CreateActivityInput {
  type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject: string;
  description?: string | null;
  occurredAt: string;
  durationMinutes?: number | null;
  ownerId?: string;
  contactId?: string | null;
  companyId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface UpdateActivityInput {
  type?: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject?: string;
  description?: string | null;
  occurredAt?: string;
  durationMinutes?: number | null;
  contactId?: string | null;
  companyId?: string | null;
  leadId?: string | null;
  dealId?: string | null;
  metadata?: Record<string, unknown>;
}
