import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActivityForm } from '../components/ActivityForm';
import { useCreateActivity } from '../hooks/useActivities';
import type { ActivityFormData } from '../components/ActivityForm';
import { Toast } from '@crm/ui';

export function ActivityCreate() {
  const navigate = useNavigate();
  const createMutation = useCreateActivity();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: ActivityFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Activity created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/activities');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create activity');
      setToast({ message: 'Failed to create activity', type: 'error' });
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
          <h1 className="text-2xl font-semibold text-foreground">New Activity</h1>
          <p className="text-muted-foreground mt-1">Log a new activity.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <ActivityForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
