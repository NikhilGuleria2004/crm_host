import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@crm/ui';
import { useTag, useCreateTag, useUpdateTag } from '../hooks/useTags';
import { Toast } from '@crm/ui';
import { useState } from 'react';

const tagFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

export type TagFormData = z.infer<typeof tagFormSchema>;

interface TagFormProps {
  onSubmit: (data: TagFormData) => Promise<void>;
  initialData?: Partial<TagFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function TagForm({ onSubmit, initialData, submitLabel = 'Save', isLoading }: TagFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: initialData?.name || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Name</label>
          <input
            type="text"
            {...register('name')}
            placeholder="e.g. Enterprise"
            className="w-full h-10 px-3 text-sm border border-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" variant="secondary" disabled={isSubmitting || isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function TagFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const { data: tagData, isLoading } = useTag(id || '');
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleCreate = async (data: TagFormData) => {
    try {
      await createMutation.mutateAsync({ name: data.name });
      setToast({ message: 'Tag created successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to create tag', type: 'error' });
    }
  };

  const handleUpdate = async (data: TagFormData) => {
    if (!id) return;
    try {
      await updateMutation.mutateAsync({ id, name: data.name });
      setToast({ message: 'Tag updated successfully', type: 'success' });
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to update tag', type: 'error' });
    }
  };

  const handleSubmit = async (data: TagFormData) => {
    if (isEditing) {
      await handleUpdate(data);
    } else {
      await handleCreate(data);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted/50 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-muted/50 rounded animate-pulse" />
      </div>
    );
  }

  const tag = tagData?.data;

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
        <Link to="/app/settings/tags">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={16} className="mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{isEditing ? 'Edit Tag' : 'New Tag'}</h1>
          <p className="text-muted-foreground mt-1">
            {isEditing ? 'Update tag name.' : 'Create a new tag.'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-border rounded">
        <div className="p-6">
          <TagForm
            onSubmit={handleSubmit}
            initialData={tag ? { name: tag.name } : undefined}
            submitLabel={isEditing ? 'Update' : 'Create'}
            isLoading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      </div>
    </div>
  );
}
