import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { useTask, useDeleteTask, useCompleteTask } from '../hooks/useTasks';
import { usePermissions } from '../../auth/hooks/usePermissions';
import { useState } from 'react';

export function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useTask(id || '');
  const deleteMutation = useDeleteTask();
  const completeMutation = useCompleteTask();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { hasPermission } = usePermissions();

  if (!id) {
    return <div className="text-danger">Task ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Task not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/tasks">
            <Button variant="secondary">Back to Tasks</Button>
          </Link>
        </div>
      </div>
    );
  }

  const task = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/tasks';
  };

  const handleComplete = async () => {
    await completeMutation.mutateAsync(id);
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/tasks">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{task.title}</h1>
            <p className="text-muted-foreground mt-1">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(task.status)}`}>
                {task.status.replace('_', ' ')}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)} ml-2`}>
                {task.priority}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {task.status !== 'completed' && (
            <Button variant="secondary" size="sm" onClick={handleComplete} disabled={completeMutation.isPending}>
              <CheckCircle2 size={16} className="mr-2" />
              Complete
            </Button>
          )}
          {hasPermission('tasks.update') && (
            <Link to={`/app/tasks/${id}/edit`}>
              <Button variant="secondary" size="sm">
                <Edit size={16} className="mr-2" />
                Edit
              </Button>
            </Link>
          )}
          {hasPermission('tasks.delete') && (
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-4">Task Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Title</span>
              <p className="text-sm text-foreground font-medium">{task.title}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Description</span>
              <p className="text-sm text-foreground font-medium">{task.description || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Due Date</span>
              <p className="text-sm text-foreground font-medium">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Assigned To</span>
              <p className="text-sm text-foreground font-medium">{task.assignedTo?.name || '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Contact</span>
              <p className="text-sm text-foreground font-medium">{task.contactId ? `#${task.contactId}` : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Company</span>
              <p className="text-sm text-foreground font-medium">{task.companyId ? `#${task.companyId}` : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Deal</span>
              <p className="text-sm text-foreground font-medium">{task.dealId ? `#${task.dealId}` : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Lead</span>
              <p className="text-sm text-foreground font-medium">{task.leadId ? `#${task.leadId}` : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Reminder</span>
              <p className="text-sm text-foreground font-medium">{task.reminderAt ? new Date(task.reminderAt).toLocaleString() : '—'}</p>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Completed At</span>
              <p className="text-sm text-foreground font-medium">{task.completedAt ? new Date(task.completedAt).toLocaleString() : '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Task?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove this task permanently.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Task'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
