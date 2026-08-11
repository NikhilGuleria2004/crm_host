import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Trash2, MoreVertical, CheckCircle2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { DataTable, type Column } from '@crm/ui';
import { EmptyState } from '@crm/ui';
import { useTasks, useDeleteTask, useCompleteTask } from '../hooks/useTasks';
import type { TaskResponse } from '../api/tasks';
import { usePermissions } from '../../auth/hooks/usePermissions';

export function TaskList() {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const limit = 25;

  const { data, isLoading, error } = useTasks({
    limit,
    cursor: page > 1 ? String((page - 1) * limit) : undefined,
    search: search || undefined,
    status: filterStatus || undefined,
    priority: filterPriority || undefined,
    sort: 'createdAt',
    direction: 'desc',
  });

  const deleteMutation = useDeleteTask();
  const completeMutation = useCompleteTask();
  const { hasPermission } = usePermissions();

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} tasks? This action cannot be undone.`)) {
      return;
    }
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await deleteMutation.mutateAsync(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      await completeMutation.mutateAsync(id);
    }
    setSelectedIds(new Set());
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-danger/10 text-danger';
      case 'high': return 'bg-warning/10 text-warning';
      case 'medium': return 'bg-primary/10 text-primary';
      case 'low': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-success/10 text-success';
      case 'in_progress': return 'bg-primary/10 text-primary';
      case 'cancelled': return 'bg-danger/10 text-danger';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const columns: Column<TaskResponse>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (row) => (
        <div>
          <div className="font-medium text-foreground">{row.title}</div>
          {row.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">{row.description}</div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(row.status)}`}>
          {row.status.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (row) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(row.priority)}`}>
          {row.priority}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      render: (row) => row.dueDate ? new Date(row.dueDate).toLocaleDateString() : '—',
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (row) => row.assignedTo?.name || '—',
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <button
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Task actions"
        >
          <MoreVertical size={16} />
        </button>
      ),
    },
  ];

  const tasks = data?.data || [];
  const totalPages = data?.meta?.hasMore ? page + 1 : page;

  if (error) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your tasks and to-dos.</p>
        </div>
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          Unable to load tasks. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage your tasks and to-dos.</p>
        </div>
        <div className="flex items-center gap-2">
          {hasPermission('tasks.create') && (
            <Link to="/app/tasks/new">
              <Button size="sm">
                <Plus size={16} className="mr-2" />
                New Task
              </Button>
            </Link>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 pl-9 pr-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={filterPriority}
          onChange={(e) => { setFilterPriority(e.target.value); setPage(1); }}
          className="h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/5 border border-primary/20 rounded">
          <span className="text-sm text-foreground">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleBulkComplete}>
              <CheckCircle2 size={16} className="mr-2" />
              Complete
            </Button>
           {hasPermission('tasks.delete') && (
              <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                <Trash2 size={16} className="mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Create your first task to get started."
          action={
            hasPermission('tasks.create') ? (
              <Link to="/app/tasks/new">
                <Button>Create Task</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={tasks}
          rowKey={(row) => row.id}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onRowClick={(row) => (window.location.href = `/app/tasks/${row.id}`)}
          pagination={{
            currentPage: page,
            totalPages,
            onPageChange: setPage,
          }}
        />
      )}
    </div>
  );
}
