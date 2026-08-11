import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button } from '@crm/ui';
import { Input } from '@crm/ui';
import { Select } from '@crm/ui';

const companyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(255),
  website: z.string().url().optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  industry: z.string().max(100).optional().nullable(),
  employeeCount: z.coerce.number().int().positive().optional().nullable(),
  annualRevenue: z.coerce.number().positive().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']).optional(),
  description: z.string().optional().nullable(),
  address: z.object({
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
  }).optional().nullable(),
});

export type CompanyFormData = z.infer<typeof companyFormSchema>;

interface CompanyFormProps {
  onSubmit: (data: CompanyFormData) => Promise<void>;
  initialData?: Partial<CompanyFormData>;
  submitLabel?: string;
  isLoading?: boolean;
}

export function CompanyForm({ onSubmit, initialData, submitLabel = 'Save Company', isLoading }: CompanyFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      name: initialData?.name || '',
      website: initialData?.website || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      industry: initialData?.industry || '',
      employeeCount: initialData?.employeeCount || undefined,
      annualRevenue: initialData?.annualRevenue || undefined,
      ownerId: initialData?.ownerId || '',
      status: initialData?.status || 'active',
      description: initialData?.description || '',
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
        name: initialData.name || '',
        website: initialData.website || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        industry: initialData.industry || '',
        employeeCount: initialData.employeeCount || undefined,
        annualRevenue: initialData.annualRevenue || undefined,
        ownerId: initialData.ownerId || '',
        status: initialData.status || 'active',
        description: initialData.description || '',
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

  const handleFormSubmit = async (data: CompanyFormData) => {
    await onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">Company Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Company name"
            error={errors.name?.message}
            {...register('name')}
          />
          <Input
            label="Industry"
            error={errors.industry?.message}
            {...register('industry')}
          />
          <Input
            label="Website"
            error={errors.website?.message}
            {...register('website')}
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
            label="Employee count"
            type="number"
            error={errors.employeeCount?.message}
            {...register('employeeCount')}
          />
          <Input
            label="Annual revenue"
            type="number"
            error={errors.annualRevenue?.message}
            {...register('annualRevenue')}
          />
          <Input
            label="Owner"
            error={errors.ownerId?.message}
            {...register('ownerId')}
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
        <div className="grid grid-cols-1 gap-4">
          <Input
            label="Description"
            error={errors.description?.message}
            {...register('description')}
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
        <Link to="/app/companies">
          <Button type="button" variant="secondary">Cancel</Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || isLoading}>
          {isSubmitting || isLoading ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </form>
  );
}
