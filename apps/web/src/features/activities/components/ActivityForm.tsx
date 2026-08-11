import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';
import { Textarea } from '@crm/ui';

const activityFormSchema = z.object({
  type: z.enum(['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other']),
  subject: z.string().min(1, 'Subject is required').max(255),
  description: z.string().optional().nullable(),
  occurredAt: z.string().min(1, 'Date is required'),
  durationMinutes: z.coerce.number().int().positive().optional().nullable(),
});

export type ActivityFormData = z.infer<typeof activityFormSchema>;

interface ActivityFormProps {
  onSubmit: (data: ActivityFormData) => Promise<void>;
  initialData?: Partial<ActivityFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ActivityForm({ onSubmit, initialData, submitLabel = 'Save Activity', isLoading }: ActivityFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: initialData?.type || 'call',
      subject: initialData?.subject || '',
      description: initialData?.description || '',
      occurredAt: initialData?.occurredAt ? new Date(initialData.occurredAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      durationMinutes: initialData?.durationMinutes || undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        type: initialData.type || 'call',
        subject: initialData.subject || '',
        description: initialData.description || '',
        occurredAt: initialData.occurredAt ? new Date(initialData.occurredAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
        durationMinutes: initialData.durationMinutes || undefined,
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

  const handleFormSubmit = async (data: ActivityFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Select
          label="Type"
          {...register('type')}
          options={[
            { value: 'call', label: 'Call' },
            { value: 'email', label: 'Email' },
            { value: 'meeting', label: 'Meeting' },
            { value: 'demo', label: 'Demo' },
            { value: 'follow_up', label: 'Follow Up' },
            { value: 'note', label: 'Note' },
            { value: 'other', label: 'Other' },
          ]}
        />
        <Input
          label="Subject"
          error={errors.subject?.message}
          {...register('subject')}
        />
        <Input
          label="Date & Time"
          type="datetime-local"
          error={errors.occurredAt?.message}
          {...register('occurredAt')}
        />
        <Input
          label="Duration (minutes)"
          type="number"
          error={errors.durationMinutes?.message}
          {...register('durationMinutes')}
        />
      </div>
      <Textarea
        label="Description"
        error={errors.description?.message}
        {...register('description')}
      />
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/activities">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
