import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useActivity, useUpdateActivity, useDeleteActivity } from '../hooks/useActivities';
import { ActivityForm } from '../components/ActivityForm';
import type { ActivityFormData } from '../components/ActivityForm';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function ActivityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useActivity(id || '');
  const updateMutation = useUpdateActivity();
  const deleteMutation = useDeleteActivity();
  const [isEditing, setIsEditing] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  if (!id) {
    return <div className="text-danger">Activity ID is required</div>;
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
        <div className="text-danger">Activity not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/activities">
            <Button variant="secondary">Back to Activities</Button>
          </Link>
        </div>
      </div>
    );
  }

  const activity = data.data;

  const handleUpdate = async (formData: ActivityFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Activity updated successfully', type: 'success' });
      setIsEditing(false);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update activity');
      setToast({ message: 'Failed to update activity', type: 'error' });
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    navigate('/app/activities');
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
            <Link to="/app/activities">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{activity.subject}</h1>
            <p className="text-muted-foreground mt-1">
              {activity.type} · {new Date(activity.occurredAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Edit' : 'Edit'}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            Delete
          </Button>
        </div>
      </div>

      {serverError && (
        <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
          {serverError}
        </div>
      )}

      {isEditing ? (
        <div className="bg-white border border-border rounded p-6">
          <ActivityForm onSubmit={handleUpdate} initialData={activity} submitLabel="Save Changes" isLoading={updateMutation.isPending} />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white border border-border rounded">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Activity Details</h2>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Type</label>
                  <p className="text-sm text-foreground">{activity.type}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Subject</label>
                  <p className="text-sm text-foreground">{activity.subject}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Occurred At</label>
                  <p className="text-sm text-foreground">{new Date(activity.occurredAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Duration</label>
                  <p className="text-sm text-foreground">{activity.durationMinutes ? `${activity.durationMinutes} minutes` : '—'}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Owner</label>
                  <p className="text-sm text-foreground">{activity.owner?.name || '—'}</p>
                </div>
              </div>
            </div>
            {activity.description && (
              <div className="bg-white border border-border rounded">
                <div className="px-6 py-4 border-b border-border">
                  <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Description</h2>
                </div>
                <div className="p-6">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{activity.description}</p>
                </div>
              </div>
            )}
          </div>
          <div className="space-y-6">
            <div className="bg-white border border-border rounded">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">Details</h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Created</label>
                  <p className="text-sm text-foreground">{new Date(activity.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wide">Updated</label>
                  <p className="text-sm text-foreground">{new Date(activity.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Activity?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove "{activity.subject}" permanently.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Activity'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
