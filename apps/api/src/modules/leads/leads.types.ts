export interface LeadResponse {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  companyName?: string | null;
  source?: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  owner?: {
    id: string;
    name: string;
  };
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

export interface LeadListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: string;
  ownerId?: string;
  source?: string;
  score?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface LeadListResponse {
  data: LeadResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface LeadListQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: 'new' | 'contacted' | 'qualified' | 'unqualified' | 'converted';
  ownerId?: string;
  source?: string;
  score?: number;
  sort?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email' | 'score';
  direction?: 'asc' | 'desc';
}

export interface ConvertLeadInput {
  createContact: boolean;
  createCompany: boolean;
  createDeal: boolean;
  company?: {
    name: string;
  };
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
  contact?: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
  };
  company?: {
    id: string;
    name: string;
  };
  deal?: {
    id: string;
    name: string;
  };
}
