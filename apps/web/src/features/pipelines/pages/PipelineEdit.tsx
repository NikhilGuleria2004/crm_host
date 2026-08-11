import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { usePipeline, useUpdatePipeline } from '../hooks/usePipelines';
import { PipelineForm } from '../components/PipelineForm';
import type { PipelineFormData } from '../components/PipelineForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function PipelineEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = usePipeline(id || '');
  const updateMutation = useUpdatePipeline();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!id) {
    return <div className="text-danger">Pipeline ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  const pipeline = data?.data;

  const handleSubmit = async (formData: PipelineFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Pipeline updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/settings/pipelines/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update pipeline');
      setToast({ message: 'Failed to update pipeline', type: 'error' });
    }
  };

  if (!pipeline && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Pipeline not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/settings/pipelines">
            <Button variant="secondary">Back to Pipelines</Button>
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
          <Link to={`/app/settings/pipelines/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Pipeline</h1>
          <p className="text-muted-foreground mt-1">
            Editing pipeline
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
          {pipeline && (
            <PipelineForm
              onSubmit={handleSubmit}
              initialData={{
                name: pipeline.name,
                description: pipeline.description,
                isDefault: pipeline.isDefault,
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
