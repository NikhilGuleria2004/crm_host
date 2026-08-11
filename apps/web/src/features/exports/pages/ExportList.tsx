import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useExportJobs } from '../hooks/useExports';
import type { ExportJobResponse } from '../api/exports';

export function ExportList() {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data, isLoading, error } = useExportJobs({ limit: 25, entity: entityFilter || undefined, status: statusFilter || undefined });

  const jobs = data?.data || [];

  const columns: Column<ExportJobResponse>[] = [
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => (
        <span className="capitalize font-medium text-foreground">{row.entity}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => {
        const colors: Record<string, string> = {
          pending: 'bg-warning/10 text-warning',
          processing: 'bg-primary/10 text-primary',
          completed: 'bg-success/10 text-success',
          failed: 'bg-danger/10 text-danger',
        };
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors[row.status] || 'bg-muted text-muted-foreground'}`}>
            {row.status}
          </span>
        );
      },
    },
    {
      key: 'totalRows',
      header: 'Total Rows',
      render: (row) => (row.totalRows !== undefined ? row.totalRows.toLocaleString() : '-'),
    },
    {
      key: 'createdAt',
      header: 'Created At',
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <Link to={`/app/exports/${row.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Exports</h1>
          <p className="text-muted-foreground mt-1">Manage your data exports.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load exports. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Exports</h1>
          <p className="text-muted-foreground mt-1">Manage your data exports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/export/new">
            <Button size="sm">
              <Download size={16} className="mr-2" />
              New Export
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Entities</option>
          <option value="contacts">Contacts</option>
          <option value="companies">Companies</option>
          <option value="leads">Leads</option>
          <option value="deals">Deals</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No exports found"
          description="Create an export to download data."
          action={
            <Link to="/app/export/new">
              <Button>New Export</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={jobs}
          rowKey={(row) => row.id}
        />
      )}
    </div>
  );
}

function Download({ size, className }: { size: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
