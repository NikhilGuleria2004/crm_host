import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2 } from 'lucide-react';
import { Button } from '@crm/ui';
import { useNote, useDeleteNote } from '../hooks/useNotes';
import { useState } from 'react';

export function NoteDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useNote(id || '');
  const deleteMutation = useDeleteNote();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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

  if (error || !data?.data) {
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

  const note = data.data;

  const handleDelete = async () => {
    await deleteMutation.mutateAsync(id);
    window.location.href = '/app/notes';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <Link to="/app/notes">
              <Button variant="ghost" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Back
              </Button>
            </Link>
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{note.title || 'Note'}</h1>
            <p className="text-muted-foreground mt-1">
              {note.author?.name} · {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/app/notes/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <p className="text-sm text-foreground whitespace-pre-wrap">{note.body}</p>
        </div>
      </div>

      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeleteDialog(false)} />
          <div className="relative bg-white border border-border rounded shadow-lg w-full max-w-md mx-4">
            <div className="px-6 py-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Note?</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This will remove this note permanently.
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Note'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
