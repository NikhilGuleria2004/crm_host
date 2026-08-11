import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Textarea } from '@crm/ui';
import { useNotes, useCreateNote, useDeleteNote } from '../hooks/useNotes';

const noteFormSchema = z.object({
  title: z.string().max(255).optional().nullable(),
  body: z.string().min(1, 'Note body is required').max(10000),
});

export type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteFormProps {
  onSubmit: (data: NoteFormData) => Promise<void>;
  initialData?: Partial<NoteFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function NoteForm({ onSubmit, initialData, submitLabel = 'Save Note', isLoading }: NoteFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<NoteFormData>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      body: initialData?.body || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        body: initialData.body || '',
      });
    }
  }, [initialData, reset]);

  const handleFormSubmit = async (data: NoteFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Title"
        error={errors.title?.message}
        {...register('title')}
      />
      <Textarea
        label="Content"
        error={errors.body?.message}
        {...register('body')}
        rows={4}
      />
      <div className="flex items-center justify-end gap-3">
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

interface NoteSectionProps {
  contactId?: string;
  companyId?: string;
  leadId?: string;
  dealId?: string;
  showComposer?: boolean;
}

export function NoteSection({ contactId, companyId, leadId, dealId, showComposer = true }: NoteSectionProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading, error: listError } = useNotes({
    limit: 50,
    contactId,
    companyId,
    leadId,
    dealId,
    sort: 'createdAt',
    direction: 'desc',
  });

  const createMutation = useCreateNote();
  const deleteMutation = useDeleteNote();

  const handleCreate = async (formData: NoteFormData) => {
    try {
      setError(null);
      await createMutation.mutateAsync({
        ...formData,
        contactId,
        companyId,
        leadId,
        dealId,
      });
      setIsCreating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this note?')) return;
    await deleteMutation.mutateAsync(id);
  };

  const notes = data?.data || [];

  if (listError) {
    return (
      <div className="bg-danger/10 border border-danger/20 rounded p-4 text-sm text-danger">
        Unable to load notes. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Notes</h3>
        {showComposer && !isCreating && (
          <Button variant="secondary" size="sm" onClick={() => setIsCreating(true)}>
            Add Note
          </Button>
        )}
      </div>

      {isCreating && (
        <div className="bg-white border border-border rounded p-4 space-y-4">
          <NoteForm onSubmit={handleCreate} isLoading={createMutation.isPending} />
          {error && (
            <div className="bg-danger/10 border border-danger/20 rounded p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="secondary" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted/50 rounded animate-pulse" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No notes yet.
        </div>
      ) : (
        <div className="space-y-0">
          {notes.map((note) => (
            <div key={note.id} className="flex gap-4 py-3 border-b border-border last:border-b-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {note.title && (
                      <p className="text-sm font-medium text-foreground">
                        {note.title}
                      </p>
                    )}
                    <p className="text-sm text-foreground mt-1">
                      {note.body}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.author?.name} · {new Date(note.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-muted-foreground hover:text-danger p-1"
                      aria-label="Delete note"
                    >
                      ×
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
