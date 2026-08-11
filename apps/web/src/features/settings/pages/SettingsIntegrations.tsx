import { useState } from 'react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Modal } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { Badge } from '@crm/ui';
import { useIntegrations, useConnectIntegration, useDeleteIntegration, useSyncIntegration } from '../hooks/useSettings';
import type { IntegrationResponse } from '../api/settings';
import { Plus, Trash2, RefreshCw } from 'lucide-react';

const PROVIDERS = {
  google: { name: 'Google', description: 'Google Calendar, Gmail, and Contacts', icon: 'G' },
  microsoft: { name: 'Microsoft 365', description: 'Outlook, Calendar, and Teams', icon: 'M' },
  slack: { name: 'Slack', description: 'Slack notifications and commands', icon: 'S' },
  teams: { name: 'Microsoft Teams', description: 'Teams notifications and tabs', icon: 'T' },
  accounting: { name: 'Accounting', description: 'QuickBooks, Xero, and more', icon: 'A' },
  marketing: { name: 'Marketing', description: 'Mailchimp, HubSpot, and more', icon: 'M' },
  telephony: { name: 'Telephony', description: 'Twilio, Plivo, and more', icon: 'P' },
} as const;

const PROVIDER_META: Record<string, { name: string; description: string; icon: string }> = {
  google: PROVIDERS.google,
  microsoft: PROVIDERS.microsoft,
  slack: PROVIDERS.slack,
  teams: PROVIDERS.teams,
  accounting: PROVIDERS.accounting,
  marketing: PROVIDERS.marketing,
  telephony: PROVIDERS.telephony,
};

function formatDate(date?: string) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getStatusBadge(status: 'connected' | 'disconnected') {
  const variant = status === 'connected' ? 'success' : 'default';
  return <Badge variant={variant}>{status}</Badge>;
}

export function SettingsIntegrations() {
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationResponse | null>(null);
  const [provider, setProvider] = useState<string>('');
  const [credentials, setCredentials] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const integrationsQuery = useIntegrations({ limit: 25, cursor });
  const connectMutation = useConnectIntegration();
  const deleteMutation = useDeleteIntegration();
  const syncMutation = useSyncIntegration();

  const integrations = integrationsQuery.data?.data || [];
  const hasMore = integrationsQuery.data?.meta?.hasMore || false;
  const page = cursor ? 2 : 1;
  const totalPages = hasMore ? page + 1 : page;

  const openCreate = () => {
    setProvider('');
    setCredentials({});
    setCreateOpen(true);
  };

  const handleConnect = async () => {
    await connectMutation.mutateAsync({ provider, credentials });
    setCreateOpen(false);
    setProvider('');
    setCredentials({});
  };

  const openDelete = (integration: IntegrationResponse) => {
    setSelectedIntegration(integration);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedIntegration) return;
    await deleteMutation.mutateAsync(selectedIntegration.id);
    setDeleteOpen(false);
    setSelectedIntegration(null);
  };

  const handleSync = async (id: string) => {
    await syncMutation.mutateAsync(id);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > page) {
      setCursor(integrationsQuery.data?.meta?.nextCursor || undefined);
    } else {
      setCursor(undefined);
    }
  };

  const availableProviders = Object.entries(PROVIDERS).filter(([key]) => {
    return !integrations.some((i) => i.provider === key);
  });

  const connectedProviders = integrations;

  const columns: Column<IntegrationResponse>[] = [
    {
      key: 'provider',
      header: 'Provider',
      render: (row) => {
        const meta = PROVIDER_META[row.provider] || { name: row.provider, icon: '?' };
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
              {meta.icon}
            </div>
            <div>
              <div className="font-medium text-foreground">{meta.name}</div>
              <div className="text-xs text-muted-foreground">{meta.description}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: 'lastSyncAt',
      header: 'Last Sync',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.lastSyncAt)}</span>,
    },
    {
      key: 'createdAt',
      header: 'Connected',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleSync(row.id)} disabled={syncMutation.isPending}>
            <RefreshCw size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openDelete(row)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (integrationsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (integrationsQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {integrationsQuery.error.message || 'Failed to load integrations.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">Connect external services to extend CRM functionality.</p>
        </div>
        {availableProviders.length > 0 && (
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} className="mr-2" />
            Connect
          </Button>
        )}
      </div>

      {connectedProviders.length === 0 ? (
        <EmptyState
          title="No integrations"
          description="Connect an external service to get started."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Connect
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded">
          <DataTable columns={columns} data={connectedProviders} rowKey={(row) => row.id} pagination={{ currentPage: page, totalPages, onPageChange: handlePageChange }} />
        </div>
      )}

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setProvider(''); setCredentials({}); }} title="Connect Integration" footer={
        <>
          <Button variant="secondary" onClick={() => { setCreateOpen(false); setProvider(''); setCredentials({}); }}>Cancel</Button>
          <Button onClick={handleConnect} disabled={connectMutation.isPending || !provider}>Connect</Button>
        </>
      }>
        <form onSubmit={(e) => { e.preventDefault(); handleConnect(); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Provider</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select a provider</option>
              {availableProviders.map(([key, meta]) => (
                <option key={key} value={key}>{meta.name}</option>
              ))}
            </select>
          </div>
          {provider && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                {PROVIDER_META[provider]?.description || 'Enter integration credentials below.'}
              </p>
              <Input
                label="API Key / Token"
                value={credentials.apiKey || ''}
                onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                placeholder="Enter API key or token"
                required
              />
              <Input
                label="Client ID (optional)"
                value={credentials.clientId || ''}
                onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                placeholder="Enter client ID"
              />
              <Input
                label="Client Secret (optional)"
                type="password"
                value={credentials.clientSecret || ''}
                onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                placeholder="Enter client secret"
              />
            </div>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => { setDeleteOpen(false); setSelectedIntegration(null); }}
        onConfirm={handleDelete}
        title="Disconnect integration?"
        description={`This will disconnect ${selectedIntegration?.provider} and stop syncing data.`}
        confirmLabel="Disconnect"
        destructive
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
