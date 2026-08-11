import { useState } from 'react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Modal } from '@crm/ui';
import { ConfirmDialog } from '@crm/ui';
import { Checkbox } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/useSettings';
import type { ApiKeyResponse, ApiKeyCreateResponse } from '../api/settings';
import { Plus, Trash2, Copy } from 'lucide-react';
import { PERMISSIONS } from '@crm/shared';

const PERMISSION_GROUPS = [
  { key: 'contacts', label: 'Contacts', perms: PERMISSIONS.contacts },
  { key: 'companies', label: 'Companies', perms: PERMISSIONS.companies },
  { key: 'leads', label: 'Leads', perms: PERMISSIONS.leads },
  { key: 'deals', label: 'Deals', perms: PERMISSIONS.deals },
  { key: 'tasks', label: 'Tasks', perms: PERMISSIONS.tasks },
  { key: 'activities', label: 'Activities', perms: PERMISSIONS.activities },
  { key: 'notes', label: 'Notes', perms: PERMISSIONS.notes },
  { key: 'reports', label: 'Reports', perms: PERMISSIONS.reports },
  { key: 'users', label: 'Users', perms: PERMISSIONS.users },
  { key: 'roles', label: 'Roles', perms: PERMISSIONS.roles },
  { key: 'pipelines', label: 'Pipelines', perms: PERMISSIONS.pipelines },
  { key: 'custom_fields', label: 'Custom Fields', perms: PERMISSIONS.custom_fields },
  { key: 'tags', label: 'Tags', perms: PERMISSIONS.tags },
  { key: 'audit_logs', label: 'Audit Logs', perms: PERMISSIONS.audit_logs },
];

function formatDate(date?: string) {
  if (!date) return 'Never';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function SettingsApiKeys() {
  const [createOpen, setCreateOpen] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<ApiKeyResponse | null>(null);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [cursor, setCursor] = useState<string | undefined>(undefined);

  const keysQuery = useApiKeys({ limit: 25, cursor });
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();

  const keys = keysQuery.data?.data || [];
  const hasMore = keysQuery.data?.meta?.hasMore || false;
  const page = cursor ? 2 : 1;
  const totalPages = hasMore ? page + 1 : page;

  const openCreate = () => {
    setName('');
    setSelectedScopes([]);
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const result = await createMutation.mutateAsync({ name, scopes: selectedScopes });
    setCreatedKey(result.data);
    setShowSecret(true);
    setCreateOpen(false);
  };

  const openRevoke = (key: ApiKeyResponse) => {
    setSelectedKey(key);
    setRevokeOpen(true);
  };

  const handleRevoke = async () => {
    if (!selectedKey) return;
    await revokeMutation.mutateAsync(selectedKey.id);
    setRevokeOpen(false);
    setSelectedKey(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > page) {
      setCursor(keysQuery.data?.meta?.nextCursor || undefined);
    } else {
      setCursor(undefined);
    }
  };

  const columns: Column<ApiKeyResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: 'scopes',
      header: 'Permissions',
      render: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.scopes.length} permission{row.scopes.length !== 1 ? 's' : ''}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'lastUsedAt',
      header: 'Last Used',
      render: (row) => <span className="text-xs text-muted-foreground">{formatDate(row.lastUsedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button variant="ghost" size="sm" onClick={() => openRevoke(row)} disabled={!!row.revokedAt}>
          <Trash2 size={14} />
        </Button>
      ),
    },
  ];

  if (keysQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (keysQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {keysQuery.error.message || 'Failed to load API keys.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">API Keys</h1>
          <p className="text-muted-foreground mt-1">Manage API keys for external integrations.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} className="mr-2" />
          Create API Key
        </Button>
      </div>

      {keys.length === 0 ? (
        <EmptyState
          title="No API keys"
          description="Create an API key to integrate with external systems."
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus size={16} className="mr-2" />
              Create API Key
            </Button>
          }
        />
      ) : (
        <div className="bg-card border border-border rounded">
          <DataTable columns={columns} data={keys} rowKey={(row) => row.id} pagination={{ currentPage: page, totalPages, onPageChange: handlePageChange }} />
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create API Key" footer={
        <>
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={createMutation.isPending || !name || selectedScopes.length === 0}>Create Key</Button>
        </>
      }>
        <form onSubmit={(e) => { e.preventDefault(); handleCreate(); }} className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Production Integration"
            required
          />
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Permissions</label>
            <div className="space-y-3 max-h-64 overflow-y-auto border border-border rounded p-3">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.key}>
                  <div className="text-xs font-medium text-muted-foreground mb-1">{group.label}</div>
                  <div className="space-y-1">
                    {group.perms.map((perm) => (
                      <label key={perm} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={selectedScopes.includes(`${group.key}.${perm}`)}
                          onChange={() => toggleScope(`${group.key}.${perm}`)}
                        />
                        <span className="capitalize">{perm}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>
      </Modal>

      <Modal open={showSecret} onClose={() => { setShowSecret(false); setCreatedKey(null); }} title="API Key Created" footer={
        <>
          <Button variant="secondary" onClick={() => { setShowSecret(false); setCreatedKey(null); }}>Close</Button>
          <Button onClick={() => createdKey && copyToClipboard(createdKey.key)}>
            <Copy size={16} className="mr-2" />
            Copy Key
          </Button>
        </>
      }>
        {createdKey && (
          <div className="space-y-4">
            <div className="bg-warning/10 border border-warning/20 rounded p-4">
              <p className="text-sm text-warning font-medium">Make sure to copy your API key now.</p>
              <p className="text-xs text-muted-foreground mt-1">You won't be able to see it again after closing this dialog.</p>
            </div>
            <div className="bg-muted/50 border border-border rounded p-3 font-mono text-sm break-all">
              {createdKey.key}
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={revokeOpen}
        onClose={() => { setRevokeOpen(false); setSelectedKey(null); }}
        onConfirm={handleRevoke}
        title="Revoke API key?"
        description={`This will immediately revoke the API key "${selectedKey?.name}". Any integrations using this key will stop working.`}
        confirmLabel="Revoke"
        destructive
        loading={revokeMutation.isPending}
      />
    </div>
  );
}