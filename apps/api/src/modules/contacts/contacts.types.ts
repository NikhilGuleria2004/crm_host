export interface ContactResponse {
  id: string;
  firstName: string;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: {
    id: string;
    name: string;
  };
  jobTitle?: string | null;
  owner?: {
    id: string;
    name: string;
  };
  status: 'active' | 'inactive';
  source?: string | null;
  tags: string[];
  customFields: Record<string, unknown>;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
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

export interface ContactListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: string;
  ownerId?: string;
  companyId?: string;
  source?: string;
  tagId?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ContactListResponse {
  data: ContactResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ContactListQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  status?: 'active' | 'inactive';
  ownerId?: string;
  companyId?: string;
  source?: string;
  tagId?: string;
  sort?: 'createdAt' | 'updatedAt' | 'firstName' | 'lastName' | 'email';
  direction?: 'asc' | 'desc';
}
