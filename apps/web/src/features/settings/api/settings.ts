import { request } from '../../../lib/request';

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  status: 'invited' | 'active' | 'suspended' | 'deactivated';
  roleIds: string[];
  teamIds: string[];
  lastLoginAt?: string;
  preferences: {
    timezone?: string;
    locale?: string;
    dateFormat?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface RoleResponse {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  permissionIds: string[];
  isSystem: boolean;
  level: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserInput {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  roleIds?: string[];
  teamIds?: string[];
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  roleIds?: string[];
  teamIds?: string[];
}

export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  timezone: string;
  currency: string;
  locale: string;
  settings: {
    dateFormat: string;
    fiscalYearStartMonth: number;
    defaultPipelineId?: string;
    features?: {
      automation?: boolean;
      integrations?: boolean;
      apiAccess?: boolean;
    };
  };
  status: 'active' | 'suspended';
  createdAt: string;
  updatedAt: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  timezone?: string;
  currency?: string;
  locale?: string;
  status?: 'active' | 'suspended';
}

export interface InviteUserInput {
  email: string;
  firstName: string;
  lastName: string;
  roleIds: string[];
  teamIds?: string[];
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  permissionIds: string[];
}

export interface UpdateRoleInput {
  name?: string;
  description?: string;
  permissionIds?: string[];
}

export interface CloneRoleInput {
  name: string;
  permissionIds?: string[];
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export interface SessionResponse {
  id: string;
  userId: string;
  organizationId: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
}

export interface AuditLogResponse {
  id: string;
  organizationId: string;
  actorId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

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

export interface WebhookListResponse {
  data: WebhookResponse[];
  meta: {
    limit: number;
    hasMore: boolean;
    nextCursor: string | null;
  };
}

export interface WebhookResponse {
  id: string;
  organizationId: string;
  url: string;
  events: string[];
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface WebhookCreateResponse extends WebhookResponse {
  secret: string;
}

export interface CreateWebhookInput {
  url: string;
  events: string[];
  status?: 'active' | 'inactive';
}

export interface UpdateWebhookInput {
  url?: string;
  events?: string[];
  status?: 'active' | 'inactive';
}

export interface WebhookDeliveryResponse {
  id: string;
  webhookId: string;
  eventId: string;
  eventType: string;
  attempt: number;
  status: 'pending' | 'delivered' | 'failed';
  responseCode?: number;
  duration?: number;
  error?: string;
  createdAt: string;
}

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

export const settingsApi = {
  listUsers: () => request<{ data: UserResponse[] }>('/users'),
  createUser: (body: CreateUserInput) => request<{ data: UserResponse }>('/users', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  inviteUser: (body: InviteUserInput) => request<{ data: UserResponse }>('/users/invite', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateUser: (id: string, body: UpdateUserInput) => request<{ data: UserResponse }>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  getUser: (id: string) => request<{ data: UserResponse }>(`/users/${id}`),
  getOrganization: (id: string) => request<{ data: OrganizationResponse }>(`/organizations/${id}`),
  updateOrganization: (id: string, body: UpdateOrganizationInput) => request<{ data: OrganizationResponse }>(`/organizations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deactivateUser: (id: string) => request<{ data: { id: string; status: string } }>(`/users/${id}/deactivate`, {
    method: 'POST',
  }),
  listRoles: () => request<{ data: RoleResponse[] }>('/roles'),
  createRole: (body: CreateRoleInput) => request<{ data: RoleResponse }>('/roles', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateRole: (id: string, body: UpdateRoleInput) => request<{ data: RoleResponse }>(`/roles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deleteRole: (id: string) => request<{ data: { id: string; status: string } }>(`/roles/${id}`, {
    method: 'DELETE',
  }),
  cloneRole: (id: string, body: CloneRoleInput) => request<{ data: RoleResponse }>(`/roles/${id}/clone`, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  changePassword: (body: ChangePasswordInput) => request<{ data: { success: boolean } }>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  listSessions: () => request<{ data: SessionResponse[] }>('/sessions'),
  revokeSession: (id: string) => request<{ data: { id: string; status: string } }>(`/sessions/${id}/revoke`, {
    method: 'POST',
  }),
  revokeAllSessions: () => request<{ data: { success: boolean } }>('/sessions/revoke-all-others', {
    method: 'POST',
  }),
  listAuditLogs: (params?: { limit?: number; cursor?: string; actorId?: string; action?: string; entityType?: string; entityId?: string; ipAddress?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.actorId) searchParams.set('actorId', params.actorId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.ipAddress) searchParams.set('ipAddress', params.ipAddress);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<{ data: AuditLogResponse[]; meta: { limit: number; nextCursor?: string } }>(`/audit-logs${query ? `?${query}` : ''}`);
  },
  exportAuditLogs: (params?: { actorId?: string; action?: string; entityType?: string; entityId?: string; ipAddress?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.actorId) searchParams.set('actorId', params.actorId);
    if (params?.action) searchParams.set('action', params.action);
    if (params?.entityType) searchParams.set('entityType', params.entityType);
    if (params?.entityId) searchParams.set('entityId', params.entityId);
    if (params?.ipAddress) searchParams.set('ipAddress', params.ipAddress);
    if (params?.search) searchParams.set('search', params.search);
    const query = searchParams.toString();
    return request<string>(`/audit-logs/export/csv${query ? `?${query}` : ''}`, {
      headers: { Accept: 'text/csv' },
    }).then((csv) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return csv;
    });
  },
  listApiKeys: (params?: { limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return request<ApiKeyListResponse>(`/api-keys${query ? `?${query}` : ''}`);
  },
  createApiKey: (body: { name: string; scopes: string[] }) => request<{ data: ApiKeyCreateResponse }>('/api-keys', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  revokeApiKey: (id: string) => request<{ data: { id: string; status: string } }>(`/api-keys/${id}/revoke`, {
    method: 'POST',
  }),
  listWebhooks: (params?: { limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return request<WebhookListResponse>(`/webhooks${query ? `?${query}` : ''}`);
  },
  createWebhook: (body: CreateWebhookInput) => request<{ data: WebhookCreateResponse }>('/webhooks', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateWebhook: (id: string, body: UpdateWebhookInput) => request<{ data: WebhookResponse }>(`/webhooks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deleteWebhook: (id: string) => request<{ data: { id: string; status: string } }>(`/webhooks/${id}`, {
    method: 'DELETE',
  }),
  listWebhookDeliveries: (id: string, params?: { limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    const query = searchParams.toString();
    return request<{ data: WebhookDeliveryResponse[] }>(`/webhooks/${id}/deliveries${query ? `?${query}` : ''}`);
  },
  listIntegrations: (params?: { limit?: number; cursor?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.set('limit', String(params.limit));
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    const query = searchParams.toString();
    return request<IntegrationListResponse>(`/integrations${query ? `?${query}` : ''}`);
  },
  connectIntegration: (body: { provider: string; credentials: Record<string, unknown>; settings?: Record<string, unknown> }) => request<{ data: IntegrationResponse }>('/integrations/connect', {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  updateIntegration: (id: string, body: { credentials?: Record<string, unknown>; settings?: Record<string, unknown>; status?: 'connected' | 'disconnected' }) => request<{ data: IntegrationResponse }>(`/integrations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  deleteIntegration: (id: string) => request<{ data: { id: string; status: string } }>(`/integrations/${id}`, {
    method: 'DELETE',
  }),
  syncIntegration: (id: string) => request<{ data: { id: string; status: string } }>(`/integrations/${id}/sync`, {
    method: 'POST',
  }),
};
