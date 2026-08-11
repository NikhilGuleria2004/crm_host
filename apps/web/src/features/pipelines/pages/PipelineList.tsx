import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { usePipelines, useDeletePipeline } from '../hooks/usePipelines';

export function PipelineList() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading, error } = usePipelines({
    limit,
    cursor: page > 1 ? String((page - 1) * limit) : undefined,
    sort: 'createdAt',
    direction: 'desc',
  });

  const deleteMutation = useDeletePipeline();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete pipeline "${name}"? This action cannot be undone.`)) {
      return;
    }
    await deleteMutation.mutateAsync(id);
  };

  const pipelines = data?.data || [];

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipelines</h1>
          <p className="text-muted-foreground mt-1">Manage your sales pipelines.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load pipelines. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Pipelines</h1>
          <p className="text-muted-foreground mt-1">Manage your sales pipelines.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/settings/pipelines/new">
            <Button size="sm">
              <Plus size={16} className="mr-2" />
              New Pipeline
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search pipelines..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : pipelines.length === 0 ? (
        <EmptyState
          title="No pipelines found"
          description="Create your first pipeline to start tracking deals."
          action={
            <Link to="/app/settings/pipelines/new">
              <Button>Create Pipeline</Button>
            </Link>
          }
        />
      ) : (
        <div className="bg-white border border-border rounded divide-y divide-border">
          {pipelines.map((pipeline) => (
            <div key={pipeline.id} className="px-6 py-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground">{pipeline.name}</p>
                  {pipeline.isDefault && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      Default
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {pipeline.description || 'No description'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pipeline.stages.length} stages
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Link to={`/app/settings/pipelines/${pipeline.id}`}>
                  <Button variant="secondary" size="sm">Edit</Button>
                </Link>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(pipeline.id, pipeline.name)}>
                  <Trash2 size={16} className="mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
