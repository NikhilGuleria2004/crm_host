import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useTags, useDeleteTag } from '../hooks/useTags';
import type { TagResponse } from '../api/tags';

export function TagList() {
  const { data, isLoading, error } = useTags({ limit: 25 });

  const tags = data?.data || [];
  const deleteMutation = useDeleteTag();

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this tag? It will be removed from all records.')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const columns: Column<TagResponse>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: 'normalizedName',
      header: 'Normalized Name',
      render: (row) => <span className="text-muted-foreground">{row.normalizedName}</span>,
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
        <div className="flex items-center gap-2">
          <Link to={`/app/settings/tags/${row.id}`}>
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
          <h1 className="text-2xl font-semibold text-foreground">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage tags for your records.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load tags. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage tags for your records.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/settings/tags/new">
            <Button size="sm">
              <Plus size={16} className="mr-2" />
              New Tag
            </Button>
          </Link>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          title="No tags found"
          description="Create a tag to get started."
          action={
            <Link to="/app/settings/tags/new">
              <Button>New Tag</Button>
            </Link>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tags}
          rowKey={(row) => row.id}
        />
      )}
    </div>
  );
}
