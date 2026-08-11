import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useNote, useUpdateNote } from '../hooks/useNotes';
import { NoteForm } from '../components/NoteSection';
import type { NoteFormData } from '../components/NoteSection';
import { Toast } from '@crm/ui';
import { useState } from 'react';

export function NoteEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useNote(id || '');
  const updateMutation = useUpdateNote();
  const [serverError, setServerError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  if (!id) {
    return <div className="text-danger">Note ID is required</div>;
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse mt-6" />
      </div>
    );
  }

  const note = data?.data;

  const handleSubmit = async (formData: NoteFormData) => {
    try {
      setServerError(null);
      await updateMutation.mutateAsync({ id, data: formData });
      setToast({ message: 'Note updated successfully', type: 'success' });
      setTimeout(() => {
        navigate(`/app/notes/${id}`);
      }, 500);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to update note');
      setToast({ message: 'Failed to update note', type: 'error' });
    }
  };

  if (!note && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="text-danger">Note not found or you don't have permission to view it.</div>
        <div>
          <Link to="/app/notes">
            <Button variant="secondary">Back to Notes</Button>
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
          <Link to={`/app/notes/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Edit Note</h1>
          <p className="text-muted-foreground mt-1">
            Editing note
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
          {note && (
            <NoteForm
              onSubmit={handleSubmit}
              initialData={{
                title: note.title,
                body: note.body,
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
