import { useState } from 'react';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useAuditLogs, useExportAuditLogs } from '../hooks/useSettings';
import type { AuditLogResponse } from '../api/settings';
import { Download, Search, Filter } from 'lucide-react';

const ACTION_OPTIONS = [
  { value: '', label: 'All actions' },
  { value: 'user.login', label: 'User login' },
  { value: 'user.logout', label: 'User logout' },
  { value: 'user.login.failed', label: 'Login failed' },
  { value: 'user.created', label: 'User created' },
  { value: 'user.invited', label: 'User invited' },
  { value: 'user.deactivated', label: 'User deactivated' },
  { value: 'user.updated', label: 'User updated' },
  { value: 'contact.created', label: 'Contact created' },
  { value: 'contact.updated', label: 'Contact updated' },
  { value: 'contact.deleted', label: 'Contact deleted' },
  { value: 'company.created', label: 'Company created' },
  { value: 'company.updated', label: 'Company updated' },
  { value: 'company.deleted', label: 'Company deleted' },
  { value: 'lead.created', label: 'Lead created' },
  { value: 'lead.updated', label: 'Lead updated' },
  { value: 'lead.converted', label: 'Lead converted' },
  { value: 'deal.created', label: 'Deal created' },
  { value: 'deal.updated', label: 'Deal updated' },
  { value: 'deal.won', label: 'Deal won' },
  { value: 'deal.lost', label: 'Deal lost' },
  { value: 'task.created', label: 'Task created' },
  { value: 'task.updated', label: 'Task updated' },
  { value: 'task.completed', label: 'Task completed' },
  { value: 'activity.created', label: 'Activity created' },
  { value: 'activity.updated', label: 'Activity updated' },
  { value: 'auth.password_changed', label: 'Password changed' },
  { value: 'role.created', label: 'Role created' },
  { value: 'role.updated', label: 'Role updated' },
  { value: 'role.deleted', label: 'Role deleted' },
  { value: 'role.cloned', label: 'Role cloned' },
  { value: 'pipeline.created', label: 'Pipeline created' },
  { value: 'pipeline.updated', label: 'Pipeline updated' },
  { value: 'pipeline.deleted', label: 'Pipeline deleted' },
];

const ENTITY_OPTIONS = [
  { value: '', label: 'All entities' },
  { value: 'user', label: 'User' },
  { value: 'contact', label: 'Contact' },
  { value: 'company', label: 'Company' },
  { value: 'lead', label: 'Lead' },
  { value: 'deal', label: 'Deal' },
  { value: 'task', label: 'Task' },
  { value: 'activity', label: 'Activity' },
  { value: 'note', label: 'Note' },
  { value: 'role', label: 'Role' },
  { value: 'pipeline', label: 'Pipeline' },
  { value: 'stage', label: 'Stage' },
  { value: 'team', label: 'Team' },
  { value: 'organization', label: 'Organization' },
  { value: 'session', label: 'Session' },
];

function formatDate(date: string) {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getActionLabel(action: string) {
  return action.replace(/\./g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SettingsAuditLog() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actorFilter, setActorFilter] = useState('');
  const [ipFilter, setIpFilter] = useState('');

  const logsQuery = useAuditLogs({
    limit: 50,
    search: search || undefined,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
    actorId: actorFilter || undefined,
    ipAddress: ipFilter || undefined,
  });
  const exportMutation = useExportAuditLogs();

  const logs = logsQuery.data?.data || [];

  const handleExport = () => {
    exportMutation.mutate({
      search: search || undefined,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
      actorId: actorFilter || undefined,
      ipAddress: ipFilter || undefined,
    });
  };

  const clearFilters = () => {
    setSearch('');
    setActionFilter('');
    setEntityFilter('');
    setActorFilter('');
    setIpFilter('');
  };

  const hasActiveFilters = search || actionFilter || entityFilter || actorFilter || ipFilter;

  const columns: Column<AuditLogResponse>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (row) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actor',
      header: 'User',
      render: (row) => (
        <span className="text-xs font-mono text-foreground">
          {row.actorId ? row.actorId.slice(-8) : 'System'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      render: (row) => (
        <span className="text-xs font-medium text-foreground">{getActionLabel(row.action)}</span>
      ),
    },
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => (
        <span className="text-xs capitalize text-foreground">{row.entityType || '—'}</span>
      ),
    },
    {
      key: 'ip',
      header: 'IP address',
      render: (row) => (
        <span className="text-xs text-muted-foreground font-mono">{row.ipAddress || '—'}</span>
      ),
    },
  ];

  if (logsQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded animate-pulse w-48" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  if (logsQuery.error) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        {logsQuery.error.message || 'Failed to load audit log.'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Audit Log</h1>
          <p className="text-muted-foreground mt-1">Track all sensitive operations and changes in your organization.</p>
        </div>
        <Button size="sm" onClick={handleExport} disabled={exportMutation.isPending || logs.length === 0}>
          <Download size={16} className="mr-2" />
          Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded">
        <div className="p-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto text-xs">
                Clear all
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select
              value={actionFilter}
              onValueChange={setActionFilter}
              options={ACTION_OPTIONS}
              placeholder="Action"
            />
            <Select
              value={entityFilter}
              onValueChange={setEntityFilter}
              options={ENTITY_OPTIONS}
              placeholder="Entity"
            />
            <Input
              placeholder="Actor ID"
              value={actorFilter}
              onChange={(e) => setActorFilter(e.target.value)}
            />
            <Input
              placeholder="IP address"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
            />
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="No audit logs"
              description="There are no audit logs matching your filters."
            />
          </div>
        ) : (
          <DataTable columns={columns} data={logs} rowKey={(row) => row.id} />
        )}
      </div>
    </div>
  );
}