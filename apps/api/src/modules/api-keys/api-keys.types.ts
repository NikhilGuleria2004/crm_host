export interface ApiKeyListResponse {
  data: ApiKeyResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface ApiKeyResponse {
  id: string;
  organizationId: string;
  name: string;
  scopes: string[];
  lastUsedAt?: string;
  createdBy: string;
  createdAt: string;
  revokedAt?: string;
}

export interface ApiKeyCreateResponse extends ApiKeyResponse {
  key: string;
}

export interface CreateApiKeyInput {
  name: string;
  scopes: string[];
}

export interface RevokeApiKeyInput {
  id: string;
}
