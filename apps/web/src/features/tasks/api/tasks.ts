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

export const tasksApi = {
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
    return request<{ data: TaskResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/tasks${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: TaskDetailResponse }>(`/tasks/${id}`),

  create: (data: CreateTaskInput) =>
    request<{ data: TaskResponse }>('/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateTaskInput) =>
    request<{ data: TaskResponse }>(`/tasks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/tasks/${id}`, {
      method: 'DELETE',
    }),

  complete: (id: string) =>
    request<{ data: TaskResponse }>(`/tasks/${id}/complete`, {
      method: 'POST',
      body: JSON.stringify({ status: 'completed' }),
    }),
};

export interface TaskResponse {
  id: string;
  title: string;
  description?: string | null;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: { id: string; name: string };
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TaskDetailResponse extends TaskResponse {
  createdBy: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  status?: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string | null;
  assignedTo?: string | null;
  contactId?: string | null;
  companyId?: string | null;
  dealId?: string | null;
  leadId?: string | null;
  reminderAt?: string | null;
}
