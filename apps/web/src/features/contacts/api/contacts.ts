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

export const contactsApi = {
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
    return request<{ data: ContactResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/contacts${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: ContactDetailResponse }>(`/contacts/${id}`),

  create: (data: CreateContactInput) =>
    request<{ data: ContactResponse }>('/contacts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateContactInput) =>
    request<{ data: ContactResponse }>(`/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/contacts/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ data: { deleted: number; failed: number } }>('/contacts/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export interface ContactResponse {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: { id: string; name: string };
  jobTitle?: string;
  owner?: { id: string; name: string };
  status: 'active' | 'inactive';
  source?: string;
  tags: string[];
  customFields: Record<string, unknown>;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ContactDetailResponse extends ContactResponse {
  createdBy: string;
  updatedBy: string;
}

export interface CreateContactInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  jobTitle?: string | null;
  ownerId?: string | null;
  source?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}

export interface UpdateContactInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyId?: string | null;
  jobTitle?: string | null;
  ownerId?: string | null;
  status?: 'active' | 'inactive';
  source?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
}
