import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Plus, GripVertical } from 'lucide-react';
import { Button } from '@crm/ui';
import { usePipeline, useDeletePipeline, useCreatePipelineStage, useUpdatePipelineStage, useDeletePipelineStage } from '../hooks/usePipelines';
import { StageForm } from '../components/StageForm';
import type { StageFormData } from '../components/StageForm';
import { Toast } from '@crm/ui';

export function PipelineDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePipeline(id || '');
  const deletePipelineMutation = useDeletePipeline();
  const createStageMutation = useCreatePipelineStage();
  const updateStageMutation = useUpdatePipelineStage();
  const deleteStageMutation = useDeletePipelineStage();
  const [showStageForm, setShowStageForm] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [stageToDelete, setStageToDelete] = useState<string | null>(null);

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

  if (error || !data?.data) {
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

  const pipeline = data.data;

  const handleDeletePipeline = async () => {
    if (!confirm(`Delete pipeline "${pipeline.name}"? This action cannot be undone.`)) {
      return;
    }
    await deletePipelineMutation.mutateAsync(id);
    window.location.href = '/app/settings/pipelines';
  };

  const handleCreateStage = async (stageData: StageFormData) => {
    try {
      setServerError(null);
      await createStageMutation.mutateAsync({ pipelineId: id, data: stageData });
      setToast({ message: 'Stage created successfully', type: 'success' });
      setShowStageForm(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to create stage');
      setToast({ message: 'Failed to create stage', type: 'error' });
    }
  };

  const handleUpdateStage = async (stageId: string, stageData: StageFormData) => {
    try {
      setServerError(null);
      await updateStageMutation.mutateAsync({ pipelineId: id, stageId, data: stageData });
      setToast({ message: 'Stage updated successfully', type: 'success' });
      setEditingStageId(null);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update stage');
      setToast({ message: 'Failed to update stage', type: 'error' });
    }
  };

  const handleDeleteStage = async (stageId: string) => {
    try {
      await deleteStageMutation.mutateAsync({ pipelineId: id, stageId });
      setToast({ message: 'Stage deleted successfully', type: 'success' });
      setStageToDelete(null);
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to delete stage', type: 'error' });
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
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/settings/pipelines">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{pipeline.name}</h1>
            <p className="text-muted-foreground mt-1">
              {pipeline.description || 'No description'}
              {pipeline.isDefault && ' · Default pipeline'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/app/settings/pipelines/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={handleDeletePipeline}>
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Stages</h3>
            {!showStageForm && (
              <Button variant="secondary" size="sm" onClick={() => setShowStageForm(true)}>
                <Plus size={16} className="mr-2" />
                Add Stage
              </Button>
            )}
          </div>

          {serverError && (
            <div className="bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger mb-4">
              {serverError}
            </div>
          )}

          {showStageForm && (
            <div className="mb-6 p-4 border border-border rounded bg-muted/30">
              <h4 className="text-sm font-medium text-foreground mb-3">New Stage</h4>
              <StageForm onSubmit={handleCreateStage} isLoading={createStageMutation.isPending} />
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setShowStageForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {editingStageId && (
            <div className="mb-6 p-4 border border-border rounded bg-muted/30">
              <h4 className="text-sm font-medium text-foreground mb-3">Edit Stage</h4>
              <StageForm
                onSubmit={(data) => handleUpdateStage(editingStageId, data)}
                initialData={pipeline.stages.find(s => s.id === editingStageId)}
                isLoading={updateStageMutation.isPending}
              />
              <div className="mt-3">
                <Button variant="secondary" size="sm" onClick={() => setEditingStageId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {pipeline.stages.length === 0 && !showStageForm ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No stages yet. Add your first stage to get started.
            </div>
          ) : (
            <div className="space-y-0">
              {pipeline.stages.map((stage) => (
                <div key={stage.id} className="flex items-center gap-4 py-3 border-b border-border last:border-b-0">
                  <div className="flex-shrink-0 text-muted-foreground">
                    <GripVertical size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{stage.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Order: {stage.order} · Probability: {stage.probability}%
                      {stage.isWon && ' · Won'}
                      {stage.isLost && ' · Lost'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setEditingStageId(stage.id)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setStageToDelete(stage.id)}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {stageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setStageToDelete(null)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Stage?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove this stage from the pipeline.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setStageToDelete(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => handleDeleteStage(stageToDelete)} disabled={deleteStageMutation.isPending}>
                {deleteStageMutation.isPending ? 'Deleting...' : 'Delete Stage'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
