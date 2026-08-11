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

export const dealsApi = {
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
    return request<{ data: DealResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/deals${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: DealDetailResponse }>(`/deals/${id}`),

  create: (data: CreateDealInput) =>
    request<{ data: DealResponse }>('/deals', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateDealInput) =>
    request<{ data: DealResponse }>(`/deals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/deals/${id}`, {
      method: 'DELETE',
    }),

  changeStage: (id: string, stageId: string) =>
    request<{ data: DealResponse }>(`/deals/${id}/stage`, {
      method: 'POST',
      body: JSON.stringify({ stageId }),
    }),

  markWon: (id: string, wonAt?: string) =>
    request<{ data: DealResponse }>(`/deals/${id}/won`, {
      method: 'POST',
      body: JSON.stringify(wonAt ? { wonAt } : {}),
    }),

  markLost: (id: string, reason: string) =>
    request<{ data: DealResponse }>(`/deals/${id}/lost`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

export interface DealResponse {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  pipeline?: { id: string; name: string };
  stage?: { id: string; name: string; order: number; probability: number; isWon: boolean; isLost: boolean };
  company?: { id: string; name: string };
  contact?: { id: string; name: string };
  owner?: { id: string; name: string };
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  source?: string | null;
  status: 'open' | 'won' | 'lost';
  lostReason?: string | null;
  customFields: Record<string, unknown>;
  summary: { activities: number; tasks: number; notes: number; attachments: number };
  createdAt: string;
  updatedAt: string;
}

export interface DealDetailResponse extends DealResponse {
  createdBy: string;
  updatedBy: string;
}

export interface CreateDealInput {
  name: string;
  pipelineId: string;
  stageId: string;
  companyId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  source?: string | null;
  customFields?: Record<string, unknown>;
}

export interface UpdateDealInput {
  name?: string;
  pipelineId?: string;
  stageId?: string;
  companyId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  amount?: number;
  currency?: string;
  probability?: number;
  expectedCloseDate?: string | null;
  source?: string | null;
  customFields?: Record<string, unknown>;
}
