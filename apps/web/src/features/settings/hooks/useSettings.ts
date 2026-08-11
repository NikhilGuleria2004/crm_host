import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../api/settings';
import type { UpdateWebhookInput, IntegrationUpdateInput, UpdateOrganizationInput } from '../api/settings';

export function useUsers() {
  return useQuery({
    queryKey: ['settings', 'users'],
    queryFn: () => settingsApi.listUsers(),
  });
}

export function useRoles() {
  return useQuery({
    queryKey: ['settings', 'roles'],
    queryFn: () => settingsApi.listRoles(),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.inviteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { firstName?: string; lastName?: string; roleIds?: string[]; teamIds?: string[] } }) =>
      settingsApi.updateUser(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['settings', 'user', id],
    queryFn: () => settingsApi.getUser(id),
    enabled: !!id,
  });
}

export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['settings', 'organization', id],
    queryFn: () => settingsApi.getOrganization(id),
    enabled: !!id,
  });
}

export function useUpdateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateOrganizationInput }) =>
      settingsApi.updateOrganization(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'organization'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'users'] });
    },
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name?: string; description?: string; permissionIds?: string[] } }) =>
      settingsApi.updateRole(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteRole(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
    },
  });
}

export function useCloneRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { name: string; permissionIds?: string[] } }) =>
      settingsApi.cloneRole(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'roles'] });
    },
  });
}

export function useChangePassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.changePassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'sessions'] });
    },
  });
}

export function useSessions() {
  return useQuery({
    queryKey: ['settings', 'sessions'],
    queryFn: () => settingsApi.listSessions(),
  });
}

export function useRevokeSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.revokeSession(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'sessions'] });
    },
  });
}

export function useRevokeAllSessions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settingsApi.revokeAllSessions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'sessions'] });
    },
  });
}

export function useAuditLogs(params?: { limit?: number; cursor?: string; actorId?: string; action?: string; entityType?: string; entityId?: string; ipAddress?: string; search?: string }) {
  return useQuery({
    queryKey: ['settings', 'audit-logs', params],
    queryFn: () => settingsApi.listAuditLogs(params),
  });
}

export function useExportAuditLogs() {
  return useMutation({
    mutationFn: settingsApi.exportAuditLogs,
  });
}

export function useApiKeys(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['settings', 'api-keys', params],
    queryFn: () => settingsApi.listApiKeys(params),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createApiKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.revokeApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'api-keys'] });
    },
  });
}

export function useWebhooks(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['settings', 'webhooks', params],
    queryFn: () => settingsApi.listWebhooks(params),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.createWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
    },
  });
}

export function useUpdateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateWebhookInput }) => settingsApi.updateWebhook(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteWebhook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'webhooks'] });
    },
  });
}

export function useWebhookDeliveries(id: string, params?: { limit?: number }) {
  return useQuery({
    queryKey: ['settings', 'webhooks', id, 'deliveries', params],
    queryFn: () => settingsApi.listWebhookDeliveries(id, params),
    enabled: !!id,
  });
}

export function useIntegrations(params?: { limit?: number; cursor?: string }) {
  return useQuery({
    queryKey: ['settings', 'integrations', params],
    queryFn: () => settingsApi.listIntegrations(params),
  });
}

export function useConnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: settingsApi.connectIntegration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] });
    },
  });
}

export function useUpdateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: IntegrationUpdateInput }) => settingsApi.updateIntegration(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] });
    },
  });
}

export function useDeleteIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] });
    },
  });
}

export function useSyncIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.syncIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations'] });
    },
  });
}
