import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Upload } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useImportJobs } from '../hooks/useImports';
import type { ImportJobResponse } from '../api/imports';

export function ImportList() {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const { data, isLoading, error } = useImportJobs({ limit: 25, entity: entityFilter || undefined });

  const jobs = data?.data || [];

  const columns: Column<ImportJobResponse>[] = [
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
      render: (row) => row.totalRows.toLocaleString(),
    },
    {
      key: 'createdCount',
      header: 'Created',
      render: (row) => <span className="text-success">{row.createdCount.toLocaleString()}</span>,
    },
    {
      key: 'updatedCount',
      header: 'Updated',
      render: (row) => <span className="text-primary">{row.updatedCount.toLocaleString()}</span>,
    },
    {
      key: 'failedCount',
      header: 'Failed',
      render: (row) => <span className="text-danger">{row.failedCount.toLocaleString()}</span>,
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
        <Link to={`/app/imports/${row.id}`}>
          <Button variant="ghost" size="sm">View</Button>
        </Link>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Imports</h1>
          <p className="text-muted-foreground mt-1">Manage your data imports.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load imports. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Imports</h1>
          <p className="text-muted-foreground mt-1">Manage your data imports.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/imports/new">
            <Button size="sm">
              <Upload size={16} className="mr-2" />
              New Import
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
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          title="No imports found"
          description="Upload a CSV file to get started."
          action={
            <Link to="/app/imports/new">
              <Button>New Import</Button>
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
