export interface ActivityResponse {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'demo' | 'follow_up' | 'note' | 'other';
  subject: string;
  description?: string;
  occurredAt: string;
  durationMinutes?: number;
  owner?: {
    id: string;
    name: string;
  };
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

export interface ActivityListParams {
  limit?: number;
  cursor?: string;
  type?: string;
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  from?: string;
  to?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface ActivityListResponse {
  data: ActivityResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ActivityListQuery {
  limit?: number;
  cursor?: string;
  type?: string;
  ownerId?: string;
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  from?: string;
  to?: string;
  sort?: 'createdAt' | 'updatedAt' | 'occurredAt' | 'subject' | 'type';
  direction?: 'asc' | 'desc';
}
