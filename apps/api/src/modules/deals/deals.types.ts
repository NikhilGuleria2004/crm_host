export interface DealResponse {
  id: string;
  name: string;
  pipelineId: string;
  stageId: string;
  pipeline?: {
    id: string;
    name: string;
  };
  stage?: {
    id: string;
    name: string;
    order: number;
    probability: number;
    isWon: boolean;
    isLost: boolean;
  };
  company?: {
    id: string;
    name: string;
  };
  contact?: {
    id: string;
    name: string;
  };
  owner?: {
    id: string;
    name: string;
  };
  amount: number;
  currency: string;
  probability: number;
  expectedCloseDate?: string | null;
  source?: string | null;
  status: 'open' | 'won' | 'lost';
  lostReason?: string | null;
  customFields: Record<string, unknown>;
  summary: {
    activities: number;
    tasks: number;
    notes: number;
    attachments: number;
  };
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

export interface DealListParams {
  limit?: number;
  cursor?: string;
  search?: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  contactId?: string;
  status?: string;
  minAmount?: number;
  maxAmount?: number;
  expectedCloseAfter?: string;
  expectedCloseBefore?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface DealListResponse {
  data: DealResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface DealListQuery {
  limit?: number;
  cursor?: string;
  search?: string;
  pipelineId?: string;
  stageId?: string;
  ownerId?: string;
  companyId?: string;
  contactId?: string;
  status?: 'open' | 'won' | 'lost';
  minAmount?: number;
  maxAmount?: number;
  expectedCloseAfter?: string;
  expectedCloseBefore?: string;
  sort?: 'createdAt' | 'updatedAt' | 'name' | 'amount' | 'probability' | 'expectedCloseDate';
  direction?: 'asc' | 'desc';
}

export interface ChangeStageInput {
  stageId: string;
}

export interface MarkWonInput {
  wonAt?: string;
}

export interface MarkLostInput {
  reason: string;
}

export interface DealStageInfo {
  id: string;
  name: string;
  order: number;
  probability: number;
  isWon: boolean;
  isLost: boolean;
}
