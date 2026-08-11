import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useTask, useUpdateTask } from '../hooks/useTasks';
import { TaskForm } from '../components/TaskForm';
import type { TaskFormData } from '../components/TaskForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function TaskEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useTask(id || '');
  const updateMutation = useUpdateTask();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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

  const task = data?.data;

  const handleSubmit = async (formData: TaskFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Task updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/tasks/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update task');
      setToast({ message: 'Failed to update task', type: 'error' });
    }
  };

  if (!task && !isLoading) {
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

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center gap-4">
        <div>
          <Link to={`/app/tasks/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Task</h1>
          <p className="text-muted-foreground mt-1">
            Editing task
          </p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          {task && (
            <TaskForm
              onSubmit={handleSubmit}
              initialData={{
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                dueDate: task.dueDate || undefined,
                assignedTo: task.assignedTo?.id,
                contactId: task.contactId || undefined,
                companyId: task.companyId || undefined,
                dealId: task.dealId || undefined,
                leadId: task.leadId || undefined,
                reminderAt: task.reminderAt || undefined,
              }}
              submitLabel="Save Changes"
              isLoading={updateMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
