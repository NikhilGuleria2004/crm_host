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
  owner?: {
    id: string;
    name: string;
  };
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

export interface CompanyListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  industry?: string;
  ownerId?: string;
  status?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface CompanyListResponse {
  data: CompanyResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface CompanyListQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  industry?: string;
  ownerId?: string;
  status?: 'active' | 'inactive';
  sort?: 'createdAt' | 'updatedAt' | 'name' | 'industry' | 'annualRevenue';
  direction?: 'asc' | 'desc';
}
