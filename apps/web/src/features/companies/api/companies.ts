import { request } from '../../../lib/request';

export const companiesApi = {
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
    return request<{ data: CompanyResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/companies${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: CompanyDetailResponse }>(`/companies/${id}`),

  create: (data: CreateCompanyInput) =>
    request<{ data: CompanyResponse }>('/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateCompanyInput) =>
    request<{ data: CompanyResponse }>(`/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/companies/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ data: { deleted: number; failed: number } }>('/companies/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

export interface CompanyResponse {
  id: string;
  name: string;
  normalizedName: string;
  website?: string;
  email?: string;
  phone?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  owner?: { id: string; name: string };
  status: 'active' | 'inactive';
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
  description?: string;
  contactsCount?: number;
  openDealsCount?: number;
  openPipelineValue?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyDetailResponse extends CompanyResponse {
  createdBy: string;
  updatedBy: string;
}

export interface CreateCompanyInput {
  name: string;
  normalizedName?: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  ownerId?: string | null;
  status?: 'active' | 'inactive';
  description?: string | null;
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

export interface UpdateCompanyInput {
  name?: string;
  normalizedName?: string;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  annualRevenue?: number | null;
  ownerId?: string | null;
  status?: 'active' | 'inactive';
  description?: string | null;
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
