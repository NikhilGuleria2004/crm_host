import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Textarea } from '@crm/ui';
import { Select } from '@crm/ui';

const taskFormSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255),
  description: z.string().optional().nullable(),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional().default('open'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
  dueDate: z.string().optional().nullable(),
  assignedTo: z.string().optional().nullable(),
  contactId: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
  dealId: z.string().optional().nullable(),
  leadId: z.string().optional().nullable(),
  reminderAt: z.string().optional().nullable(),
});

export type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  initialData?: Partial<TaskFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function TaskForm({ onSubmit, initialData, submitLabel = 'Save Task', isLoading }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: initialData?.title || '',
      description: initialData?.description || '',
      status: initialData?.status || 'open',
      priority: initialData?.priority || 'medium',
      dueDate: initialData?.dueDate || '',
      assignedTo: initialData?.assignedTo || '',
      contactId: initialData?.contactId || '',
      companyId: initialData?.companyId || '',
      dealId: initialData?.dealId || '',
      leadId: initialData?.leadId || '',
      reminderAt: initialData?.reminderAt || '',
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        title: initialData.title || '',
        description: initialData.description || '',
        status: initialData.status || 'open',
        priority: initialData.priority || 'medium',
        dueDate: initialData.dueDate || '',
        assignedTo: initialData.assignedTo || '',
        contactId: initialData.contactId || '',
        companyId: initialData.companyId || '',
        dealId: initialData.dealId || '',
        leadId: initialData.leadId || '',
        reminderAt: initialData.reminderAt || '',
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

  const handleFormSubmit = async (data: TaskFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Task Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            error={errors.title?.message}
            {...register('title')}
          />
          <Textarea
            label="Description"
            error={errors.description?.message}
            {...register('description')}
            rows={3}
          />
          <Select
            label="Status"
            value={initialData?.status || 'open'}
            onValueChange={(value) => {
              const event = {
                target: { name: 'status', value },
              } as React.ChangeEvent<HTMLSelectElement>;
              register('status').onChange(event);
            }}
            options={[
              { value: 'open', label: 'Open' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
          <Select
            label="Priority"
            value={initialData?.priority || 'medium'}
            onValueChange={(value) => {
              const event = {
                target: { name: 'priority', value },
              } as React.ChangeEvent<HTMLSelectElement>;
              register('priority').onChange(event);
            }}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
          <Input
            label="Due Date"
            type="date"
            error={errors.dueDate?.message}
            {...register('dueDate')}
          />
          <Input
            label="Reminder At"
            type="datetime-local"
            error={errors.reminderAt?.message}
            {...register('reminderAt')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/tasks">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
