import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useCustomFields, useDeleteCustomField } from '../hooks/useCustomFields';
import type { CustomFieldDefinitionResponse } from '../api/customFields';

export function CustomFieldList() {
  const [entityFilter, setEntityFilter] = useState<string>('');
  const { data, isLoading, error } = useCustomFields({ limit: 25, entity: entityFilter || undefined });

  const fields = data?.data || [];
  const deleteMutation = useDeleteCustomField();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this custom field?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const columns: Column<CustomFieldDefinitionResponse>[] = [
    {
      key: 'entity',
      header: 'Entity',
      render: (row) => <span className="capitalize font-medium text-foreground">{row.entity}</span>,
    },
    {
      key: 'label',
      header: 'Label',
      render: (row) => (
        <div>
          <span className="font-medium text-foreground">{row.label}</span>
          <span className="text-xs text-muted-foreground ml-2">({row.key})</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => <span className="capitalize text-foreground">{row.type}</span>,
    },
    {
      key: 'required',
      header: 'Required',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.required ? 'bg-warning/10 text-warning' : 'bg-muted text-muted-foreground'}`}>
          {row.required ? 'Yes' : 'No'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Link to={`/app/settings/custom-fields/${row.id}`}>
            <Button variant="ghost" size="sm">Edit</Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
            <Trash2 size={14} />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">Manage custom fields for your entities.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load custom fields. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Custom Fields</h1>
          <p className="text-muted-foreground mt-1">Manage custom fields for your entities.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/settings/custom-fields/new">
            <Button size="sm">
              <Plus size={16} className="mr-2" />
              New Field
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
          <option value="contact">Contacts</option>
          <option value="company">Companies</option>
          <option value="lead">Leads</option>
          <option value="deal">Deals</option>
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : fields.length === 0 ? (
        <EmptyState
          title="No custom fields found"
          description="Create a custom field to get started."
          action={
            <Link to="/app/settings/custom-fields/new">
              <Button>New Field</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={fields}
          rowKey={(row) => row.id}
        />
      )}
    </div>
  );
}
