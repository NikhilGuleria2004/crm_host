import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';

const stageFormSchema = z.object({
  name: z.string().min(1, 'Stage name is required').max(255),
  order: z.coerce.number().int().min(0),
  probability: z.coerce.number().int().min(0).max(100),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
});

export type StageFormData = z.infer<typeof stageFormSchema>;

interface StageFormProps {
  onSubmit: (data: StageFormData) => Promise<void>;
  initialData?: Partial<StageFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function StageForm({ onSubmit, initialData, submitLabel = 'Save Stage', isLoading }: StageFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<StageFormData>({
    resolver: zodResolver(stageFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      order: initialData?.order ?? 0,
      probability: initialData?.probability ?? 0,
      isWon: initialData?.isWon || false,
      isLost: initialData?.isLost || false,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        name: initialData.name || '',
        order: initialData.order ?? 0,
        probability: initialData.probability ?? 0,
        isWon: initialData.isWon || false,
        isLost: initialData.isLost || false,
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

  const handleFormSubmit = async (data: StageFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Input
        label="Stage name"
        error={errors.name?.message}
        {...register('name')}
      />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Order</label>
          <Input
            type="number"
            error={errors.order?.message}
            {...register('order')}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Probability (%)</label>
          <Input
            type="number"
            error={errors.probability?.message}
            {...register('probability')}
          />
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isWon"
            {...register('isWon')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="isWon" className="text-sm text-foreground">
            Won stage
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isLost"
            {...register('isLost')}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          <label htmlFor="isLost" className="text-sm text-foreground">
            Lost stage
          </label>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
