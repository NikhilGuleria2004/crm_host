import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';

const contactFormSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(150),
  lastName: z.string().max(150).optional().nullable(),
  email: z.string().email('Invalid email').optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  jobTitle: z.string().max(150).optional().nullable(),
  companyId: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  source: z.string().max(100).optional().nullable(),
  address: z.object({
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => Promise<void>;
  initialData?: Partial<ContactFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function ContactForm({ onSubmit, initialData, submitLabel = 'Save Contact', isLoading }: ContactFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      firstName: initialData?.firstName || '',
      lastName: initialData?.lastName || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      jobTitle: initialData?.jobTitle || '',
      companyId: initialData?.companyId || '',
      ownerId: initialData?.ownerId || '',
      status: initialData?.status || 'active',
      source: initialData?.source || '',
      address: initialData?.address || {
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        jobTitle: initialData.jobTitle || '',
        companyId: initialData.companyId || '',
        ownerId: initialData.ownerId || '',
        status: initialData.status || 'active',
        source: initialData.source || '',
        address: initialData.address || {
          line1: '',
          line2: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
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

  const handleFormSubmit = async (data: ContactFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Contact Information</h3>
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
            label="Job title"
            error={errors.jobTitle?.message}
            {...register('jobTitle')}
          />
          <Select
            label="Status"
            value={initialData?.status || 'active'}
            onValueChange={(value) => {
              const event = {
                target: { name: 'status', value },
              } as React.ChangeEvent<HTMLSelectElement>;
              register('status').onChange(event);
            }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Additional Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company"
            error={errors.companyId?.message}
            {...register('companyId')}
          />
          <Input
            label="Owner"
            error={errors.ownerId?.message}
            {...register('ownerId')}
          />
          <Input
            label="Source"
            error={errors.source?.message}
            {...register('source')}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Line 1"
            error={errors.address?.line1?.message}
            {...register('address.line1')}
          />
          <Input
            label="Line 2"
            error={errors.address?.line2?.message}
            {...register('address.line2')}
          />
          <Input
            label="City"
            error={errors.address?.city?.message}
            {...register('address.city')}
          />
          <Input
            label="State"
            error={errors.address?.state?.message}
            {...register('address.state')}
          />
          <Input
            label="Postal code"
            error={errors.address?.postalCode?.message}
            {...register('address.postalCode')}
          />
          <Input
            label="Country"
            error={errors.address?.country?.message}
            {...register('address.country')}
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        <Link to="/app/contacts">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
