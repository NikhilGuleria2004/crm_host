import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';

const leadFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(150),
  lastName: z.string().max(150).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  companyName: z.string().max(255).optional().nullable(),
  source: z.string().max(100).optional().nullable(),
  status: z.enum(['new', 'contacted', 'qualified', 'unqualified', 'converted']).optional(),
  ownerId: z.string().optional().nullable(),
  score: z.coerce.number().int().min(0).max(100).optional().nullable(),
});

export type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadFormProps {
  onSubmit: (data: LeadFormData) => Promise<void>;
  initialData?: Partial<LeadFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function LeadForm({ onSubmit, initialData, submitLabel = 'Save Lead', isLoading }: LeadFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      companyName: initialData?.companyName || '',
      source: initialData?.source || '',
      status: initialData?.status || 'new',
      ownerId: initialData?.ownerId || '',
      score: initialData?.score ?? undefined,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        companyName: initialData.companyName || '',
        source: initialData.source || '',
        status: initialData.status || 'new',
        ownerId: initialData.ownerId || '',
        score: initialData.score ?? undefined,
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

  const handleFormSubmit = async (data: LeadFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Lead Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First name"
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            label="Last name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Company"
            error={errors.companyName?.message}
            {...register('companyName')}
          />
          <Input
            label="Source"
            error={errors.source?.message}
            {...register('source')}
          />
          <Select
            label="Status"
            value={initialData?.status || 'new'}
            onValueChange={(value) => {
              const event = {
                target: { name: 'status', value },
              } as React.ChangeEvent<HTMLSelectElement>;
              register('status').onChange(event);
            }}
            options={[
              { value: 'new', label: 'New' },
              { value: 'contacted', label: 'Contacted' },
              { value: 'qualified', label: 'Qualified' },
              { value: 'unqualified', label: 'Unqualified' },
              { value: 'converted', label: 'Converted' },
            ]}
          />
          <Input
            label="Lead Score"
            type="number"
            error={errors.score?.message}
            {...register('score')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/leads">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
