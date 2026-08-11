import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Textarea } from '@crm/ui';

const pipelineFormSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(255),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional().default(false),
});

export type PipelineFormData = z.infer<typeof pipelineFormSchema>;

interface PipelineFormProps {
  onSubmit: (data: PipelineFormData) => Promise<void>;
  initialData?: Partial<PipelineFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function PipelineForm({ onSubmit, initialData, submitLabel = 'Save Pipeline', isLoading }: PipelineFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<PipelineFormData>({
    resolver: zodResolver(pipelineFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      description: initialData?.description || '',
      isDefault: initialData?.isDefault || false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        description: initialData.description || '',
        isDefault: initialData.isDefault || false,
      });
    }
  }, [initialData, reset]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const handleFormSubmit = async (data: PipelineFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Pipeline name"
          error={errors.name?.message}
          {...register('name')}
        />
        <Textarea
          label="Description"
          error={errors.description?.message}
          {...register('description')}
          rows={3}
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isDefault"
            {...register('isDefault')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="isDefault" className="text-sm text-foreground">
            Set as default pipeline
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/settings/pipelines">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
