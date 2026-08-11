import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TaskForm } from '../components/TaskForm';
import { useCreateTask } from '../hooks/useTasks';
import type { TaskFormData } from '../components/TaskForm';
import { Toast } from '@crm/ui';

export function TaskCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateTask();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: TaskFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Task created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/tasks');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create task');
      setToast({ message: 'Failed to create task', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">New Task</h1>
          <p className="text-muted-foreground mt-1">Create a new task.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <TaskForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
