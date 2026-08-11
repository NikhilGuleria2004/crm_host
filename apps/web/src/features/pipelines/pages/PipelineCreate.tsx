import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PipelineForm } from '../components/PipelineForm';
import { useCreatePipeline } from '../hooks/usePipelines';
import type { PipelineFormData } from '../components/PipelineForm';
import { Toast } from '@crm/ui';

export function PipelineCreate() {
  const navigate = useNavigate();
  const createMutation = useCreatePipeline();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (data: PipelineFormData) => {
    try {
      setServerError(null);
      await createMutation.mutateAsync(data);
      setToast({ message: 'Pipeline created successfully', type: 'success' });
      setTimeout(() => {
        navigate('/app/settings/pipelines');
      }, 500);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Failed to create pipeline');
      setToast({ message: 'Failed to create pipeline', type: 'error' });
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
          <h1 className="text-2xl font-semibold text-foreground">New Pipeline</h1>
          <p className="text-muted-foreground mt-1">Create a new sales pipeline.</p>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <PipelineForm onSubmit={handleSubmit} isLoading={createMutation.isPending} />
        </div>
      </div>
    </div>
  );
}
