import { request } from '../../../lib/request';

export const leadsApi = {
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
    return request<{ data: LeadResponse[]; meta: { limit: number; hasMore: boolean; nextCursor: string | null } }>(
      `/leads${query ? `?${query}` : ''}`
    );
  },

  get: (id: string) =>
    request<{ data: LeadDetailResponse }>(`/leads/${id}`),

  create: (data: CreateLeadInput) =>
    request<{ data: LeadResponse }>('/leads', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateLeadInput) =>
    request<{ data: LeadResponse }>(`/leads/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/leads/${id}`, {
      method: 'DELETE',
    }),

  bulkDelete: (ids: string[]) =>
    request<{ data: { deleted: number; failed: number } }>('/leads/bulk/delete', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),

  convert: (id: string, data: ConvertLeadInput) =>
    request<{ data: ConvertLeadResponse }>(`/leads/${id}/convert`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

export interface LeadResponse {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  owner?: { id: string; name: string };
  score?: number | null;
  tags: string[];
  customFields: Record<string, unknown>;
  convertedAt?: string | null;
  convertedContactId?: string | null;
  convertedCompanyId?: string | null;
  convertedDealId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDetailResponse extends LeadResponse {
  createdBy: string;
  updatedBy: string;
}

export interface CreateLeadInput {
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  ownerId?: string | null;
  score?: number | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface UpdateLeadInput {
  firstName?: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  ownerId?: string | null;
  score?: number | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
}

export interface ConvertLeadInput {
  createContact: boolean;
  createCompany: boolean;
  createDeal: boolean;
  company?: { name: string };
  deal?: {
    name: string;
    pipelineId: string;
    stageId: string;
    amount: number;
    currency: string;
  };
}

export interface ConvertLeadResponse {
  lead: LeadResponse;
  contact?: { id: string; firstName: string; lastName?: string; email?: string };
  company?: { id: string; name: string };
  deal?: { id: string; name: string };
}
