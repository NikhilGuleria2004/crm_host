export interface IntegrationListResponse {
  data: IntegrationResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface IntegrationResponse {
  id: string;
  organizationId: string;
  provider: string;
  status: 'connected' | 'disconnected';
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface IntegrationConnectInput {
  provider: string;
  credentials: Record<string, unknown>;
  settings?: Record<string, unknown>;
}

export interface IntegrationUpdateInput {
  credentials?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  status?: 'connected' | 'disconnected';
}
